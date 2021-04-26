/* 
  Scrapes all drinks from https://www.webtender.com/
  Also grabs metadata about glasses, ingredients
  Kinda gross at times but isn't easy to convert crowd-sourced unsanitized fields into standard columns

  Should be used in conjuction with soon-to-be-written db_clean.js script, which probably will:
    - combine identical drinks
    - convert to preferred units (this does some of that)
    - do some one off ingredient conversion and other specific data cleanup
    - reupload media from external urls to s3 (probably should be in scrapers but didn't want to write when scrapers were finalized)
  Theory for dividing functionality between scraping scripts and db_clean.js:
    - scraping scripts: convert data to supported format
    - db_clean.js: cleaning operations better suited to be performed on entire drink set, not just set scraped from one source
*/

/*
  To do
    1. figure out mod display issue
      - which mods go before and which after?
      - any other mod display concerns? Brands displayed differently? some mods not displayed?
    2. scrape full site, iterate regexs
*/

'use strict'

const fs = require('fs')
const path = require('path')
const cheerio = require('cheerio')
const Bluebird = require('bluebird')
const _ = require('lodash')

const utils = require('../../utils/utils')
const scraper_utils = require('./scraper_utils')
const { POINT_CONVERSION_COMPRESSED } = require('constants')
const config = utils.config(require('../../configs/public.json'), require('../../configs/private.json'))

const BASE_URL = 'https://www.webtender.com'
const DRINK_LIST_URL = `${BASE_URL}/db/browse?level=2&dir=drinks&char=%2A`

const UNPARSEABLE_INGREDIENTS = []
const UNPARSEABLE_DUMP_PATH = '/tmp/unparseable_ingredients.txt'

const SCRAPE_CONCURRENCY = 4
const INSERT_CONCURRENCY = 8

const CURRENT_DRINKS_QUERY = `select drink from drinks`
const CURRENT_INGREDIENTS_QUERY = `select ingredient from ingredients`
const CURRENT_GLASSES_QUERY = `select glass from glasses`

const INSERT_GLASS_QUERY = `
  insert into glasses (
    glass,
    source,
    description,
    used_for,
    size,
    image_url
  ) values (
    :glass, 
    :source,
    :description,
    :used_for,
    :size,
    :image_url
  )
`
const INSERT_INGREDIENT_QUERY = `
  insert into ingredients (
    ingredient,
    source,
    description,
    category,
    alcohol,
    image_url,
    related
  ) values (
    :ingredient,
    :source,
    :description,
    :category,
    :alcohol,
    :image_url,
    :related
  )
`
const INSERT_DRINK_QUERY = `
  insert into drinks (
    drink,
    source,
    glass,
    category,
    alcoholic,
    instructions,
    comments,
    source_avg_rating,
    source_rating_count,
    source_contributor
  ) values (
    :drink,
    :source,
    :glass,
    :category,
    :alcoholic,
    :instructions,
    :comments,
    :source_avg_rating,
    :source_rating_count,
    :source_contributor
  )`
const INSERT_DRINK_INGREDIENT_QUERY = `
  insert into drink_ingredients (
    drink,
    ingredient,
    modifications,
    quantity,
    units
  ) values (
    :drink,
    :ingredient,
    :modifications,
    :quantity,
    :units
  )`

// returns list of scraped drinks info
  // drink field of drinks info is repeatable, sanitized drink id
const scrape_drink_list = async function() {
  const drink_list = []
  let continue_loop = true
  while (continue_loop) {
    const drinks_html = await utils.request({url: `${DRINK_LIST_URL}&start=${drink_list.length}`, encoding: 'latin1'})
    const $ = cheerio.load(drinks_html)

    continue_loop = false
    $('li').map((i, el) => {
      const drink_html = $(el)
      drink_list.push({
        drink: utils.sanitize(drink_html.text(), {keep_parentheses: true}),
        link: $('a', drink_html).attr('href')
      })
      continue_loop = true
      // continue_loop = drink_list.length < 100
    })
    console.log(`...scraped ${drink_list.length} drink names`)
  }
  return drink_list.slice(0,500)
}



