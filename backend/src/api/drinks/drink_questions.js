/*
  get next question to help narrow down drink choices
*/

const Bluebird = require('bluebird')
const _ = require('lodash')
const backendUtils = require('../../../utils/utils')
const drinkUtils = require('./utils')

const CHOICE_COUNT = 3
const GROUPING_SIZE = 1

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

  let chosenDrinks, unchoseDrinks
  try {
    chosenDrinks = _.map(chosenDrinkNames, name => {
      if (!allDrinksMap[name]) throw Error(`getQuestion: unrecognized drink name (chosenDrinkNames): ${name}`)
      return allDrinksMap[name]
    })
    unchosenDrinks = _.map(unchosenDrinkNames, name => {
      if (!allDrinksMap[name]) throw Error(`getQuestion: unrecognized drink name (unchosenDrinkNames): ${name}`)
      return allDrinksMap[name]
    })
  } catch (validationError) {
    return {
      status: 400,
      error: String(validationError)
    }
  }

  let choices = []
  while(choices.length < CHOICE_COUNT) {
    const eligibleDrinks = _.filter(Object.values(allDrinksMap), drink => !_.map(chosenDrinks, 'drink').includes(drink.drink) && !_.map(unchosenDrinks, 'drink').includes(drink.drink) && !_.map(choices, 'drink').includes(drink.drink))

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

    // console.log(`choice ${choices.length}: found ${choiceGroup.length} options: ${JSON.stringify({
    //   choices: _.map(choices, drinkUtils.drinkSummary),
    //   choiceGroup: _.map(choiceGroup, drink => {
    //     return { drink: drinkUtils.drinkSummary(drink), score: drink.score }
    //   })
    // })}\n`)
    choices.push(_.shuffle(choiceGroup)[0])
  }

  const ellapsed = (Date.now() - start)
  // console.log(`getQuestion: generated question (${ellapsed} ms): ${JSON.stringify(_.map(choices, drinkUtils.drinkSummary))}`)
  return {choices}
}

module.exports = getQuestion