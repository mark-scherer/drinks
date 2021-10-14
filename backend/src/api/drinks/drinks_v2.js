/*
  get next question to help narrow down drink choices
*/

const Bluebird = require('bluebird')
const _ = require('lodash')
const backendUtils = require('../../../utils/utils')
const drinkUtils = require('./utils')

const CHOICE_COUNT = 3
const GROUPING_SIZE = 1

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

const getEligibleDrinks = function(allDrinksMap, uneligibleDrinks) {
  return _.filter(Object.values(allDrinksMap), drink => !_.map(uneligibleDrinks, 'drink').includes(drink.drink))
}

/*
  inputs
    - allDrinksMap    : map of drink names, fully formatted drink object for all drinks (see backend_utils.allDrinks())
    - chosenDrinks    : list of names of drinks chosen in previous question rounds
    - unchosenDrinks  : list of names of drinks not chosen in previous question rounds
*/
const getQuestion = async function(
  allDrinksMap,
  chosenDrinkNames,
  unchosenDrinkNames
) {
  const start = Date.now()
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
    const eligibleDrinks = getEligibleDrinks(allDrinksMap, _.flatten([chosenDrinks, unchosenDrinks, choices]))

    // highest score wins
    const scoredEligibleDrinks = _.map(_.shuffle(eligibleDrinks), eligible => {
      const score = (-1 * _.sumBy(chosenDrinks, chosen =>  drinkUtils.drinkDistance(eligible, chosen))) + // close to all chosenDrinks
        _.sumBy(unchosenDrinks, unchosen => drinkUtils.drinkDistance(eligible, unchosen)) +  // not close to all unchoseDrinks
        _.sumBy(choices, choice => drinkUtils.drinkDistance(eligible, choice)) // not close to all choices
      return {
        ...eligible,
        score
      }
    })
    const choiceGroup = _.sortBy(scoredEligibleDrinks, drink => -1*drink.score).slice(0, GROUPING_SIZE)
    choices.push(_.shuffle(choiceGroup)[0])
  }

  const ellapsed = (Date.now() - start)
  return {choices}
}

/*
  inputs
    - allDrinksMap    : map of drink names, fully formatted drink object for all drinks (see backend_utils.allDrinks())
    - chosenDrinks    : list of names of drinks chosen in question rounds
    - unchosenDrinks  : list of names of drinks not chosen in question rounds
*/
const getDrinks = async function(
  allDrinksMap,
  chosenDrinkNames,
  unchosenDrinkNames
) {
  const { chosenDrinks, unchosenDrinks, parseError } = parseInputs(chosenDrinkNames, unchosenDrinkNames)
  if (parseError) {
    return {
      status: 400,
      error: String(parseError)
    }
  }   

  throw Error(`getDrinks not yet implemented`)
}

module.exports = {
  getQuestion,
  getDrinks
}