const parse_ingredient_info = function(raw_ingredient, link, link_text) {
  const prefix_regex = '((fill with )|(top with )|(pour in )|(shake with )|(float ))?'
  const mixed_frac_regex = '((([0-9]+ )?[0-9]*/?[0-9]+)|([0-9]+.[0-9]+))'
  const units_regex = `(${_.map(scraper_utils.units, (unit_info, unit) => unit_info.regex ? `(${unit_info.regex})` : `(${unit})`).join('|')})`
  const ingredient_mods_regex = _.map(scraper_utils.modifications, (value, mod) => `(${mod} )?`).join('')
  const ingredient_name_regex = '[a-zäéñ0-9- \(\),\'\.]+'
  const fill_action_regex = '((fill)|(top( it)?( up| off)?)) ((with)|(to top)|(rest of glass) )?'
  const other_action_regex = '((shake with)|(float) )?'
  
  // <quantity> <unit> <ingredient>
  const quantity_unit_ingredient_regex = new RegExp(`^${prefix_regex}${mixed_frac_regex} ${units_regex} ${ingredient_name_regex}$`)

  // <quantity> <ingredient> <unit>
  const quantity_ingredient_unit_regex = new RegExp(`^${prefix_regex}${mixed_frac_regex} ${ingredient_name_regex} ${units_regex}$`)

  // <action> <ingredient>
  const action_ingredient_regex = new RegExp(`^${fill_action_regex}${ingredient_name_regex}$`)

  // <non-unit ingredient>
    // ingredients where unit AND quantity is not necessary
    // expanded on an as-needed basis
    // some of these are 'unprofessional' but can be filtered by later selection algos (null units and null quantity)
  const non_unit_ingredient_regex = new RegExp(`^${other_action_regex}${ingredient_mods_regex}(` +
      '(ice( cubes)?)|' +
      '((whipped )?cream)|(sugar)|(nutmeg)|' + 
      '(((orange)|(grapefruit)|(pineapple)) juice)|(raspberries)|' +
      '(club soda)|((carbonated )?(soda )?(tonic )?water)|(ginger ale)|(sprite)|(7-up)|' +
      '(coca(-)?cola)|(schweppes russchian)|(lemonade)|(coffee)|' + 
      '((((malibu)|(dark)) )?rum)|(vodka)|(gin)|(tequila)|(southern comfort)|(champagne)|' +
      '(vermouth)|((blue )?curacao)|(((peppermint)|(blueberry)|(root beer)) schnapps)|' +
      "(grenadine)|(kahlua)|(amaretto)|(bailey's irish cream)|(banana liqueur)|(midori melon liqueur)|(creme de noyaux)|(grand marnier)|(sambuca)|(campari)|(triple sec)|" +
      '(sweet and sour( mix)?)|(sour mix)|(pina colada mix)' +
    ')$')

  // <quantity> <non-unit ingredient>
    // ingredients where unit is implicit BUT quantity is specified
  const quantity_non_unit_ingredient_regex = new RegExp(`^${other_action_regex}${mixed_frac_regex} ${ingredient_mods_regex}(` +
      '(banana(s)?)|(peach(es)?)|(strawberr(y|ies))|((maraschino )?cherr(y|ies))|(carrot(s)?)|' +
      '(ice( cube(s)?)?)|(egg( white)?)|' +
      '(mint sprig(s)?)|(wormwood twig(s)?)|(cardamom pod(s)?)|(clove(s)?)' + 
    ')$')

  // special ingredient format: juice of <quantity> <ingredient>
  const juice_of_quantity_ingredient_regex = new RegExp(`^juice of ${mixed_frac_regex} ${ingredient_name_regex}$`)

  // console.log(JSON.stringify({ 
  //   quantity_unit_ingredient_regex: quantity_unit_ingredient_regex.toString(), 
  //   quantity_ingredient_unit_regex: quantity_ingredient_unit_regex.toString(),
  //   non_unit_ingredient_regex: non_unit_ingredient_regex.toString(), 
  //   quantity_non_unit_ingredient_regex: quantity_non_unit_ingredient_regex.toString() 
  // }))
  // process.exit(0)

  let quantity, ingredient
  raw_ingredient = raw_ingredient
    .toLowerCase()
    .split(',')[0]
    .split(' or ')[0]
    .replace(/^add /, '')
    .replace(/^app(ro)?x(\.)? /, '')
    .replace(/^about /, '')
    .replace(/ pulp( |-)free /g, ' ')
    .replace(/ your choice/g, '')
    .replace(/\(.*\)/g, '')              // remove all content inside parentheses
  raw_ingredient = scraper_utils.sub_written_quantity(raw_ingredient)
    .trim()

  if (quantity_unit_ingredient_regex.test(raw_ingredient)) {
    const prepped_ingredient = raw_ingredient
      .replace(new RegExp(prefix_regex), '')
    const quantity_space_count = prepped_ingredient.indexOf(' ') < prepped_ingredient.indexOf('/') ? 1 : 0 // handle mixed frac
    quantity = scraper_utils.parse_quantity(
      scraper_utils.parse_mixed_fraction(prepped_ingredient.split(' ').slice(0, quantity_space_count + 1).join(' ')),
      utils.sanitize(prepped_ingredient.split(' ')[quantity_space_count + 1])
    )
    ingredient  = scraper_utils.parse_ingredient(prepped_ingredient.split(' ').slice(quantity_space_count + 2).join(' '))
  } else if (quantity_ingredient_unit_regex.test(raw_ingredient)) {
    const prepped_ingredient = raw_ingredient
      .replace(new RegExp(prefix_regex), '')
    const quantity_space_count = prepped_ingredient.indexOf(' ') < prepped_ingredient.indexOf('/') ? 1 : 0 // handle mixed frac
    const spaces_split = prepped_ingredient.split(' ')
    quantity = scraper_utils.parse_quantity(
      scraper_utils.parse_mixed_fraction(spaces_split.slice(0, quantity_space_count + 1).join(' ')),
      utils.sanitize(spaces_split[spaces_split.length - 1])
    )
    ingredient  = scraper_utils.parse_ingredient(spaces_split.slice(quantity_space_count + 2, spaces_split.length - 1).join(' '))
  } else if (action_ingredient_regex.test(raw_ingredient)) {
    let prepped_ingredient = raw_ingredient
      .replace(new RegExp(fill_action_regex), '')
    quantity    = scraper_utils.parse_quantity('fill', null)
    ingredient  = scraper_utils.parse_ingredient(prepped_ingredient)
  } else if (non_unit_ingredient_regex.test(raw_ingredient)) {
    let prepped_ingredient = raw_ingredient
      .replace(/cube(s)?/g, '')
    quantity    = scraper_utils.parse_quantity(null, null)
    ingredient  = scraper_utils.parse_ingredient(prepped_ingredient)
  } else if (quantity_non_unit_ingredient_regex.test(raw_ingredient)) {
    const quantity_space_count = raw_ingredient.indexOf(' ') < raw_ingredient.indexOf('/') ? 1 : 0 // handle mixed frac
    quantity    = scraper_utils.parse_quantity(
      scraper_utils.parse_mixed_fraction(raw_ingredient.split(' ').slice(0, quantity_space_count + 1).join(' ')),
      null  
    )

    // special case, add unit back: cube
    const cubes_regex = new RegExp(scraper_utils.units.cube.regex)
    if (cubes_regex.test(raw_ingredient)) {
      quantity.units = 'cube'
      ingredient = scraper_utils.parse_ingredient(raw_ingredient.split(' ').slice(quantity_space_count + 1).join(' ').replace(cubes_regex, ''))
    } else {
      ingredient = scraper_utils.parse_ingredient(raw_ingredient.split(' ').slice(quantity_space_count + 1).join(' '))
    }

  } else if (juice_of_quantity_ingredient_regex.test(raw_ingredient)) {
    const prepped_ingredient = raw_ingredient.replace(/juice of /g, '')
    const quantity_space_count = prepped_ingredient.indexOf(' ') < prepped_ingredient.indexOf('/') ? 1 : 0 // handle mixed frac
    const juiced_item = prepped_ingredient.split(' ').slice(quantity_space_count + 1).join(' ')
    quantity = scraper_utils.parse_quantity(
      scraper_utils.parse_mixed_fraction(prepped_ingredient.split(' ').slice(0, quantity_space_count + 1).join(' ')),
      juiced_item
    )
    ingredient = scraper_utils.parse_ingredient(`${juiced_item} juice`) // want ingredient categorized as juice, not juiced item
  } else {
    UNPARSEABLE_INGREDIENTS.push(raw_ingredient)
    throw Error(`not implemented to parse ingredient: ${raw_ingredient}`)
  }

  // parsed ingredient checked against link at end because parser already setup and tuned
    // if encounter signficant additional tuning, probably should update to using link at beginning of process
  if (ingredient.ingredient !== link_text) {
    // for some common juices, want to ensure categorized by juice not juiced item
      // note: if only partially scraping on empty DB, may not insert all of known juices and may cause postgres insert error on some drinks that assume juices are in DB
    const known_juice = ingredient.ingredient.includes('juice') && scraper_utils.common_juices.includes(ingredient.ingredient)

    if (!known_juice) {
      // check if can parse out a modification
      if (ingredient.ingredient.includes(link_text)) {
        const potential_mods = ingredient.ingredient.replace(new RegExp(`_${link_text}$`), '').replace(new RegExp(`_${link_text}_`), '').replace(new RegExp(`^${link_text}_`), '')
          .replace(/_/g, ' ')
          .replace(/( ){2,}/g, ' ')
          .trim()
          .split(' ')
        const mods_to_add = _.chain(potential_mods)
          .map(mod => utils.sanitize(mod))
          .filter(mod => mod.length > 0) // sanitize will remove extra words, leaving some empty strings here
          .value()
        ingredient.modifications.push(...mods_to_add)
      }
      ingredient.ingredient = link_text
    } else {
      console.log(`reclassifying known common juice: ${JSON.stringify({ raw_ingredient, link_text, ingredient })}`)
    }
  }

  return {
    ..._.pick(quantity, ['units', 'quantity']),
    ..._.pick(ingredient, ['ingredient', 'modifications']),
    link
  }
}

