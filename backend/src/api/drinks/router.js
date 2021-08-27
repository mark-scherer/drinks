/*
  drinks api router
*/

const get = async function(ctx, next) {
  console.log(`drinks api: get`)
  next()
}

module.exports = {
  get
}