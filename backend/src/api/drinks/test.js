/*
  drinks api tester script
*/

const process = require('process')
const _ = require('lodash')
const Bluebird = require('bluebird')

const backendUtils = require('../../../utils/utils')
const drinkUtils = require('./utils')
const getQuestion = require('./drink_questions')


/* backendUtils tester */

const testGetIngredients = async function() {
  const allIngredients = await backendUtils.allIngredients()
  console.log(`got ${allIngredients.length} ingredients: ${JSON.stringify({ sample: _.shuffle(allIngredients).slice(0,3) })}`)
}

const testGetDrinks = async function() {
  const allDrinks = await backendUtils.allDrinks()
  console.log(`got ${allDrinks.length} drinks: ${JSON.stringify({ sample: _.shuffle(allDrinks).slice(0,3) })}`)
}


/* drinkUtils testers */

const testIngredientMap = async function() {
  const allIngredients = await backendUtils.allIngredients()
  const baseIngredient = _.shuffle(allIngredients)[0]
  const ingredientMap = await drinkUtils.ingredientMap(baseIngredient, allIngredients)
  console.log(JSON.stringify({ baseIngredient, ingredientMap }))
}

const testIngredientDistance = async function() {
  const allIngredients = await backendUtils.allIngredients()
  const baseIngredient = _.shuffle(allIngredients)[0]
  const ingredientMap = drinkUtils.ingredientMap(baseIngredient, allIngredients)
  const distances = _.map(allIngredients, ingredient => { 
    return {
      ingredient, 
      distance: drinkUtils.ingredientDistance(ingredient, ingredientMap)
    }
  })
  console.log(JSON.stringify({
    baseIngredient,
    closest     : _.sortBy(distances, 'distance').slice(0,5),
    furthest    : _.reverse(_.sortBy(distances, 'distance')).slice(0,5)
  }))
}

const testCalcDrinkDistance = async function() {
  const otherDrinkSummary = (otherDrink) => {
    return {
      otherDrink  : drinkUtils.drinkSummary(otherDrink.otherDrink),
      distance    : otherDrink.distance
    }
  }

  const allIngredients = await backendUtils.allIngredients()
  const allDrinks = await backendUtils.allDrinks()
  const baseDrink = _.shuffle(allDrinks)[0]
  const distances = _.map(allDrinks, otherDrink => {
    return {
      otherDrink,
      distance: drinkUtils.calcDrinkDistance(baseDrink, otherDrink, allIngredients)
    }
  })
  console.log(JSON.stringify({
    baseDrink   : drinkUtils.drinkSummary(baseDrink),
    closest     : _.map(_.sortBy(distances, 'distance').slice(0,3), otherDrinkSummary),
    furthest    : _.map(_.reverse(_.sortBy(distances, 'distance')).slice(0,3), otherDrinkSummary)
  }))
}

const testGetDrinkDistances = async function() {
  const allDrinks = await backendUtils.allDrinks()
  await Bluebird.map(_.range(3), async i => {
    const shuffled = _.shuffle(allDrinks)
    const baseDrink = shuffled[0]
    const otherDrink = shuffled[1]
    const distance = drinkUtils.drinkDistance(baseDrink, otherDrink)
    console.log(`got drink distance ${i}: ${JSON.stringify({
      baseDrink: drinkUtils.drinkSummary(baseDrink),
      otherDrink: drinkUtils.drinkSummary(otherDrink),
      distance
    })}`)
  })
}


/* drink endpoint testers */

// test getting first question
const testGetQuestionSimple = async function() {
  const allDrinks = await backendUtils.allDrinks()
  const allDrinksMap = _.fromPairs(_.map(allDrinks, drink => [drink.drink, drink]))
  await getQuestion(
    allDrinksMap,
    [],
    []
  )
}

// test getting series of questions
const testGetQuestionComplex = async function() {
  const allDrinks = await backendUtils.allDrinks()
  let chosen = [], unchosen = []
  await Bluebird.map(_.range(3), async round => {
    const options = await getQuestion(allDrinks, _.map(chosen, 'drink'), _.map(unchosen, 'drink'))
    const shuffledOptions = _.shuffle(options)
    const picked = shuffledOptions[0]
    const unpicked = shuffledOptions.slice(1)
    console.log(`question ${round}: ${JSON.stringify({ picked: drinkUtils.drinkSummary(picked), unpicked: _.map(unpicked, drinkUtils.drinkSummary) })}`)
    chosen.push(picked)
    unchosen.push(...unpicked)
  })
}


/* end testers */

const runTest = async function(testFunc, inputs=[]) {
  console.log(`TESTING: ${testFunc.name}...`)
  const result =  await testFunc(...inputs)
  console.log(`..done.\n`)
}

const main = async function() {
  // await runTest(testGetIngredients)
  // await runTest(testGetDrinks)
  // await runTest(testAllDrinkDistances)
  // await runTest(testGetDrinkDistances)

  // await runTest(testIngredientMap)
  // await runTest(testIngredientDistance)
  // await runTest(testCalcDrinkDistance)

  // await runTest(testGetQuestionSimple)
  await runTest(testGetQuestionComplex)
}

main()
  .then(val => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(0)
  })