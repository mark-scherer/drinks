const _ = require('lodash')

const scoring_guide = require('../configs/scoring_guide')

const exists = (value) => {
  return value !== null && value !== undefined
}

const field_err_msg = (field, value, err) => {
  return `import_scoring_config.js: invalid scoring config: ${JSON.stringify({ field, value, err })}`
}

const import_scoring_config = (config_path) => {
  const scoring_config = require(config_path)

  // verify no extra scoring_config fields
  _.forEach(scoring_config, (value, field) => {
    if (!exists(scoring_guide[field])) throw Error(field_err_msg(field, value, 'field is not recognized'))
  })

  // fill in defaults
  _.forEach(scoring_guide, (field_meta, field) => {
    if (exists(field_meta.default) && !exists(scoring_config[field])) scoring_config[field] = field_meta.default
  })

  // validate all scoring_config values are numerical
  _.forEach(scoring_config, (value, field) => {
    if (isNaN(value)) throw Error(field_err_msg(field, value, 'value is not numerical'))
  })

  // validate scoring_config not missing any required fields
  _.forEach(scoring_guide, (field_meta, field) => {
    if (field_meta.required && !exists(scoring_config[field])) throw Error(field_err_msg(field, scoring_config[field], 'field is required'))
  })

  return scoring_config
}

module.exports = import_scoring_config