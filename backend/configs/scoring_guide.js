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
  
  /* preferred_ingredients implementation controls (only_preferred_ingredients === false) */
  MIN_PERFERRED_INGREDIENT_FRACTION: {
    description   : 'minimum fraction of ingredients that must be in preferred_ingredients list, when it\'s specified (only_preferred_ingredients === false only)',
    required      : true
  },
  NONPREFERRED_INGREDIENT_PENALTY: {
    description   : 'score penalty for each non-preferred ingredient (only_preferred_ingredients === false only) (SHOULD BE POSITIVE NUMBER!)',
    required      : true
  },

  /* rating's influence controls */
  RATING_BENCHMARK: {
    description   : 'baseline avg rating below of which ratings negatively influence score',
    required      : true
  },
  RATINGS_WEIGHT: {
    description   : 'final multiplier on rating\'s influence on score, which ranges from ~-50 - ~+50',
    required      : true
  }
}

module.exports = scoring_guide