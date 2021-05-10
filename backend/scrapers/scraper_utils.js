const _ = require('lodash')

const utils = require('../utils/utils')

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
  qt: { 
    regex: '(qt(s)?)|(quart(s)?)',
    base_unit: 'cup',
    conversion: 4
  },
  gal: { 
    regex: '(gal(s)?)|(gallon(s)?)',
    base_unit: 'cup',
    conversion: 16
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

  // english mass
  lb: { regex: '(pound(s)?)|(lb(s)?)' }, 

  // metric mass
  g: { regex: 'g(r)?' },

  // packaging units
  bottle: { regex: 'bottle(s)?' },
  can: { regex: 'can(s)?' },
  glass: { regex: 'glass(es)?' },
  fifth: { regex: 'fifth(s)?' },
  package: { regex: 'package(s)?' },
  bag: { regex: 'bag(s)?' },

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
  twist: { regex: 'twist(s)?' },
  stick: { regex: 'stick(s)?' },
  wedge: { regex: 'wedge(s)?' },
  peel: { regex: 'peel(s)?' },
  chunk: { regex: 'chunk(s)?' }
}

const written_quantites = {
  1: ['one', 'a']
}

const sub_written_quantity = function(raw_ingredient) {
  _.forEach(written_quantites, (writings, quantity) => {
    _.forEach(writings, w => {
      raw_ingredient = raw_ingredient.replace(new RegExp(`(^| )${w}( |$)`), ` ${quantity} `)
      if ((new RegExp(`(^| )${w}( |$)`)).test(raw_ingredient)) console.log(`subbed quantity: ${JSON.stringify({ raw_ingredient, quantity, w })}`)
    })
  })
  return raw_ingredient
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
      const unit_regex = new RegExp(`^${unit_entry[1].regex}$`)
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

// juiceable ingredients known to be in the DB
  // scrapers can reclassify these ingredients as their juice even if not labeled as such
const common_juices = [
  'lemon_juice',
  'lime_juice',
  'orange_juice',
]

// note: map not list for quicker access
// note: order matters!
const modifications = {
  lots: true,
  very: true,

  large: true,
  small: true,
  whole: true,
  medium: true,

  sliced: true,
  frozen: true,
  juiced: true,
  crushed: true,
  crumbled: true,
  chilled: true,
  
  fresh: true,
  ripe: true,
  hot: true,
  unbroken: true,
  pure: true,
  strong: true,
  dry: true,
}

const parse_ingredient = function(raw_ingredient_str) {
  let uncategorized_mods = [], ingredient_str = raw_ingredient_str
  _.forEach(modifications, (value, mod) => {
    const mod_regex = new RegExp(`((( )+)|(^))${mod}(( )+|($))`) // complicated, but ensure only capture mod if is its own word
    const index = raw_ingredient_str.search(mod_regex)
    if (index > -1) {
      uncategorized_mods.push({
        mod,
        index
      })
      ingredient_str = ingredient_str.replace(mod_regex, ' ')
    }
  })
  const actual_ingredient_index = raw_ingredient_str.indexOf(ingredient_str)
  if (actual_ingredient_index < 0) throw Error(`did not find ingredient in modified string: ${JSON.stringify({ raw_ingredient_str, ingredient_str, actual_ingredient_index, uncategorized_mods })}`)

  let premods = [], postmods = []
  _.forEach(uncategorized_mods, mod_info => {
    if (mod_info.index < actual_ingredient_index) premods.push(mod_info.mod)
    else postmods.push(mod_info.mod)
  })
  return {
    premods,
    postmods,
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
  sub_written_quantity,
  parse_quantity,
  common_juices,
  modifications,
  parse_ingredient,
  parse_mixed_fraction,
}