const path = require('path')
const Koa = require('koa')
const Router = require('@koa/router')
const static = require('koa-static')

const utils = require('../utils/utils')
const config = utils.config(require('../configs/public.json'), require('../configs/private.json'))

const drinks_api = require('./api/drinks')
const ingredients_api = require('./api/ingredients')

const app = new Koa()
const router = new Router()

router.get('/drinks/recs', drinks_api.recs.get)
router.get('/drinks/info', drinks_api.info.get)
router.get('/ingredients', ingredients_api.get)

app
  .use(router.routes())
  .use(router.allowedMethods())
  .use(async (ctx, next) => {     /* for dev only */
    ctx.set('Access-Control-Allow-Origin', '*')
    await next()
  })
  .use(static(path.join(__dirname, '../../', config.DIST)))
  .on('error', err => {
    console.error(`server error: ${err}`)
  })

app.listen(config.PORT)
console.log(`server started on port ${config.PORT}`)