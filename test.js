const parsed = require('./test.json')
let homeURL = productURL = storename = "XXXXXXXXXXXXXXXXXXIGNORE";
let { rdfa, microdata } = parsed
const builder = {
    description: microdata[1].offers[0].description[0],
    displayname: rdfa[0]['og:title'][0],
    tags: [],
    image: rdfa[0]['og:image:secure_url'][0],
    price: parseFloat(rdfa[0]['og:price:amount']),
    currency: rdfa[0]['og:price:currency'][0],
    url: rdfa[0]['og:url'][0] || productURL,
    shortcode: storename + '-' + productURL.substring(homeURL.length).split('/').reverse()[0]
}

console.log(JSON.stringify(builder))