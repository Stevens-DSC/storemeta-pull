const { log, warn, test, okay, fail } = require('./utils/logger')
const unix = Date.now()
let success = 0
let total = -1
const fetchAllStores = require('./utils/fetchAllStores')

const fetch = require('node-fetch')

require('dotenv').config()


if(!process.env.HOST_URL) {
    process.env.HOST_URL = "https://us-central1-dsc-marketplace.cloudfunctions.net"
}

const {HOST_URL} = process.env
    
okay("Using host URL ", HOST_URL)

let only = false
let ONLY_DO = ""
if(process.env.ONLY_DO) {
    only = true
    ONLY_DO = process.env.ONLY_DO
    console.log("ONLY DOING " + ONLY_DO)
}

const parser = require('./parse/parser')

async function _() {

    log("Timestamp: ", unix, " / ", new Date(unix).toGMTString())

    log("Evaluating environment variables...")
    

    

    
    if(!process.env.KEY) {
        throw("You must use a KEY environment variable (or with .env file) to connect to server.")
    }
    
    okay("Read authentication key")

    let allStores = await fetchAllStores(HOST_URL)

    if(only)
        allStores = allStores.filter(a=>a.shortname == ONLY_DO)

    okay("Fetched ", allStores.length, " stores from server!")

    total = allStores.length
    let promises = []
    let payload = []
        
    let values = await Promise.allSettled(allStores.map(runStore))

    for(let v of values) {
        let { status } = v
        if(status == "rejected") {
            fail("Failed fetching product: " + v.reason)
            continue;
        }
        let { value } = v
        for(let a of value)
            payload.push(a)
        success++
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

async function runStore(store) {
    try {
        log("Updating products for ", (store.shortname || "???"))
        const type = store['store-type']
        log("Has store-type ", type)
        if(!parser[type]) {
            throw("No parser found for store type.")
        }
        okay("Queued products for ", (store.shortname || "???"))
        let a = await (parser[type](store, HOST_URL))
        return a
    } catch(e) {
        fail("Failed queueing products ", (store.shortname || "???"))
        fail(e)
        console.log(e)
    }
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