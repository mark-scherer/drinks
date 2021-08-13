const _ = require('lodash')

const utils = require('../utils/utils')
const config = utils.config(require('../configs/public.json'), require('../configs/private.json'))

const get_drinks_info = async function(drinks) {
  await utils.pg.connect(config.pg_config)

  drinks = drinks.slice(0, config.drinks.MAX_DRINKS)
  const drinks_info = await utils.pg.query(`
    select 
      drinks.*,
      array_agg(row_to_json(drink_ingredients.*)) as ingredient_info,
      array_agg(drink_ingredients.ingredient) as ingredient_names
    from drinks join drink_ingredients
      on drinks.drink = drink_ingredients.drink
    where drinks.drink = ANY(:drinks) 
    group by drinks.drink
  `, {drinks})

  const drinks_info_map = _.fromPairs(_.map(drinks_info, info => [info.drink, _.omit(info, ['source'])]))
  
  const sorted_drink_info = []
  _.forEach(drinks, d => {
    if (drinks_info_map[d]) sorted_drink_info.push(drinks_info_map[d])
  })

  return sorted_drink_info
}

module.exports = { 
  get_drinks_info
}