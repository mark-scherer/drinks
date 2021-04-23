'use strict'

const { Pool }  = require('pg')
const named     = require('yesql').pg
const _         = require('lodash')

let pools = {}

const connect = function(config, name='default') {
  pools[name] = new Pool(config)
  pools[name].on('error', (err, client) => {
    console.error(`Postgres util: unexpected error on idle client ${name}: ${err}`)
    process.exit(-1)
  })

  return new Promise((resolve, reject) => {
    pools[name].connect((err, client) => {
      if (err) return reject(err)
      return resolve()
    })
  })
}

const query = function(query_str, data, options={}) {
  if (!options.name) options.name = 'default'

  if (!pools[options.name]) throw Error(`Postgres util: haven't yet setup connection: ${options.name}`)
  
  return new Promise((resolve, reject) => {
    let formatted_query
    try {
      formatted_query = named(query_str, { useNullForMissing: true })(data)
    } catch (parse_error) {
      return reject(`Postgres util: error parsing query: ${JSON.stringify({
        parse_error: String(parse_error),
        query_str,
        data
      })}`)
    }
    pools[options.name].query(formatted_query.text, formatted_query.values, (err, result) => {
      if (err) {
        if (options.accept_dupe_errors && String(err).includes('duplicate key value violates unique constraint')) { // sometimes dupe errors unavoidable due to concurrency
          return resolve()
        } else {
          return reject(`Postgres util: error running query: ${JSON.stringify({
            error: String(err),
            query_str,
            data
          })}`)
        }
      }
      return resolve(result.rows)
    })
  })
}

const one = function(query_str, data, name='default') {
  return new Promise((resovle, reject) => {
    const result = query(query_str, data, name)
      .catch((err) => reject(err))
      .then((result) => {
        if (result.length !== 1) return reject(`Postgres util: query did not return single row (${result.length}): ${query_str}`)
        return resolve(result[0])
      })
  })
}

// for queries returning rows completely unique by key_field, converts result list into dict keyed by key_field
  // key_field is kept in the resultant object values (subobjects) (in addition to being the key)
  // throws error if result is not completely unique by key_field
const to_dict = function(query_result, key_field) {
  let result = {}
  _.forEach(query_result, row => {
    const key = row[key_field]
    if (!key) throw Error(`row is missing key_field: ${JSON.stringify({ key_field, row })}`)
    if (result[key]) throw Error(`rows are not completely unique on key_field: ${JSON.stringify({ key_field, repeat_value: key })}`)
    result[key] = row
  })
  return result
}


module.exports = {
  connect,
  query,
  one,
  to_dict
}