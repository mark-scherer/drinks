/*
  Frontend utils
*/

const desanitize = (text, options={}) => {
  let result = text
    .replace(/_/g, ' ')

  if (options.capitalize)
    result = result.replace(/\b\w/g, l => l.toUpperCase())
  
  return result
}

const sanitize = (text) => {
  return text
    .toLowerCase()
    .replace(/ /g, '_')
    .replace(/\//g, '_')
    .replace(/_{2,}/g, '_')
}

const sanitizeClass = (input) => {
  return sanitize(input || '').replace(/_/g, '-')
}

export {
  desanitize,
  sanitize,
  sanitizeClass
}

