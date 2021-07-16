/*
  Recommendation Engine
  Contains all backend reccomendation generation

  ISSUE: only_preferred_ingredients === false acts like only_preferred_ingredients === true...
*/

const Bluebird = require('bluebird')
const _ = require('lodash')

const utils = require('../utils/utils')
const import_scoring_config = require('./import_scoring_config')
const config = utils.config(require('../configs/public.json'), require('../configs/private.json'))
const scoring_config = import_scoring_config('../configs/scoring_config_dev.json')

const POSTGRES_CONCURRENCY = 4

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
  ranks eligible_drinks according to rec algo
  includes preferential treatment to preferred_ingredients if only_preferred_ingredients === true
    (otherwise has been accounted for already in recommend_drinks)
*/
const score_drink = function(drink, preferred_ingredients, only_preferred_ingredients) {
  
  // general scoring theory: scores centered around 0
  let score_details = {}

  // start with source ratings, weighted by number of ratings
  if (drink.source_rating_count && drink.source_avg_rating) {
    const normalized_avg_rating = drink.source_avg_rating - scoring_config.RATING_BENCHMARK
    score_details.ratings = scoring_config.RATINGS_WEIGHT * normalized_avg_rating * Math.log(drink.source_rating_count)  // ln(30k) ~= 10, ~30k is max rating count
  }

  // preferred_ingredients && only_preferred_ingredients account for preferred ingredients
  if (!only_preferred_ingredients && preferred_ingredients && preferred_ingredients.length > 0) {
    score_details.nonpreferred_ingredients_penalty = -1 * drink.nonpreferred_ingredient_info.length * scoring_config.NONPREFERRED_INGREDIENT_PENALTY
  }

  // add random shuffle
  score_details.random_shuffle = _.random(-1*scoring_config.RANDOM_SHUFFLE, scoring_config.RANDOM_SHUFFLE, true)

  return {
    score_details,
    score : _.reduce(score_details, (result, score_impact, category) => result += score_impact, 0)
  }
}

// helper function for parsing drinks returned by query
const parse_drink = (drink, preferred_ingredients, only_preferred_ingredients) => {
  const ingredient_info = _.map(drink.ingredient_info, info => {
    return {
      ...info,
      preferred   : !preferred_ingredients || preferred_ingredients.length === 0 || preferred_ingredients.includes(info.ingredient)
    }
  })
  const unscored_drink = {
    ..._.omit(drink, ['source']),
    ingredient_info,
    preferred_ingredient_info     : _.filter(ingredient_info, ingredient_info => ingredient_info.preferred),
    nonpreferred_ingredient_info  : _.filter(ingredient_info, ingredient_info => !ingredient_info.preferred),
    source_avg_rating             : parseFloat(drink.source_avg_rating)
  }
  return {
    ...unscored_drink,
    ...score_drink(unscored_drink, preferred_ingredients, only_preferred_ingredients)
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
  const NOT_YET_IMPLEMENTED = {excluded_drinks}
  if (_.some(Object.values(NOT_YET_IMPLEMENTED))) throw Error(`recs._recommend_drink: specified input not yet implemented: ${JSON.stringify(NOT_YET_IMPLEMENTED)}`)
  if (!alcoholic_drinks) throw Error(`recs._recommend_drink: not yet implemented: ${JSON.stringify({ alcoholic_drinks })}`)

  await utils.pg.connect(config.pg_config)

  const drinks_to_exclude = (selected_drinks || []).concat(excluded_drinks || [])
  const _preferred_ingredients = _.flatten(preferred_ingredients)

  const must_include_clause = must_include_ingredients && must_include_ingredients.length > 0 ?
    _.map(must_include_ingredients, group => {
      return `ingredient_names && array[${_.map(group, ingredient => `'${ingredient}'`).join()}]`
    }).join(' and ') : ''

  // only used if only_preferred_ingredients === true, otherwised preferred_ingredients must be handled post-query
  const preferred_ingredients_clause = only_preferred_ingredients && _preferred_ingredients && preferred_ingredients.length > 0 ?
    `ingredient_names <@ array[${_.map(_preferred_ingredients, ingredient => `'${ingredient}'`).join()}]` : ''
  
    const drinks_query = `
    with all_drinks as (
      select 
        drinks.*,
        array_agg(row_to_json(drink_ingredients.*)) as ingredient_info,
        array_agg(drink_ingredients.ingredient) as ingredient_names
      from drinks join drink_ingredients
        on drinks.drink = drink_ingredients.drink
      where drinks.drink != ALL(:drinks_to_exclude)    
      group by drinks.drink
    ) 
    select * 
    from all_drinks
    ${must_include_clause || preferred_ingredients_clause ? `where ` : ''}
    ${must_include_clause}
    ${(must_include_clause && preferred_ingredients_clause ? `and ` : '') + preferred_ingredients_clause}
  `
  // console.log(drinks_query)
  const eligible_drinks = _.map(await utils.pg.query(drinks_query, {drinks_to_exclude}), drink => parse_drink(drink, _preferred_ingredients, only_preferred_ingredients))
  
  // perform various filtering
  const filtered_drinks = _.filter(eligible_drinks, drink => {
    // if preferred_ingredients && only_preferred_ingredients, filter out dissimilar drinks
    if (!only_preferred_ingredients && _preferred_ingredients && _preferred_ingredients.length > 0) {
      const preferred_fraction = drink.preferred_ingredient_info.length / drink.ingredient_info.length
      if (preferred_fraction < scoring_config.MIN_PERFERRED_INGREDIENT_FRACTION) return false
    }

    return true
  })
  
  console.log(`found ${eligible_drinks.length} eligible drinks, filtered to ${filtered_drinks.length}...`)

  const sorted_drinks = _.sortBy(filtered_drinks, drink => -1 * drink.score)

  return {
    drink: sorted_drinks.length > 0 ? sorted_drinks[0] : null,
    drink_count: sorted_drinks.length
  }
}

module.exports = {
  recommend_drinks
}