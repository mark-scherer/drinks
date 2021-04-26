const { resolve } = require('path')
const request_lib = require('request')

const pg = require('./postgres')

const request = async function(request_options, options={}) {
  return new Promise((resolve, reject) => {
    request_lib({ ...request_options }, (error, response, body) => {
      if (error) return reject(error)
      if (response.statusCode !== 200) return reject(`bad status code: ${response.statusCode}`)
      
      const result = options.json_parse ? JSON.parse(body) : body

      return resolve(result)
    })
  })
  
}

const config = function(public_config, private_config) {
  return {
    ...public_config,
    ...private_config
  }
}

const sanitize = function(raw_string, options={}) {
  // first remove unnecessary chars
  let result = raw_string.toLowerCase()
  .replace(/\'/g, '')
  .replace(/\"/g, '')
  .replace(/\./g, '')
  .replace(/\-/g, '_')

  // remove unncessary clauses, words
  if (!options.keep_parentheses) {
    result = result.replace(/\(.*\)/g, '')         // remove all content in parentheses
  }
  result = result.split(',')[0]   // remove all content after first comma
    .replace(/^( )*of( )*/, '')     // remove leading 'of's
  
  // remove spaces
  result = result.trim()                         
    .replace(/( ){2,}/g, ' ')       // remove all double spaces
    .replace(/ /g, '_')

  return result
}

module.exports = {
  request,
  config,
  sanitize,
  
  // imported utils
  pg
}