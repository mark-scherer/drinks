/*
  drinks api router
*/

const _ = require('lodash')
const Router = require('@koa/router')
const drinksRouter = new Router({ prefix: '/drinks' })

const backendUtils = require('../../../utils/utils')
const drinkUtils = require('./utils')

const { getQuestion, getDrinks } = require('./drinks_v2')

// get all ingredients, drinks at startup
let allIngredientsMap = {}, allDrinksMap = {}, routerStart = Date.now()
backendUtils.allIngredients()
  .then(allIngredients => {
    allIngredientsMap = _.fromPairs(_.map(allIngredients, ingredient => [ingredient.ingredient, ingredient]))
    console.log(`drinks router: retrieved ${Object.keys(allIngredientsMap).length} ingredients in ${_.round(Date.now() - routerStart)}ms`)
  })
  .catch(err => {
    throw Error(`drinks router: error retrieving allIngredients: ${err}`)
  })
backendUtils.allDrinks()
  .then(allDrinks => {
    allDrinksMap = _.fromPairs(_.map(allDrinks, drink => [drink.drink, drink]))
    console.log(`drinks router: retrieved ${Object.keys(allDrinksMap).length} drinks in ${_.round(Date.now() - routerStart)}ms`)
  })
  .catch(err => {
    throw Error(`drinks router: error retrieving allDrinks: ${err}`)
  })

const parseInputs = function(ctx) {
  // console.log(`parseInputs: ${JSON.stringify({ query: ctx.request.query, chosenDrinkNames: ctx.request.query.chosenDrinkNames, unavailableIngredientNames: ctx.request.query.unavailableIngredientNames })}`)

  return {
    chosenDrinkNames: backendUtils.parseQueryArray(ctx, 'chosenDrinkNames') || [],
    unchosenDrinkNames: backendUtils.parseQueryArray(ctx, 'unchosenDrinkNames') || [],
    availableIngredientNames: backendUtils.parseQueryArray(ctx, 'availableIngredientNames'),
    unavailableIngredientNames: backendUtils.parseQueryArray(ctx, 'unavailableIngredientNames')
  }
}

const formatResponse = function(ctx, result) {
  if (result.error) {
    ctx.response.status = result.status
    ctx.response.body = result
  }
  else ctx.body = result
  
  return ctx
}

// GET /drinks/question
drinksRouter.get('/question', async (ctx, next) => {
  const requestStart = Date.now()

  const { chosenDrinkNames, unchosenDrinkNames } = parseInputs(ctx)
  let result = {}
  try {
    result = await getQuestion(allDrinksMap, chosenDrinkNames, unchosenDrinkNames)
  } catch (error) {
    result.status = 500
    result.error = String(error)
  }
  
  ctx = formatResponse(ctx, result)

  if (result.error) console.log(`GET /question: errored getting question in ${_.round(Date.now() - requestStart)}ms: ${result.error}\n`)
  else console.log(`GET /question: got question in ${_.round(Date.now() - requestStart)}ms\n`)
})

// GET /drinks/drinks
drinksRouter.get('/drinks', async (ctx, next) => {
  const requestStart = Date.now()

  const { 
    chosenDrinkNames, 
    unchosenDrinkNames,
    availableIngredientNames,
    unavailableIngredientNames
  } = parseInputs(ctx)

  let result = {}
  try {
    result = await getDrinks(allIngredientsMap, allDrinksMap, chosenDrinkNames, unchosenDrinkNames, availableIngredientNames, unavailableIngredientNames)
  } catch (error) {
    result.status = 500
    result.error = String(error)
  }
  ctx = formatResponse(ctx, result)
  
  if (result.error) console.log(`GET /drinks: errored getting drinks in ${_.round(Date.now() - requestStart)}ms: ${result.error}\n`)
  else console.log(`GET /drinks: got ${result.drinks.length} drinks in ${_.round(Date.now() - requestStart)}ms\n`)
})

module.exports = drinksRouter