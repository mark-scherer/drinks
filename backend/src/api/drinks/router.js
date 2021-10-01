/*
  drinks api router
*/

const _ = require('lodash')
const Router = require('@koa/router')
const drinksRouter = new Router({ prefix: '/drinks' })

const backendUtils = require('../../../utils/utils')
const drinkUtils = require('./utils')

const getQuestion = require('./drink_questions')
// const drinks = require('./drinks')

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

// GET /drinks/question
drinksRouter.get('/question', async (ctx, next) => {
  const requestStart = Date.now()

  const {
    chosenDrinkNames,
    unchosenDrinkNames
  } = ctx.request.query
  const _chosenDrinkNames = chosenDrinkNames ? chosenDrinkNames.split(',') : []
  const _unchosenDrinkNames = unchosenDrinkNames ? unchosenDrinkNames.split(',') : []

  const questions = await getQuestion(allDrinksMap, _chosenDrinkNames, _unchosenDrinkNames) // empty params for now
  if (questions.error) {
    ctx.response.status = questions.status
    ctx.response.body = questions
  }
  else ctx.body = questions
  console.log(`GET /question: got question in ${_.round(Date.now() - requestStart)}ms`)
})
// drinksRouter.get('/drinks', drinks)

drinksRouter.get('/drinks', (ctx, next) => {
  console.log(`drinks router: got request!`)
  ctx.res.body = "response!"
  return next()
})

module.exports = drinksRouter