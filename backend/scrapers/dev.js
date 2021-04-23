const fs = require('fs')

const utils = require('../../utils/utils')
const scraper_utils = require('./scraper_utils')

const main = async function() {
  const url = `https://www.webtender.com/db/drink/5334`
  const filepath = '/Users/mark.scherer/Downloads/dev.html'


  const html = await utils.request({ url, encoding: 'latin1' })
  fs.writeFileSync(filepath, html)
}

main()
  .catch(error => { 
    console.error(`${String(error)}`) 
    process.exit(1)
  })
  .then(() => process.exit(0))