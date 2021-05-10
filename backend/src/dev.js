/*
  tests out GET /drinks api
  
  too complicated to use simple curl for testing:
    - querystring formatting is complicated
    - frontend expansion
*/

const Bluebird = require('bluebird')
const _ = require('lodash')

const utils = require('../utils/utils')
const config = utils.config(require('../configs/public.json'), require('../configs/private.json'))

const POSTGRES_CONCURRENCY = 4

// frontend will do some conversion from user-friendly form to recommend_drinks(...) input form
    // to allow testing, will mimic that here
const frontend_input_expansion = async function(input_must_include_ingredients, input_preferred_ingredients) {
  await utils.pg.connect(config.pg_config)

  // frontend's family object
    // key    : base alcohol family's 'parent' ingredient name
    // value  : regex capturing all ingredients included in family (including parent)
  const BASE_ALCOHOL_FAMILIES = {
    whiskey   : '(whisk(e)?y)|(bourbon)',
    rum       : 'rum(_|$)',                 // want to include 'redrum'
    vodka     : 'vodka',
    gin       : 'gin(_|$)',
    tequila   : 'tequila',
    brandy    : 'brandy',
    bitters   : 'bitters'
  }

  // simulated frontend input expansion & conversion
    // no pre/postmods support yet
  let must_include_ingredients
  if (input_must_include_ingredients) {
    must_include_ingredients = []
    await Bluebird.map(input_must_include_ingredients, async ingredient => {
      let expanded_ingredient
      if (BASE_ALCOHOL_FAMILIES[ingredient]) {
        expanded_ingredient = _.map(
          await utils.pg.query(`
            select ingredient from ingredients where ingredient ~:ingredient_regex
          `, {ingredient_regex: BASE_ALCOHOL_FAMILIES[ingredient]})
        , 'ingredient')
      } else expanded_ingredient = [ingredient]
      must_include_ingredients.push(expanded_ingredient)
    }, {concurrency: POSTGRES_CONCURRENCY})
  }

  let preferred_ingredients
  if (input_preferred_ingredients) {
    preferred_ingredients = _.map(input_preferred_ingredients, ingredient => {
      let expanded_ingredient = [ingredient]
      if (!BASE_ALCOHOL_FAMILIES[ingredient]) {
        _.forEach(BASE_ALCOHOL_FAMILIES, (regex, parent_ingredient) => {
          if (new RegExp(regex).test(ingredient)) expanded_ingredient.push(parent_ingredient)
        })
      }
      return expanded_ingredient
    })
  }

  return {must_include_ingredients, preferred_ingredients}
}

const main = async function() {
  const INPUT_NUMBER_OF_RECS = 3
  const INPUT_ONLY_PREFFERRED_INGREDIENTS = false
  const INPUT_ALCOHOLIC_DRNIKS = true

  // should be flat list of ingredients or families
  const INPUT_MUST_INCLUDE_INGREDIENTS = ['whiskey']

  /* check applicable drinks (only_preferred_ingredients === true):
    select drink, array_agg(ingredient) as ingredients from drink_ingredients group by drink having array_agg(ingredient) <@ array['bourbon', 'amaretto', 'orange_juice', 'vodka'] order by drink
    (won't include expansion to parent ingredients)
  */ 
  // const INPUT_PREFERRED_INGREDIENTS = [
  //   'bourbon',       // should also show 'whiskey' drinks
  //   'peppermint_schnapps',
  //   'lemon_liqueur',
  //   'gin',
  //   'cointreau',
  //   'triple_sec',
  //   'sugar_syrup',
  //   'grenadine',
  //   'mezcal',
  //   'bitters',
  //   'orange_flower_water',
  //   'aperol',
  //   'brandy',
  //   'vodka'
  // ]
  const INPUT_PREFERRED_INGREDIENTS = null

  const {
    must_include_ingredients,
    preferred_ingredients
  } = await frontend_input_expansion(INPUT_MUST_INCLUDE_INGREDIENTS, INPUT_PREFERRED_INGREDIENTS)
  
  const result = await utils.request({
    url: `http://localhost:8000/drinks`, 
    qs: {
      n: INPUT_NUMBER_OF_RECS, 
      must_include_ingredients, 
      preferred_ingredients, 
      only_preferred_ingredients: INPUT_ONLY_PREFFERRED_INGREDIENTS, 
      alcoholic_drinks: INPUT_ALCOHOLIC_DRNIKS
    }
  }, {json_parse: true})
    .catch(error => console.error(`erroring sending request: ${error}`))
  console.log(JSON.stringify({ result }))
}

main()