const scrape_drink = async function(drink) {
  const drink_html = await utils.request({ 
    url: `${BASE_URL}${drink.link}`,
    encoding: 'latin1'
  })
  const $ = cheerio.load(drink_html)

  const instructions = $("H3:contains('nstructions')").next().text()  // contains() is case sensitive, may use other forms of 'Instructions'
  const ingredients_info = []
  $("H3:contains('Ingredients:')").next('ul').children().map((i, el) => {
    let link, link_text
    if ($(el).find('a').length > 0) {
      if ($(el).find('a').length > 1) throw Error(`found multiple ingredient links: ${JSON.stringify({ drink, links: $(el).find('a').map((i, el) => el.html()) })}`)
      link = $(el).find('a').first().attr('href')
      link_text = utils.sanitize($(el).find('a').first().text())
    }
    const parsed_ingredient = parse_ingredient_info($(el).text().trim(), link, link_text)
    
    ingredients_info.push(parsed_ingredient)
  })

  const comments_els = $("h3:contains('omments:')")
  const comments = comments_els.length > 0 ? comments_els.first().next('p').text() : null

  const category = utils.sanitize($("th:contains('Category:')").next('td').text())
  const alcoholic = utils.sanitize($("th:contains('Alcohol:')").next('td').text()) === 'alcoholic'

  const raw_glass = $("th:contains('Serve in:')").next('td')
  const unknown_glass = utils.sanitize(raw_glass.text()).includes('unknown')
  const glass_info = {
    glass : unknown_glass ? 'unknown' : utils.sanitize(raw_glass.text()),
    link  : unknown_glass ? null : raw_glass.find('a').attr('href')
  }

  const raw_rating = $("th:contains('Rating:')").next('td').text()
  const source_avg_rating = parseFloat(raw_rating.split('-')[0])
  const source_rating_count = parseInt(raw_rating.split('-')[1].replace('votes', ''))

  const source_contributor = $("th:contains('Contributor:')").length > 0 ? utils.sanitize($("th:contains('Contributor:')").next('td').text()) :
    $("th:contains('Source:')").length > 0 ? utils.sanitize($("th:contains('Source:')").next('td').text()) : null
  
  return {
    ..._.pick(drink, ['drink']),
    source: 'webtender',
    instructions,
    ingredients_info,
    comments,
    category,
    alcoholic,
    glass_info,
    source_avg_rating,
    source_rating_count,
    source_contributor
  }
}

