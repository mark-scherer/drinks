/*
  scoring_guide.js
  - guide to required scoring_config fields
  - used by import_scoring_config.js to validate imported scoring config

  format
  - top-level fields included in export will be fields included from imported scoring config
  - options:
    - description: to help import_scoring_config.js's error msgs & for general documentation
    - required: import_scoring_config.js will throw error if field not included in imported scoring config
    - default: value filled in if field excluded from imported scoring config
*/

const scoring_guide = {
  /* random shuffling controls */
  RANDOM_SHUFFLE: {
    description   : 'total range of random shuffle added to each score',
    required      : true
  },
  
  /* preferred_ingredients implementation controls */
  NONPREFERRED_INGREDIENT_PENALTY: {
    description   : 'score penalty for each non-preferred ingredient (only_preferred_ingredients === false only) (SHOULD BE POSITIVE NUMBER!)',
    required      : true
  },

  /* rating's influence controls */
  RATING_BENCHMARK: {
    description   : 'avg rating below of which greater rating count negatively influence score',
    required      : true
  },
  RATING_COUNT_FACTOR: {
    description   : 'multiplier on capped rating count prior to weighting by avg rating',
    required      : true
  },
  RATING_COUNT_CAP: {
    description   : 'cap on rating count greater than which more ratings provide no additional scoring impact',
    required      : true
  }
}

module.exports = scoring_guide