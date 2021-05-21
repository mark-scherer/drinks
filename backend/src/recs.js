/*
  Recommendation Engine
  Contains all backend reccomendation generation
*/

const Bluebird = require('bluebird')
const _ = require('lodash')

const utils = require('../utils/utils')
const config = utils.config(require('../configs/public.json'), require('../configs/private.json'))

const POSTGRES_CONCURRENCY = 4

// filtering controls
const MIN_PREFERRED_INGREDIENTS_COUNT = 1         // min count of preferred ingredient recommended drink must have (only_preferred_ingredients === false only)

// scoring params
const RATING_BENCHMARK                = 5         // below this avg rating, more ratings count negative
const RATING_COUNT_FACTOR             = 0.005     // quantified weight on lots of ratings (see usage)
const RATING_COUNT_CAP                = 200       // max rating count to use in scoring algorithm
const UNPREFERRED_INGREDIENT_PENALTY  = 2         // score penalty for each non-preferred ingredient (only_preferred_ingredients === false only) (SHOULD BE POSITIVE NUMBER!)
const RANDOM_SHUFFLE                  = 1         // total range of random shuffle added to each score

/*
  main recommendation generation function
  - inputs:
    - n                           : number of recommendations to generate
    - must_include_ingredients    : list of ingredients each recommended reciepe must include (see input formatting)
    - preferred_ingredients       : list of preferred ingredients to include in recommended reciepes (see input formatting)
    - only_preferred_ingredients  : bool, can receipes only include ingredients from preferred_ingredients or are they just preferred
    - alcoholic_drinks            : bool, whether to return alcoholic or non alocoholic drinks
    - excluded_drinks             : list of drinks to exclude from selection
  - input formatting:
    - applies to must_include_ingredients, preferred_ingredients
    - due to nature of ingredients, sometimes users can specify multiple acceptable alternatives or can be parent/child ingredient relationships
    - necessitates 'nested alternatives' input format: [ [group_1_option_1, group_1_option_2, ... ], [group_2_only_option], ... ]
    - lowest-level element formatting (ex: group_1_option_1, group_2_only_option):
      - must_include_ingredients  : { ingredient: 'ingredient_name', premods: [], postmods: [] }
      - preferred_ingredients     : 'ingredient_name
  - returns: list of suggested drinks
*/
const recommend_drinks = async function({n, must_include_ingredients, preferred_ingredients, only_preferred_ingredients, alcoholic_drinks, excluded_drinks}) {
  console.log(`recs.recommend_drinks: recieved request: ${JSON.stringify({ n, must_include_ingredients, preferred_ingredients, only_preferred_ingredients, alcoholic_drinks })}`)

  let drinks = [], drink_count, continue_loop = true
  while (drinks.length < n && continue_loop) {
    const rec_info = await _recommend_drink({
      selected_drinks: _.map(drinks, 'drink'),
      must_include_ingredients,
      preferred_ingredients,
      only_preferred_ingredients,
      alcoholic_drinks,
      excluded_drinks
    })
    drink_count = rec_info.drink_count + drinks.length // _recommend_drink(...) excludes selected_drinks from count
    if (rec_info.drink) drinks.push(rec_info.drink)
    else continue_loop = false
  }
  return {
    drinks,
    drink_count
  }
}

/*
  recommend single drink
  - inputs:
    - selected_drinks     : list of drinks selected by previous cycles
    - see recommend_drinks(...) for input, input_formatting notes: must_include_ingredients, preferred_ingredients, only_preferred_ingredients, alcoholic_drinks, excluded_drinks
  - returns: single drink recommendation
*/
const _recommend_drink = async function({selected_drinks, must_include_ingredients, preferred_ingredients, only_preferred_ingredients, alcoholic_drinks, excluded_drinks}) {
  await utils.pg.connect(config.pg_config)

  // simplicfication for now
  must_include_ingredients = _.flatten(must_include_ingredients)

  const all_preferred_ingredients = _.flatten(preferred_ingredients)
  const parse_drink = (drink) => {
    const ingredient_info = _.map(drink.raw_ingredient_info, ingredient_info => {
      return {
        ..._.pick(ingredient_info, ['ingredient', 'premods', 'postmods', 'quantity', 'units']),
        preferred: preferred_ingredients ? 
          all_preferred_ingredients.includes(ingredient_info.ingredient) :
          null
      }
    })
    return {
      ..._.omit(drink, ['source', 'raw_ingredient_info']),
      source_avg_rating   : parseFloat(drink.source_avg_rating),
      ingredient_info,
    }
  }

  const drinks_query = `
    select 
      drinks.*,
      array_agg(row_to_json(drink_ingredients.*)) as raw_ingredient_info
    from drinks join drink_ingredients 
      on drinks.drink = drink_ingredients.drink
    where drinks.drink != ALL(:drinks_to_exclude)
    group by drinks.drink
    ${ must_include_ingredients ? 'having array_agg(drink_ingredients.ingredient) @> :must_include_ingredients' : '' }
  `

  // query drinks to respect must_include_ingredients
  const drinks_to_exclude = (selected_drinks || []).concat(excluded_drinks || [])
  console.log(JSON.stringify({ selected_drinks, drinks_to_exclude }))
  const query_drinks = _.map(await utils.pg.query(drinks_query, { must_include_ingredients, drinks_to_exclude }), parse_drink)

  // filter drinks to respect preferred_ingredients
  const eligible_drinks = _.filter(query_drinks, drink => {
    if (!preferred_ingredients) return true

    const preferred_count = _.filter(drink.ingredient_info, 'preferred').length
    if (only_preferred_ingredients) return preferred_count === drink.ingredient_info.length
    else return preferred_count >= MIN_PREFERRED_INGREDIENTS_COUNT
  })
  console.log(`found ${eligible_drinks.length} eligible drinks...`)

  // const sorted_drinks = _.sortBy(eligible_drinks, drink => -1 * score_drink(drink, preferred_ingredients, only_preferred_ingredients)) 
  // for debugging, see score in output
  const tmp = _.map(eligible_drinks, drink => {
    return {...drink, score: score_drink(drink, preferred_ingredients, only_preferred_ingredients)}
  })
  const sorted_drinks = _.sortBy(tmp, drink => -1 * drink.score)

  return {
    drink: sorted_drinks.length > 0 ? sorted_drinks[0] : null,
    drink_count: sorted_drinks.length
  }
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

module.exports = {
  recommend_drinks
}