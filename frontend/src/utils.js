/*
  Frontend utils
*/

const desanitize = function(text, options={}) {
  let result = text
    .replace(/_/g, ' ')

  if (options.capitalize)
    result = result.replace(/\b\w/g, l => l.toUpperCase())
  
  return result
}

const sanitize = function(text) {
  return text
    .toLowerCase()
    .replace(/ /g, '_')
}

export {
  desanitize,
  sanitize
}

