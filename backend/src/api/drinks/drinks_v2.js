/*
  get next question to help narrow down drink choices
*/

const Bluebird = require('bluebird')
const _ = require('lodash')
const backendUtils = require('../../../utils/utils')
const drinkUtils = require('./utils')

const CHOICE_COUNT = 3                // number of choices returned by getQuestion
const MIN_DISPLAY_RECIPE_LENGTH = 2   // min number of ingredients in the partial displayed recipe
const MAX_DISPLAY_RECIPE_LENGTH = 3   // max number of ingredients in the partial displayed recipe
const DRINK_COUNT = 3                 // number of drinks returned by getDrinks
const GROUPING_SIZE = 1               // size of window of best scoing drinks to chose randomly from 

const parseInputs = function(allIngredientsMap, allDrinksMap, chosenDrinks, unchosenDrinks, availableIngredientNames=[], unavailableIngredientNames=[]) {
  let availableIngredients, unavailableIngredients, parseError
  try {
    _.forEach(chosenDrinks, drink => {
      if (!allDrinksMap[drink.drink]) throw Error(`unrecognized drink name (chosenDrinks): ${drink.drink}`)
    })
    _.forEach(unchosenDrinks, drink => {
      if (!allDrinksMap[drink.drink]) throw Error(`unrecognized drink name (unchosenDrinks): ${drink.drink}`)
    })

    availableIngredients = _.map(availableIngredientNames, name => {
      if (!allIngredientsMap[name]) throw Error(`unrecognized ingredient name (availableIngredients): ${name}`)
      return allIngredientsMap[name]
    })
    unavailableIngredients = _.map(unavailableIngredientNames, name => {
      if (!allIngredientsMap[name]) throw Error(`unrecognized ingredient name (unavailableIngredients): ${name}`)
      return allIngredientsMap[name]
    })
  } catch (error) {
    parseError = String(error)
  }
  
  return {
    chosenDrinks,
    unchosenDrinks,
    availableIngredients,
    unavailableIngredients,
    parseError
  }
}

// helper method to generate new displayRecipes once per request
const generateDisplayRecipe = function(allDrinksMap) {
  const _allDrinksMap = _.cloneDeep(allDrinksMap)
  _.forEach(_allDrinksMap, (drinkInfo) => {
    drinkInfo.displayRecipe = _.sortBy(drinkInfo.recipe, ingredient => {
      if (['base_spirit'].includes(ingredient.ingredient_info.category)) return 0
      else return _.random(0.01, 1)
    }).slice(0, _.random(MIN_DISPLAY_RECIPE_LENGTH, MAX_DISPLAY_RECIPE_LENGTH))
  })
  return _allDrinksMap
}

// helper method to pick single drink
  // NOTE: should not filter to just recipes with available ingredients when called from getQuestion()
    // will implement once we add scoring config as a param
const pickDrink = function({allDrinksMap, ineligibleDrinks, chosenDrinks, unchosenDrinks, unavailableIngredients, currentSetDrinks}) {
  const eligibleDrinks = _.filter(Object.values(allDrinksMap), drink => {
    const drinkEligible = !_.map(ineligibleDrinks, 'drink').includes(drink.drink)
    const ingredientsAvailable = !unavailableIngredients || _.every(drink.recipe, ingredient => !_.map(unavailableIngredients, 'ingredient').includes(ingredient.ingredient))
    return drinkEligible && ingredientsAvailable
  })
  // console.log(`pickDrink: filtered ${Object.keys(allDrinksMap).length} drinks to ${eligibleDrinks.length} eligible drinks: ${JSON.stringify({ineligibleDrinks: (ineligibleDrinks || []).length, unavailableIngredients: (unavailableIngredients || []).length})}`)

  // helper method to properly compare drink option with partial recipe user was shown
  const displayRecipeDrinkDistance = (eligibleDrink, displayedDrink) => {
    const _displayedDrink = _.cloneDeep(displayedDrink)
    _displayedDrink.recipe = _displayedDrink.displayRecipe
    return drinkUtils.drinkDistance(eligibleDrink, _displayedDrink)
  }

  // highest score wins
  const scoredEligibleDrinks = _.map(_.shuffle(eligibleDrinks), eligible => {
    const score = (-1 * _.sumBy(chosenDrinks, chosen =>  displayRecipeDrinkDistance(eligible, chosen))) + // close to all chosenDrinks
      _.sumBy(unchosenDrinks, unchosen => displayRecipeDrinkDistance(eligible, unchosen)) +  // not close to all unchoseDrinks
      _.sumBy(currentSetDrinks, drink => drinkUtils.drinkDistance(eligible, drink)) // not close to all currentSetDrinks
    return {
      ...eligible,
      score
    }
  })
  const choiceGroup = _.sortBy(scoredEligibleDrinks, drink => -1*drink.score).slice(0, GROUPING_SIZE)
  return _.shuffle(choiceGroup)[0]
}

