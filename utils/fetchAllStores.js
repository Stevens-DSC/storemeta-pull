const fetch = require('node-fetch')


module.exports = async function(HOST_URL) {
    const link = HOST_URL + '/stores'

    const resHTML = await fetch(link)
    const resJSON = await resHTML.json()

    return resJSON.result
}