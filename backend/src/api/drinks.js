/*
  Get drink recs
*/

const qs = require('qs')

const rec_engine = require('../recs.js')
const drinks_info = require('../drink_info.js')

// to test: see dev.js  
const get_recs = async function(ctx, next) {
  // reformat query string params
  ctx.query.n = parseInt(ctx.query.n)
  ctx.query.must_include_ingredients = qs.parse(ctx.query).must_include_ingredients
  ctx.query.preferred_ingredients = qs.parse(ctx.query).preferred_ingredients
  ctx.query.only_preferred_ingredients = String(ctx.query.only_preferred_ingredients).toLowerCase() === 'true'
  ctx.query.alcoholic_drinks = Boolean(ctx.query.alcoholic_drinks)
  ctx.query.current_drinks = qs.parse(ctx.query).current_drinks
  ctx.query.excluded_drinks = qs.parse(ctx.query).excluded_drinks

  const recs = await rec_engine.recommend_drinks(ctx.query)

  ctx.body = recs
  await next()
}

const get_info = async function(ctx, next) {
  const drinks = qs.parse(ctx.query).drinks.split(',')
  const info = await drinks_info.get_drinks_info(drinks)
  ctx.body = info
  await next()
}

module.exports = {
  recs: {
    get: get_recs
  },
  info: {
    get: get_info
  }
}