/*
  get next question to help narrow down drink choices
*/

const Bluebird = require('bluebird')
const _ = require('lodash')
const backendUtils = require('../../../utils/utils')
const drinkUtils = require('./utils')

const CHOICE_COUNT = 3      // number of choices returned by getQuestion
const DRINK_COUNT = 3       // number of drinks returned by getDrinks
const GROUPING_SIZE = 1     // size of window of best scoing drinks to chose randomly from 

const parseInputs = function(allIngredientsMap, allDrinksMap, chosenDrinkNames, unchosenDrinkNames, availableIngredientNames=[], unavailableIngredientNames=[]) {
  let chosenDrinks, unchosenDrinks, availableIngredients, unavailableIngredients, parseError
  try {
    chosenDrinks = _.map(chosenDrinkNames, name => {
      if (!allDrinksMap[name]) throw Error(`unrecognized drink name (chosenDrinkNames): ${name}`)
      return allDrinksMap[name]
    })
    unchosenDrinks = _.map(unchosenDrinkNames, name => {
      if (!allDrinksMap[name]) throw Error(`unrecognized drink name (unchosenDrinkNames): ${name}`)
      return allDrinksMap[name]
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

// helper method to pick single drink
const pickDrink = function({allDrinksMap, ineligibleDrinks, chosenDrinks, unchosenDrinks, unavailableIngredients, currentSetDrinks}) {
  const eligibleDrinks = _.filter(Object.values(allDrinksMap), drink => {
    const drinkEligible = !_.map(ineligibleDrinks, 'drink').includes(drink.drink)
    const ingredientsAvailable = !unavailableIngredients || _.every(drink.reciepe, ingredient => !_.map(unavailableIngredients, 'ingredient').includes(ingredient.ingredient))
    return drinkEligible && ingredientsAvailable
  })
  // console.log(`pickDrink: filtered ${Object.keys(allDrinksMap).length} drinks to ${eligibleDrinks.length} eligible drinks: ${JSON.stringify({ineligibleDrinks: (ineligibleDrinks || []).length, unavailableIngredients: (unavailableIngredients || []).length})}`)

  // highest score wins
  const scoredEligibleDrinks = _.map(_.shuffle(eligibleDrinks), eligible => {
    const score = (-1 * _.sumBy(chosenDrinks, chosen =>  drinkUtils.drinkDistance(eligible, chosen))) + // close to all chosenDrinks
      _.sumBy(unchosenDrinks, unchosen => drinkUtils.drinkDistance(eligible, unchosen)) +  // not close to all unchoseDrinks
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
    - chosenDrinks    : list of names of drinks chosen in previous question rounds
    - unchosenDrinks  : list of names of drinks not chosen in previous question rounds
*/
const getQuestion = async function (
  allDrinksMap,
  chosenDrinkNames,
  unchosenDrinkNames
) {
  console.log(`getQuestion: ${JSON.stringify({ chosenDrinkNames, unchosenDrinkNames })}`)

  const { chosenDrinks, unchosenDrinks, parseError } = parseInputs({}, allDrinksMap, chosenDrinkNames, unchosenDrinkNames)
  if (parseError) {
    return {
      status: 400,
      error: String(parseError)
    }
  }  

  let choices = []
  while(choices.length < CHOICE_COUNT) {
    choices.push(pickDrink({
      allDrinksMap, 
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
    - chosenDrinkNames            : list of names of drinks chosen in question rounds
    - unchosenDrinkNames          : list of names of drinks not chosen in question rounds
    - availableIngredientNames    : list of names of ingredients indicated by user as available
    - unavailableIngredientNames  : list of names of ingredients indicated by user as available
*/
const getDrinks = async function (
  allIngredientsMap,
  allDrinksMap,
  chosenDrinkNames,
  unchosenDrinkNames,
  availableIngredientNames,
  unavailableIngredientNames
) {
  console.log(`getDrinks: ${JSON.stringify({ chosenDrinkNames, unchosenDrinkNames, availableIngredientNames, unavailableIngredientNames })}\n`)

  const { 
    chosenDrinks, 
    unchosenDrinks, 
    availableIngredients,
    unavailableIngredients,
    parseError 
  } = parseInputs(allIngredientsMap, allDrinksMap, chosenDrinkNames, unchosenDrinkNames, availableIngredientNames, unavailableIngredientNames)
  if (parseError) {
    return {
      status: 400,
      error: String(parseError)
    }
  }   

  let drinks = []
  while(drinks.length < DRINK_COUNT) {
    drinks.push(pickDrink({
      allDrinksMap, 
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