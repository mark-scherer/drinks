const Koa = require('koa')
const Router = require('@koa/router')

const utils = require('../utils/utils')
const config = utils.config(require('../configs/public.json'), require('../configs/private.json'))

const drinks_api = require('./api/drinks')

const app = new Koa()
const router = new Router()

router.get('/drinks', drinks_api.get)

app
  .use(router.routes())
  .use(router.allowedMethods())

app.listen(config.PORT)