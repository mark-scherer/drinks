/*
  top level api router
*/

const Router = require('@koa/router')
const router = new Router()

const drinksRouter = require('./drinks/router')
const ingredients = require('./ingredients')

// router.get('/drinks', drinksRouter.routes())
router.use(drinksRouter.routes(), drinksRouter.allowedMethods())
router.get('/ingredients', ingredients.get)

module.exports = router