const scrape_glass = async function(glass_info) {
  let size, description, image_url, used_for = []
  if (glass_info.glass !== 'unknown') {
    const glass_html = await utils.request({ url: `${BASE_URL}${glass_info.link}` })
    const $ = cheerio.load(glass_html)

    const content_html = $('td').first()
    if (content_html) {
      const content = content_html.text()
        .replace(/^\n*/g, '')
        .replace(/\n*$/g, '')
        .replace(/\n{2,}/g, '\n')
        .replace('List of drinks served in this glass.', '')
        .replace('More information:', '')
        .trim()

      if (!content.includes('At the moment, there is no information about this glass')) {
        let description_str
        if (content.includes('Normal size:')) {
          size = content.split('\n')[0].replace('Normal size:', '').trim().replace(/\.$/g, '')
          description_str = content.split('\n').slice(1).join('\n').trim()
        } else {
          description_str = content
        }

        const used_for_regex = new RegExp('A.+ is often used for:\n')
        if (description_str.match(used_for_regex)) {
          used_for = _.map(description_str.split(used_for_regex)[1].split('\n'), raw_use => raw_use.trim())
          description = description_str.split(used_for_regex)[0].replace(/\n$/g, '')
        } else description = description_str
      }
      
      const raw_image_url = content_html.next('td').find('img').first().attr('src')
      image_url = raw_image_url ? path.join(BASE_URL, raw_image_url.replace(/^(..\/)*/g, '')) : null
    }
  }

  return {
    ..._.pick(glass_info, ['glass']),
    source        : 'webtender',
    size,
    description,
    used_for,
    image_url
  }
}

