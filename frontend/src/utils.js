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

export {
  desanitize
}

