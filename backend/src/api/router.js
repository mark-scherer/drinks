const Router = require('@koa/router')
const router = new Router()

const drinks = require('./drinks/router')
const ingredients = require('./ingredients')

router.get('/drinks', drinks.get)
router.get('/ingredients', ingredients.get)

module.exports = router