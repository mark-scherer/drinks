/*
  Get full ingredient list
*/

const _ = require('lodash')

const utils = require('../../utils/utils')
const config = utils.config(require('../../configs/public.json'), require('../../configs/private.json'))
const families = require('../../configs/ingredient_grouping.js')

const REFRESH_PERIOD = 900 // s
let LAST_REFRESH = 0

const INGREDIENT_QUERY = `select * from ingredients`
let INGREDIENTS

const query_ingredients = async function() {
  await utils.pg.connect(config.pg_config)
  const raw_ingredients = await utils.pg.query(INGREDIENT_QUERY)
  INGREDIENTS = _.map(raw_ingredients, ingredient => _.omit(ingredient, ['source']))
}

module.exports.get = async function(ctx, next) {
  const current = Date.now()
  if (current - LAST_REFRESH > REFRESH_PERIOD*1000) {
    await query_ingredients()
    LAST_REFRESH = current
  }

  ctx.body = {
    ingredients: INGREDIENTS,
    families
  }
  await next()
}