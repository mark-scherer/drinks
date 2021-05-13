const Koa = require('koa')
const Router = require('@koa/router')

const utils = require('../utils/utils')
const config = utils.config(require('../configs/public.json'), require('../configs/private.json'))

const drinks_api = require('./api/drinks')
const ingredients_api = require('./api/ingredients')

const app = new Koa()
const router = new Router()

router.get('/drinks', drinks_api.get)
router.get('/ingredients', ingredients_api.get)

app
  .use(router.routes())
  .use(router.allowedMethods())
  .use(async (ctx, next) => {     /* for dev only */
    ctx.set('Access-Control-Allow-Origin', '*')
    await next()
  })

app.listen(config.PORT)