const scrape_ingredient = async function(ingredient_info) {
  let description, image_url, category, alcohol, related
  if (ingredient_info.link) {
    const ingredient_html = await utils.request({ url: `${BASE_URL}${ingredient_info.link}`, encoding: 'latin1' })
    const $ = cheerio.load(ingredient_html)

    const name_el = $('h1').first()
    const ingredient = utils.sanitize(name_el.text())
    if (ingredient !== ingredient_info.ingredient) throw Error(`mismatch link text and ingredient: ${JSON.stringify({ ingredient_info, ingredient })}`)

    const raw_description = name_el.nextAll('p').first().text()
      .replace(/\n/g, ' ')
      .replace(/( ){2, }/g, ' ')
    description = raw_description.includes('There is currently no information about this ingredient') ? null : raw_description
    image_url = name_el.next().is('img') ? `${BASE_URL}${name_el.next().attr('src').replace(/^(..\/)*/g, '')}` : null
    
    const raw_category = $('dt:contains("Category:")').next('dd').text()
    category = utils.sanitize(raw_category)
    
    const raw_alcohol = $('dt:contains("Alcohol:")').next('dd').text()
    alcohol = raw_alcohol.includes('%') ? _.round(parseFloat(raw_alcohol.split('%')[0]) / 100, 3) :
      raw_alcohol.includes('Non alcoholic') ? 0 : null
    
    const raw_related = $('p:contains("Related ingredients:")').nextAll('li').map((i, el) => $(el).text()).toArray()
    const cleaned_related = _.chain(raw_related)
      .map(related_item => related_item.trim().replace(/^\n+/, '').replace(/\n+$/, '').replace(/\n{2,}/, '').trim().split('\n'))
      .flatten()
      .value()
    const last_related_index = cleaned_related.findIndex(el => el.includes('More information:'))
    related = last_related_index >= 0 ? cleaned_related.slice(0, last_related_index + 1) : cleaned_related
    related = _.map(related, related_ingred => utils.sanitize(related_ingred.replace('More information:', '')))
  }
  return {
    ..._.pick(ingredient_info, ['ingredient', 'link']),
    source: 'webtender',
    description,
    image_url,
    category,
    alcohol,
    related
  }
}

