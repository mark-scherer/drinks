/*
  Recommendation engine
  All backend reccomendation generation
*/

const Bluebird = require('bluebird')
const _ = require('lodash')

const utils = require('../utils/utils')
const config = utils.config(require('../configs/public.json'), require('../configs/private.json'))

const POSTGRES_CONCURRENCY = 4

/*
  main recommendation generation function
  - inputs:
    - n                           : number of recommendations to generate
    - must_include_ingredients    : list of ingredients each recommended reciepe must include (see input formatting)
    - preferred_ingredients       : list of preferred ingredients to include in recommended reciepes (see input formatting)
    - only_preferred_ingredients  : bool, can receipes only include ingredients from preferred_ingredients or are they just preferred
  - input formatting:
    - applies to must_include_ingredients, preferred_ingredients
    - due to nature of ingredients, sometimes users can specify multiple acceptable alternatives or can be parent/child ingredient relationships
    - necessitates 'nested alternatives' input format: [ [group_1_option_1, group_1_option_2, ... ], [group_2_only_option], ... ]
    - lowest-level element formatting (ex: group_1_option_1, group_2_only_option):
      - must_include_ingredients  : { ingredient: 'ingredient_name', premods: [], postmods: [] }
      - preferred_ingredients     : 'ingredient_name
  - returns: list of suggested drinks
*/
const recommend_drinks = async function(n, must_include_ingredients, preferred_ingredients, only_preferred_ingredients) {
  await utils.pg.connect(config.pg_config)

  console.log(JSON.stringify({ n, must_include_ingredients, preferred_ingredients, only_preferred_ingredients }))
}

// frontend will do some conversion from user-friendly form to recommend_drinks(...) input form
    // to allow testing, will mimic that here
const simulate_frontend_input_expansion = async function(input_must_include_ingredients, input_preferred_ingredients) {
  await utils.pg.connect(config.pg_config)

  // frontend's family object
    // key    : base alcohol family's 'parent' ingredient name
    // value  : regex capturing all ingredients included in family (including parent)
  const BASE_ALCOHOL_FAMILIES = {
    whiskey   : '(whisk(e)?y)|(bourbon)',
    rum       : 'rum(_|$)',                 // want to include 'redrum'
    vodka     : 'vodka',
    gin       : 'gin(_|$)',
    tequila   : 'tequila'
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
  const INPUT_ONLY_PREFFERRED_INGREDIENTS = true

  // should be flat list of ingredients or families
  const INPUT_MUST_INCLUDE_INGREDIENTS = [
    'whiskey'
  ]

  /* check applicable drinks (only_preferred_ingredients === true):
    select drink, array_agg(ingredient) as ingredients from drink_ingredients group by drink having array_agg(ingredient) <@ array['bourbon', 'amaretto', 'orange_juice', 'vodka'] order by drink
    (won't include expansion to parent ingredients)
  */ 
  const INPUT_PREFERRED_INGREDIENTS = [
    'bourbon',       // should also show 'whiskey' drinks
    'amaretto',
    'orange_juice',
    'vodka'
  ]

  const {
    must_include_ingredients,
    preferred_ingredients
  } = await simulate_frontend_input_expansion(INPUT_MUST_INCLUDE_INGREDIENTS, INPUT_PREFERRED_INGREDIENTS)
  
  const result = await recommend_drinks(INPUT_NUMBER_OF_RECS, must_include_ingredients, preferred_ingredients, INPUT_ONLY_PREFFERRED_INGREDIENTS)
  console.log(JSON.stringify({ result }))
}

if (require.main === module) {
  main()
    .catch(error => {
      console.error(error)
      process.exit(1)
    })
    .then(() => process.exit(0))
}

module.exports = {
  recommend_drinks
}