/*
  drinks api router
*/

const fs = require('fs')
const path = require('path')

const _ = require('lodash')
const Router = require('@koa/router')
const bodyParser = require('koa-bodyparser')
const YAML = require('yaml')
const drinksRouter = new Router({ prefix: '/drinks' })

const backendUtils = require('../../../utils/utils')
const drinkUtils = require('./utils')

const { getQuestion, getDrinks } = require('./drinks_v3')

// should make this an arg or something
SCORING_CONFIG_PATH = path.join(__dirname, '../../../configs/scoring_config_dev.yaml')

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

// load scoring config at startup
const scoringConfig = YAML.parse(fs.readFileSync(SCORING_CONFIG_PATH, 'utf8'))

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
  console.log(`${ctx.method}: ${ctx.path}: got request: ${JSON.stringify({ requestBody: ctx.request.body })}`)

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
  ctx.body = await getQuestion(allDrinksMap, scoringConfig, ctx.request.body.prevQuestionData)
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