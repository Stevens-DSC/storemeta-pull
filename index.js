const { log, warn, test, okay, fail } = require('./utils/logger')
const unix = Date.now()
let success = 0
let total = -1
const fetchAllStores = require('./utils/fetchAllStores')

const fetch = require('node-fetch')


const parser = require('./parse/parser')

async function _() {
    require('dotenv').config()

    log("Timestamp: ", unix, " / ", new Date(unix).toGMTString())

    log("Evaluating environment variables...")
    
    if(!process.env.HOST_URL) {
        process.env.HOST_URL = "https://us-central1-dsc-marketplace.cloudfunctions.net"
    }
    
    const {HOST_URL} = process.env
    
    okay("Using host URL ", HOST_URL)
    
    if(!process.env.KEY) {
        throw("You must use a KEY environment variable (or with .env file) to connect to server.")
    }
    
    okay("Read authentication key")

    const allStores = await fetchAllStores(HOST_URL)

    okay("Fetched ", allStores.length, " stores from server!")

    total = allStores.length
    let payload = []
    for(let store of allStores) {
        try {
            log("Updating products for ", (store.shortname || "???"))
            const type = store['store-type']
            log("Has store-type ", type)
            if(!parser[type]) {
                throw("No parser found for store type.")
            }
            for(let a of (await parser[type](store, HOST_URL)))
                payload.push(a)
            success++
            okay("Success updating products for ", (store.shortname || "???"))
        } catch(e) {
            fail("Failed updating products ", (store.shortname || "???"))
            fail(e)
        }
    }

    const build = JSON.stringify({
        key: process.env.KEY,
        payload
    })

    const rawResponse = await fetch(HOST_URL + '/cronpayload', {
        method: 'POST',
        headers: {
    },
    body: build
  })

  log(await rawResponse.text())


}

_().then(result => {
    log("Done.")
    log(`${success}/${total} (${Math.round(success/total*100)}%) succeded`)
    process.exit(0)
}).catch(error => {
    fail(error)
    log("0/0 (0%) succeded")
    process.exit(-1)
})