const main = async function() {
  await utils.pg.connect(config.pg_config)

  const current_drinks = utils.pg.to_dict(await utils.pg.query(CURRENT_DRINKS_QUERY), 'drink')
  const current_ingedients = utils.pg.to_dict(await utils.pg.query(CURRENT_INGREDIENTS_QUERY), 'ingredient')
  const current_glasses = utils.pg.to_dict(await utils.pg.query(CURRENT_GLASSES_QUERY), 'glass')

  const scraped_drink_list = await scrape_drink_list()
  const new_drinks = _.filter(scraped_drink_list, drink_info => !current_drinks[drink_info.drink])
  console.log(`finished scraping drink list: ${JSON.stringify({ scraped: scrape_drink_list.length, new: new_drinks.length })}`)

  // fully scrape new items: drinks, glasses, ingredientes
  const drinks_full_info = []
  let scraped_drinks = 0
  await Bluebird.map(new_drinks, async drink => {
    try {
      drinks_full_info.push(await scrape_drink(drink))
    } catch (scrape_error) {
      console.error(`error parsing drink, skipping: ${JSON.stringify({ drink, scrape_error: String(scrape_error) })}`)
    }
    
    scraped_drinks++
    if (scraped_drinks % 250 === 0) console.log(`attempted full scraping for ${scraped_drinks} / ${new_drinks.length} new drinks: actually scraped: ${drinks_full_info.length}..`)
  }, {concurrency: SCRAPE_CONCURRENCY})
  console.log(`..finished attempting full scraping for ${scraped_drinks} / ${new_drinks.length} new drinks: actually scraped: ${drinks_full_info.length}`)

  fs.writeFileSync(UNPARSEABLE_DUMP_PATH, UNPARSEABLE_INGREDIENTS.sort().join('\n'))
  console.log(`wrote ${UNPARSEABLE_INGREDIENTS.length} unparseable ingredients to ${UNPARSEABLE_DUMP_PATH}`)

  // scrape new glasses, ingredients
  const new_glasses = _.chain(drinks_full_info)
    .map(drink => drink.glass_info)
    .uniqBy(glass_info => glass_info.glass)
    .filter(glass_info => !current_glasses[glass_info.glass] && glass_info.glass !== 'unknown')
    .value()
  const full_glasses_info = []
  let scraped_glasses = 0
  await Bluebird.map(new_glasses, async glass_info => {
    try {
      full_glasses_info.push(await scrape_glass(glass_info))
    } catch (scrape_error) {
      console.error(`error scraping glass: ${JSON.stringify({ glass_info, scrape_error: String(scrape_error) })}`)
    }

    scraped_glasses++
    if (scraped_glasses % 100 === 0) console.log(`attempted scraping for ${scraped_glasses} / ${new_glasses.length} new glasses: actually scraped: ${full_glasses_info.length}..`)
  }, {concurrency: SCRAPE_CONCURRENCY})
  console.log(`..finished attempting scraping for ${scraped_glasses} / ${new_glasses.length} new glasses: actually scraped: ${full_glasses_info.length}..`)

  const new_ingredients = _.chain(drinks_full_info)
    .map(drink => drink.ingredients_info)
    .flatten()
    .uniqBy(ingredient_info => ingredient_info.ingredient)
    .filter(ingredient_info => !current_ingedients[ingredient_info.ingredient])
    .value()
  const full_ingredients_info = []
  let scraped_ingredients = 0
  await Bluebird.map(new_ingredients, async ingredient_info => {
    try {
      full_ingredients_info.push(await scrape_ingredient(ingredient_info))
    } catch (scrape_error) {
      console.error(`error scraping ingredient: ${JSON.stringify({ ingredient_info, scrape_error: String(scrape_error) })}`)
    }

    scraped_ingredients++
    if (scraped_ingredients % 100 === 0) console.log(`attempted scraping for ${scraped_ingredients} / ${new_ingredients.length} new ingredients: actually scraped: ${full_ingredients_info.length}..`)
  }, {concurrency: SCRAPE_CONCURRENCY})
  console.log(`..finished attempting scraping for ${scraped_ingredients} / ${new_ingredients.length} new ingredients: actually scraped: ${full_ingredients_info.length}`)


  // insert in reverse order: ingredients, glasses, drinks
  let inserted_ingredients = 0, attempted_ingredients = 0
  await Bluebird.map(full_ingredients_info, async ingredient_info => {
    try {
      await utils.pg.query(INSERT_INGREDIENT_QUERY, ingredient_info)
      inserted_ingredients++
    } catch (insert_error) {
      console.error(`error inserting ingredient, skipping: ${JSON.stringify({ ingredient_info, insert_error: String(insert_error) })}`)
    }

    attempted_ingredients++
    if (attempted_ingredients % 100 === 0) console.log(`attempted insert for ${attempted_ingredients} / ${full_ingredients_info.length} fully scraped new ingredients: actually inserted: ${inserted_ingredients}..`)
  }, {concurrency: INSERT_CONCURRENCY})
  console.log(`..finished attempting insert for ${attempted_ingredients} / ${full_ingredients_info.length} fully scraped new ingredients: actually inserted: ${inserted_ingredients}`)

  let inserted_glasses = 0, attempted_glasses = 0
  await Bluebird.map(full_glasses_info, async glass_info => {
    try {
      await utils.pg.query(INSERT_GLASS_QUERY, glass_info)
      inserted_glasses++
    } catch (insert_error) {
      console.error(`error inserting glass, skipping: ${JSON.stringify({ glass_info, insert_error: String(insert_error) })}`)
    }

    attempted_glasses++
    if (attempted_glasses % 100 === 0) console.log(`attempted insert for ${attempted_glasses} / ${full_glasses_info.length} fully scraped new glasses: actually inserted: ${inserted_glasses}..`)
  }, {concurrency: INSERT_CONCURRENCY})
  console.log(`..finished attempting insert for ${attempted_glasses} / ${full_glasses_info.length} fully scraped new glasses: actually inserted: ${inserted_glasses}`)

  let inserted_drinks = 0, attempted_drinks = 0
  await Bluebird.map(drinks_full_info, async full_info => {
    try {
      await utils.pg.query(INSERT_DRINK_QUERY, {
        ...full_info,
        glass: full_info.glass_info.glass !== 'unknown' ? full_info.glass_info.glass : null
      })
      
      await Bluebird.each(full_info.ingredients_info, async ingredient_info => {
        await utils.pg.query(INSERT_DRINK_INGREDIENT_QUERY, {
          drink: full_info.drink,
          ...ingredient_info
        })
      })

      inserted_drinks++
    } catch (insert_error) {
      console.error(`error inserting drink, skipping: ${JSON.stringify({ full_info, insert_error: String(insert_error) })}`)
    }

    attempted_drinks++
    if (attempted_drinks % 250 === 0) console.log(`attempted insert for ${attempted_drinks} / ${drinks_full_info.length} fully scraped new drinks: actually inserted: ${inserted_drinks}..`)
  }, {concurrency: INSERT_CONCURRENCY})
  console.log(`..finished attempting insert for ${attempted_drinks} / ${drinks_full_info.length} fully scraped new drinks: actually inserted: ${inserted_drinks}`)
}

main()
  .catch(error => { 
    console.error(`${String(error)}`) 
    process.exit(1)
  })
  .then(() => process.exit(0))