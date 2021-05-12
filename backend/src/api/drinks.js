/*
  Get drink recs
*/

const qs = require('qs')

const rec_engine = require('../recs.js')

// to test: see dev.js  
module.exports.get = async function(ctx, next) {
  // reformat query string params
  ctx.query.n = parseInt(ctx.query.n)
  ctx.query.must_include_ingredients = qs.parse(ctx.query).must_include_ingredients
  ctx.query.preferred_ingredients = qs.parse(ctx.query).preferred_ingredients
  ctx.query.only_preferred_ingredients = Boolean(ctx.query.only_preferred_ingredients)
  ctx.query.alcoholic_drinks = Boolean(ctx.query.alcoholic_drinks)

  const recs = await rec_engine.recommend_drinks(ctx.query)

  ctx.body = recs
  await next()
}