/*
  drinks api router
*/

const _ = require('lodash')
const Router = require('@koa/router')
const drinksRouter = new Router({ prefix: '/drinks' })

const backendUtils = require('../../../utils/utils')
const drinkUtils = require('./utils')

const { getQuestion, getDrinks } = require('./drinks_v2')

// get all drinks at startup
let allDrinksMap = {}, routerStart = Date.now()
backendUtils.allDrinks()
  .then(allDrinks => {
    allDrinksMap = _.fromPairs(_.map(allDrinks, drink => [drink.drink, drink]))
    console.log(`drinks router: retrieved ${Object.keys(allDrinksMap).length} drinks in ${_.round(Date.now() - routerStart)}ms`)
  })
  .catch(err => {
    throw Error(`drinks router: error retrieving allDrinks: ${err}`)
  })

const parseInputs = function(ctx) {
  const {
    chosenDrinkNames,
    unchosenDrinkNames
  } = ctx.request.query
  return {
    chosenDrinkNames: chosenDrinkNames ? chosenDrinkNames.split(',') : [],
    unchosenDrinkNames: unchosenDrinkNames ? unchosenDrinkNames.split(',') : []
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

  console.log(`GET /question: got question in ${_.round(Date.now() - requestStart)}ms`)
})

// GET /drinks/drinks
drinksRouter.get('/drinks', async (ctx, next) => {
  const requestStart = Date.now()

  const { chosenDrinkNames, unchosenDrinkNames } = parseInputs(ctx)
  let result = {}
  try {
    result = await getDrinks(allDrinksMap, chosenDrinkNames, unchosenDrinkNames)
  } catch (error) {
    result.status = 500
    result.error = String(error)
  }
  ctx = formatResponse(ctx, result)
  
  console.log(`GET /drinks: got ${result.length} drinks in ${_.round(Date.now() - requestStart)}ms`)
})

module.exports = drinksRouter