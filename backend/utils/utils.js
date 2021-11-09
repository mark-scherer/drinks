const request_lib = require('request')
const _ = require('lodash')

const pg = require('./postgres')

const config = function(public_config, private_config) {
  return {
    ...public_config,
    ...private_config
  }
}

const _config = config(require('../configs/public.json'), require('../configs/private.json'))
pg.connect(_config.pg_config)

const allIngredients = async function() {
  return await pg.query(`select * from ingredients`)
}

const allDrinks = async function() {
  const result = await pg.query(`
    with drink_ingredients as (
      select 
        drink, 
        json_agg(json_build_object(
          'ingredient', drink_ingredients.ingredient, 
          'premods', premods, 
          'postmods', postmods, 
          'quantity', quantity, 
          'units', units,
          'ingredient_info', row_to_json(ingredients)
        )) as recipe
      from drink_ingredients 
        join ingredients on drink_ingredients.ingredient = ingredients.ingredient
      group by drink
    ) select *
    from drink_ingredients
      join drinks on drink_ingredients.drink = drinks.drink
    where drinks.alcoholic = true
  `)

  return _.map(result, drink => {
    return {
      ..._.omit(drink, ['source', 'source_contributor']),
      source_avg_rating: parseFloat(drink.source_avg_rating),
      recipe: _.map(drink.recipe, ingredient => {
        return {
          ...ingredient,
          ingredient_info: _.omit(ingredient.ingredient_info, ['source'])
        }
      })
    }
  })
}

const request = async function(request_options, options={}) {
  return new Promise((resolve, reject) => {
    request_lib({ ...request_options }, (error, response, body) => {
      if (error) return reject(error)
      if (response.statusCode !== 200) return reject(`bad status code: ${response.statusCode}`)
      
      const result = options.json_parse ? JSON.parse(body) : body

      return resolve(result)
    })
  })
}

const parseQueryArray = function(ctx, varName) {
  const query = ctx.request.query
  // console.log(`parseQueryArray: ${JSON.stringify({ varName, query })}`)
  if (query[varName] !== null && query[varName] !== undefined) {
    return query[varName] ? query[varName].split(',') : []
  } else {
    const keyMatches = _.filter(Object.keys(query), key => key.startsWith(varName))
    return _.map(keyMatches, key => query[key])
  }
}

const sanitize = function(raw_string, options={}) {
  // first remove unnecessary chars
  let result = raw_string.toLowerCase()
  .replace(/\'/g, '')
  .replace(/\"/g, '')
  .replace(/\./g, '')
  .replace(/\-/g, '_')

  // remove unncessary clauses, words
  if (!options.keep_parentheses) {
    result = result.replace(/\(.*\)/g, '')         // remove all content in parentheses
  }
  if (!options.keep_commas) {
    result = result.split(',')[0]   // remove all content after first comma
  }
  result = result.replace(/^( )*of( )*/, '')     // remove leading 'of's
  
  // remove spaces
  result = result.trim()                         
    .replace(/( ){2,}/g, ' ')       // remove all double spaces
    .replace(/ /g, '_')

  return result
}

const is_numeric_str = function(string) {
  return !isNaN(string) && !isNaN(parseFloat(string))
}

module.exports = {
  /* data helper functions */
  allIngredients,
  allDrinks,

  /* text helper functions */
  sanitize,
  is_numeric_str,

  /* misc helper functions */
  request,
  parseQueryArray,
  config,
  
  /* imported utils */
  pg
}