/*
  inputs
    - allDrinksMap    : map of drink names, fully formatted drink object for all drinks (see backend_utils.allDrinks())
    - chosenDrinks    : list of drink objects of drinks chosen in previous question rounds
    - unchosenDrinks  : list of drink objects of drinks not chosen in previous question rounds
*/
const getQuestion = async function (
  allDrinksMap,
  chosenDrinks,
  unchosenDrinks
) {
  console.log(`getQuestion: ${JSON.stringify({
    chosenDrinkNames: _.map(chosenDrinks, 'drink'), 
    unchosenDrinkNames: _.map(unchosenDrinks, 'drink') 
  })}`)

  const { parseError } = parseInputs({}, allDrinksMap, chosenDrinks, unchosenDrinks)
  if (parseError) {
    return {
      status: 400,
      error: String(parseError)
    }
  }  

  const _allDrinksMap = generateDisplayRecipe(allDrinksMap)
  let choices = []
  while(choices.length < CHOICE_COUNT) {
    choices.push(pickDrink({
      allDrinksMap: _allDrinksMap, 
      ineligibleDrinks: _.flatten([chosenDrinks, unchosenDrinks, choices]), 
      chosenDrinks, 
      unchosenDrinks,
      currentSetDrinks: choices
    }))
  }

  return { choices }
}

/*
  inputs
    - allIngredientsMap           : map of drink ingredients names, fully formatted ingredient object for all ingredients (see backend_utils.allIngredients())
    - allDrinksMap                : map of drink names, fully formatted drink object for all drinks (see backend_utils.allDrinks())
    - chosenDrinks                : list of drink objects of drinks chosen in question rounds
    - unchosenDrinks              : list of drink objects of drinks not chosen in question rounds
    - availableIngredientNames    : list of names of ingredients indicated by user as available
    - unavailableIngredientNames  : list of names of ingredients indicated by user as available
*/
const getDrinks = async function (
  allIngredientsMap,
  allDrinksMap,
  chosenDrinks,
  unchosenDrinks,
  availableIngredientNames,
  unavailableIngredientNames
) {
  console.log(`getDrinks: ${JSON.stringify({ 
    chosenDrinkNames: _.map(chosenDrinks, 'drink'), 
    unchosenDrinkNames: _.map(unchosenDrinks, 'drink'),
    availableIngredientNames, 
    unavailableIngredientNames 
  })}\n`)

  const { 
    availableIngredients,
    unavailableIngredients,
    parseError 
  } = parseInputs(allIngredientsMap, allDrinksMap, chosenDrinks, unchosenDrinks, availableIngredientNames, unavailableIngredientNames)
  if (parseError) {
    return {
      status: 400,
      error: String(parseError)
    }
  }   

  const _allDrinksMap = generateDisplayRecipe(allDrinksMap)
  let drinks = []
  while(drinks.length < DRINK_COUNT) {
    drinks.push(pickDrink({
      allDrinksMap: _allDrinksMap, 
      ineligibleDrinks: _.flatten([chosenDrinks, unchosenDrinks, drinks]), 
      chosenDrinks, 
      unchosenDrinks,
      unavailableIngredients,
      currentSetDrinks: drinks
    }))
  }

  return { drinks }
}

module.exports = {
  getQuestion,
  getDrinks
}