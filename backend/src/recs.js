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
  - input formatting:
    - applies to must_include_ingredients, preferred_ingredients
    - due to nature of ingredients, sometimes users can specify multiple acceptable alternatives or can be parent/child ingredient relationships
    - necessitates 'nested alternatives' input format: [ [group_1_option_1, group_1_option_2, ... ], [group_2_only_option], ... ]
    - lowest-level element formatting (ex: group_1_option_1, group_2_only_option):
      - must_include_ingredients  : { ingredient: 'ingredient_name', premods: [], postmods: [] }
      - preferred_ingredients     : 'ingredient_name
  - returns: list of suggested drinks
*/
const recommend_drinks = async function({n, must_include_ingredients, preferred_ingredients, only_preferred_ingredients, alcoholic_drinks}) {
  await utils.pg.connect(config.pg_config)
  // console.log(`recs.recommend_drinks: recieved request: ${JSON.stringify({ n, must_include_ingredients, preferred_ingredients, only_preferred_ingredients, alcoholic_drinks })}`)

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
        preferred: preferred_ingredients ? 
          _.flatten(preferred_ingredients).includes(ingredient_info.ingredient) :
          null
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
    return !preferred_ingredients || only_preferred_ingredients ||  // if only_preferred_ingredients = true, already filtered drinks to only preferred_ingredients in query
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

module.exports = {
  recommend_drinks
}