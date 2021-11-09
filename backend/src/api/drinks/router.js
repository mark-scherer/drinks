/*
  drinks api router
*/

const _ = require('lodash')
const Router = require('@koa/router')
const bodyParser = require('koa-bodyparser')
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
  return {
    chosenDrinks: ctx.request.body.chosenDrinks || [],
    unchosenDrinks: ctx.request.body.unchosenDrinks || [],
    availableIngredientNames: ctx.request.body.availableIngredientNames,
    unavailableIngredientNames: ctx.request.body.unavailableIngredientNames
  }
}

drinksRouter.use(bodyParser({ enableTypes: ['json', 'text'] }))
drinksRouter.use(async (ctx, next) => {
  const start = Date.now()
  ctx.request.body = JSON.parse(ctx.request.body)
  console.log(`${ctx.method}: ${ctx.path}: got request: ${JSON.stringify({ requestBody: {
    ...ctx.request.body,
    chosenDrinks: _.map(ctx.request.body.chosenDrinks, 'drink'),
    unchosenDrinks: _.map(ctx.request.body.unchosenDrinks, 'drink')
  } })}`)

  try {
    await next()
  } catch (error) {
    ctx.response.status = 500
    ctx.body = `server error: ${error}`
    console.error(`${ctx.method}: ${ctx.path}: error handling request: ${error}`)
  }

  console.log(`${ctx.method}: ${ctx.path}: finished handling request in ${Date.now() - start}ms\n`)
})

// POST /drinks/question
  // post so can send body
drinksRouter.post('/question', async (ctx, next) => {
  const { chosenDrinks, unchosenDrinks } = parseInputs(ctx)
  ctx.body = await getQuestion(allDrinksMap, chosenDrinks, unchosenDrinks)
})

// POST /drinks/drinks
  // post so can send body
drinksRouter.post('/drinks', async (ctx, next) => {
  const { 
    chosenDrinks, 
    unchosenDrinks,
    availableIngredientNames,
    unavailableIngredientNames
  } = parseInputs(ctx)
  ctx.body = await getDrinks(allIngredientsMap, allDrinksMap, chosenDrinks, unchosenDrinks, availableIngredientNames, unavailableIngredientNames)
})

module.exports = drinksRouter