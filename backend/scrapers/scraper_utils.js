const _ = require('lodash')

const utils = require('../../utils/utils')

const ROUNDED_DECIMALS = 3

// notes
  // if regex not specified, is taken as key
  // conversion is multiplier from current unit to base unit
const units = {
  // english volume
  cup: { regex: 'cup(s)?'},
  oz: {},
  pint: { 
    regex: 'pint',
    base_unit: 'cup',
    conversion: 2
  },
  tblsp: {
    base_unit: 'oz',
    conversion: 0.5
  },
  tsp: {},
  
  // metric volume
  ml: {
    base_unit: 'oz',
    conversion: 0.034,
  },
  cl: {
    base_unit: 'ml',
    conversion: 10
  },
  dl: {
    base_unit: 'ml',
    conversion: 100
  },
  l: {},

  // standard mixology units
  dash: { regex: 'dash(es)?' },
  drop: { regex: 'drop(s)?'},
  jigger: {
    regex: 'jigger(s)?',
    base_unit: 'oz',
    conversion: 1
  },
  shot: { 
    regex: 'shot(s)?',
    base_unit: 'oz',
    conversion: 1.5
  },
  splash: {
    regex: 'splash(es)?',
    base_unit: 'dash',
    conversion: 1
  },

  // metric mass
  g: { regex: 'g(r)?' },

  // packaging units
  bottle: { regex: 'bottle(s)?' },
  can: { regex: 'can(s)?' },
  fifth: { regex: 'fifth(s)?' },

  // misc
  cube: { regex: 'cube(s)?' },
  handful: {
    regex: 'handful(s)?',
    base_unit: 'cup',
    conversion: 0.5
  },
  part: { regex: 'part(s)?' },
  piece: { 
    regex: 'piece(s)?',
    base_unit: null,
    conversion: 1
  },
  pinch: { regex: 'pinch(es)?' },
  scoop: { regex: 'scoop(s)?' },
  slice: { regex: 'slice(s)?' },
  twist: { regex: 'twist(s)?' }
}

const parse_quantity = function(raw_quantity, raw_units) {
  let converted_units, converted_quantity

  // known unit
  if (units[raw_units]) {
    if (units[raw_units].base_unit !== undefined) {
      return parse_quantity(_.round(units[raw_units].conversion * raw_quantity, ROUNDED_DECIMALS), units[raw_units].base_unit) // allows nested unit links
    } else {
      converted_units = raw_units
      converted_quantity = raw_quantity
    }

  } else {
    const unit_matches = _.filter(_.toPairs(units), unit_entry => {
      const unit_regex = new RegExp(unit_entry[1].regex)
      return raw_units && unit_entry[1].regex && unit_regex.test(raw_units)
    })

    // matches regex of known unit
    if (unit_matches.length === 1) {
      return parse_quantity(raw_quantity, unit_matches[0][0])
    } else if (unit_matches.length > 1) throw Error(`found more than one unit match: ${JSON.stringify({ unit_matches, raw_units })}`)
    
    // unknown unit
    else {
      converted_units = raw_units
      converted_quantity = raw_quantity
    }
  }

  return {
    units: converted_units,
    quantity: converted_quantity
  }
}

// note: map not list for quicker access
const modifications = {
  fresh: true,
  pure: true,
  sliced: true,
  frozen: true,
  juiced: true,
  crushed: true,
  crumbled: true
}

const parse_ingredient = function(ingredient_str) {
  let found_mods = []
  _.forEach(modifications, (value, mod) => {
    const mod_regex = new RegExp(`( )*${mod}( )*`)
    if (mod_regex.test(ingredient_str)) {
      found_mods.push(mod)
      ingredient_str = ingredient_str.replace(mod_regex, ' ')
    }
  })

  return {
    modifications: found_mods,
    ingredient: utils.sanitize(ingredient_str)
  }
}

const parse_mixed_fraction = function(mixed_frac) {
  let frac_string, whole_num
  
  // true mixed frac (<whole num> <num>/<denom>)
  if (mixed_frac.indexOf(' ') !== -1) {
    frac_string = mixed_frac.split(' ')[1]
    whole_num = parseInt(mixed_frac.split(' ')[0])
  
  // just frac (<num>/<denom>)
  } else if (mixed_frac.indexOf('/') !== -1) {
    frac_string = mixed_frac.split(' ')[0]
    whole_num = 0

  // just num, possibly w/ decimal
  } else {
    frac_string = null
    whole_num = parseFloat(mixed_frac)
  }

  const frac = frac_string ? parseInt(frac_string.split('/')[0]) / parseInt(frac_string.split('/')[1]) : 0

  return _.round(whole_num + frac, ROUNDED_DECIMALS)
}

module.exports = {
  units,
  parse_quantity,
  modifications,
  parse_ingredient,
  parse_mixed_fraction,
}