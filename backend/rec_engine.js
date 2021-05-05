/*
  Recommendation engine
  All backend reccomendation generation
*/

const Bluebird = require('bluebird')
const _ = require('lodash')

const utils = require('../utils/utils')
const config = utils.config(require('../configs/public.json'), require('../configs/private.json'))

const POSTGRES_CONCURRENCY = 4

// filtering controls
const ONLY_ALCOHOLIC                  = true
const MIN_PREFERRED_INGREDIENTS_COUNT = 1         // min count of preferred ingredient recommended drink must have (only_preferred_ingredients === false only)

// scoring params
const RATING_BENCHMARK                = 5         // below this avg rating, more ratings count negative
const RATING_COUNT_FACTOR             = 0.005     // quantified weight on lots of ratings (see usage)
const RATING_COUNT_CAP                = 200       // max rating count to use in scoring algorithm
const UNPREFERRED_INGREDIENT_PENALTY  = 2         // score penalty for each non-preferred ingredient (only_preferred_ingredients === false only) (SHOULD BE POSITIVE!)
const RANDOM_SHUFFLE                  = 1         // total range of random shuffle added to each score

/*
  main recommendation generation function
  - inputs:
    - n                           : number of recommendations to generate
    - must_include_ingredients    : list of ingredients each recommended reciepe must include (see input formatting)
    - preferred_ingredients       : list of preferred ingredients to include in recommended reciepes (see input formatting)
    - only_preferred_ingredients  : bool, can receipes only include ingredients from preferred_ingredients or are they just preferred
    - alcoholic_drinks            : bool, whether to return alcoholic or non alocoholic drinks
  - input formatting:
    - applies to must_include_ingredients, preferred_ingredients
    - due to nature of ingredients, sometimes users can specify multiple acceptable alternatives or can be parent/child ingredient relationships
    - necessitates 'nested alternatives' input format: [ [group_1_option_1, group_1_option_2, ... ], [group_2_only_option], ... ]
    - lowest-level element formatting (ex: group_1_option_1, group_2_only_option):
      - must_include_ingredients  : { ingredient: 'ingredient_name', premods: [], postmods: [] }
      - preferred_ingredients     : 'ingredient_name
  - returns: list of suggested drinks
*/
const recommend_drinks = async function(n, must_include_ingredients, preferred_ingredients, only_preferred_ingredients, alcoholic_drinks) {
  await utils.pg.connect(config.pg_config)

  // first filter drinks to respect must_include_ingredients, preferred_ingredients (only if only_preferred_ingredients === true)
  const must_include_clause = _.map(must_include_ingredients, must_include => {
    return `(${_.map(must_include, ingredient => `ingredient = '${ingredient}'`).join(' or ')})`
  }).join(' and ')
  const preferred_ingredients_clause =  preferred_ingredients && only_preferred_ingredients ?
    `having array_agg(drink_ingredients.ingredient) <@ array[${_.map(_.flatten(preferred_ingredients), ingredient => `'${ingredient}'`).join(', ')}]` : 
    ``
  const drink_query = `
    with eligible_drinks as (
      select distinct drink 
      from drink_ingredients
      ${must_include_clause !== '' ? `where ${must_include_clause}` : ``}
    ) select 
      drinks.*, 
      array_agg(row_to_json(drink_ingredients.*)) as ingredient_info
    from eligible_drinks
      join drinks on eligible_drinks.drink = drinks.drink
      join drink_ingredients on drinks.drink = drink_ingredients.drink
    where drinks.alcoholic = ${alcoholic_drinks}
    group by drinks.drink
    ${preferred_ingredients_clause}
  `

  const raw_query_drinks = await utils.pg.query(drink_query)
  const query_drinks = _.map(raw_query_drinks, drink => {
    const augged_ingredient_info = _.map(drink.ingredient_info, ingredient_info => {
      return {
        ..._.pick(ingredient_info, ['ingredient', 'premods', 'postmods', 'quantity', 'units']),
        preferred: _.flatten(preferred_ingredients).includes(ingredient_info.ingredient)
      }
    })
    return {
      ..._.omit(drink, ['source']),
      source_avg_rating   : parseFloat(drink.source_avg_rating),
      ingredient_info     : augged_ingredient_info
    }
  })

  // do additional drink filtering
  const eligible_drinks = _.filter(query_drinks, drink => {
    return only_preferred_ingredients ||  // if only_preferred_ingredients = true, already filtered drinks to only preferred_ingredients in query
      _.filter(drink.ingredient_info, 'preferred').length > MIN_PREFERRED_INGREDIENTS_COUNT

  })
  console.log(`found ${eligible_drinks.length} eligible drinks...`)

  // const sorted_drinks = _.sortBy(eligible_drinks, drink => -1 * score_drink(drink, preferred_ingredients, only_preferred_ingredients)) 
  // for debugging, see score in output
  const tmp = _.map(eligible_drinks, drink => {
    return {...drink, score: score_drink(drink, preferred_ingredients, only_preferred_ingredients)}
  })
  const sorted_drinks = _.sortBy(tmp, drink => -1 * drink.score)

  return sorted_drinks.slice(0, n)
}

/*
  ranks eligible_drinks according to rec algo
  includes preferential treatment to preferred_ingredients if only_preferred_ingredients = true
    (aotherwise has been accounted for already in recommend_drinks)
*/
const score_drink = function(drink, preferred_ingredients, only_preferred_ingredients) {
  // start with source ratings, weighted by number of ratings
  let score = drink.source_rating_count && drink.source_avg_rating ?
    (1 + Math.min(drink.source_rating_count, RATING_COUNT_CAP) * RATING_COUNT_FACTOR) * (drink.source_avg_rating - RATING_BENCHMARK) :
    0

  // account for preferred ingredients, only if only_preferred_ingredients = false (otherwise already filtered to only preferred ingredients)
  if (!only_preferred_ingredients && preferred_ingredients) {
    const unpreferred_ingredients = _.filter(drink.ingredient_info, ingredient_info => !ingredient_info.preferred)
    score -= unpreferred_ingredients.length * UNPREFERRED_INGREDIENT_PENALTY
  }

  // add random shuffle
  score += _.random(-1*RANDOM_SHUFFLE, RANDOM_SHUFFLE, true)

  return score
}

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
  const INPUT_ALCOHOLIC_DRNIKS = false

  // should be flat list of ingredients or families
  const INPUT_MUST_INCLUDE_INGREDIENTS = null

  /* check applicable drinks (only_preferred_ingredients === true):
    select drink, array_agg(ingredient) as ingredients from drink_ingredients group by drink having array_agg(ingredient) <@ array['bourbon', 'amaretto', 'orange_juice', 'vodka'] order by drink
    (won't include expansion to parent ingredients)
  */ 
  const INPUT_PREFERRED_INGREDIENTS = [
    'bourbon',       // should also show 'whiskey' drinks
    'peppermint_schnapps',
    'lemon_liqueur',
    'gin',
    'cointreau',
    'triple_sec',
    'sugar_syrup',
    'grenadine',
    'mezcal',
    'bitters',
    'orange_flower_water',
    'aperol',
    'brandy',
    'vodka'
  ]

  const {
    must_include_ingredients,
    preferred_ingredients
  } = await frontend_input_expansion(INPUT_MUST_INCLUDE_INGREDIENTS, INPUT_PREFERRED_INGREDIENTS)
  
  const result = await recommend_drinks(INPUT_NUMBER_OF_RECS, must_include_ingredients, preferred_ingredients, INPUT_ONLY_PREFFERRED_INGREDIENTS, INPUT_ALCOHOLIC_DRNIKS)
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