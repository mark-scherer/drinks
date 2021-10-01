const path = require('path')
const Koa = require('koa')
const static = require('koa-static')
const compress = require('koa-compress')

const utils = require('../utils/utils')
const config = utils.config(require('../configs/public.json'), require('../configs/private.json'))
const router = require('./api/router')

const app = new Koa()

app
  .use(router.routes(), router.allowedMethods())
  .use(async (ctx, next) => {     /* for dev only */
    ctx.set('Access-Control-Allow-Origin', '*')
    await next()
  })
  .use(static(path.join(__dirname, '../../', config.frontend.DIST), {gzip: true}))
  .use(compress())
  .on('error', err => {
    console.error(`server error: ${err}`)
  })

app.listen(config.server.PORT)
console.log(`server started on port ${config.server.PORT}`)