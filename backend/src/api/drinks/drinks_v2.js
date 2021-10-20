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

const parseInputs = function(allDrinksMap, chosenDrinkNames, unchosenDrinkNames) {
  let chosenDrinks, unchosenDrinks, parseError
  try {
    chosenDrinks = _.map(chosenDrinkNames, name => {
      if (!allDrinksMap[name]) throw Error(`getQuestion: unrecognized drink name (chosenDrinkNames): ${name}`)
      return allDrinksMap[name]
    })
    unchosenDrinks = _.map(unchosenDrinkNames, name => {
      if (!allDrinksMap[name]) throw Error(`getQuestion: unrecognized drink name (unchosenDrinkNames): ${name}`)
      return allDrinksMap[name]
    })
  } catch (error) {
    parseError = String(error)
  }
  
  return {
    chosenDrinks,
    unchosenDrinks,
    parseError
  }
}

// helper method to pick single drink
const pickDrink = function(allDrinksMap, ineligibleDrinks, chosenDrinks, unchosenDrinks, currentSetDrinks) {
  const eligibleDrinks = _.filter(Object.values(allDrinksMap), drink => !_.map(ineligibleDrinks, 'drink').includes(drink.drink))

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

  const { chosenDrinks, unchosenDrinks, parseError } = parseInputs(allDrinksMap, chosenDrinkNames, unchosenDrinkNames)
  if (parseError) {
    return {
      status: 400,
      error: String(parseError)
    }
  }  

  let choices = []
  while(choices.length < CHOICE_COUNT) {
    choices.push(pickDrink(
      allDrinksMap, 
      _.flatten([chosenDrinks, unchosenDrinks, choices]), 
      chosenDrinks, 
      unchosenDrinks,
      choices
    ))
  }

  return { choices }
}

/*
  inputs
    - allDrinksMap    : map of drink names, fully formatted drink object for all drinks (see backend_utils.allDrinks())
    - chosenDrinks    : list of names of drinks chosen in question rounds
    - unchosenDrinks  : list of names of drinks not chosen in question rounds
*/
const getDrinks = async function (
  allDrinksMap,
  chosenDrinkNames,
  unchosenDrinkNames
) {
  console.log(`getDrinks: ${JSON.stringify({ chosenDrinkNames, unchosenDrinkNames })}\n`)

  const { chosenDrinks, unchosenDrinks, parseError } = parseInputs(allDrinksMap, chosenDrinkNames, unchosenDrinkNames)
  if (parseError) {
    return {
      status: 400,
      error: String(parseError)
    }
  }   

  let drinks = []
  while(drinks.length < DRINK_COUNT) {
    drinks.push(pickDrink(
      allDrinksMap, 
      _.flatten([chosenDrinks, unchosenDrinks, drinks]), 
      chosenDrinks, 
      unchosenDrinks,
      drinks
    ))
  }

  return { drinks }
}

module.exports = {
  getQuestion,
  getDrinks
}