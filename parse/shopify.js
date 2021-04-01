const { log, warn, test, okay, fail } = require('../utils/logger')

const fetch = require('node-fetch')

const delay = require('../utils/delay')

const xml = require("xml-parse")

const { Parser } = require('htmlparser2')
const { Handler } = require('htmlmetaparser')

async function parse(store, HOST_URL) {
    const { shortname, homepage } = store
    const homeURL = store['store-home']
    const productLinks = await getAllProductLinks(homeURL)
    okay("Loaded ", productLinks.length, " product links")
    let payload = []
    const rs = await Promise.allSettled(productLinks.map(link => getProductMeta(homeURL, link, shortname)))
    for (let r of rs) {
        // console.log(link)
        if(r.status == 'fulfilled') {
            payload.push(r.value)
        } else {
            fail("Failed loading product link ")
            fail(JSON.stringify(r))
        }
    }
    // payload = payload.map()
    payload.forEach(a=> a.seller=shortname )
    okay("Successfully loaded ", payload.length, " product meta into memory")
    return payload
}

function parseMicrocode(html, url) {
    return new Promise((resolve, reject) => {
        const handler = new Handler((err, result) => {
            if(err)
                return reject(err)
            resolve(result)
        }, { url });

        const parser = new Parser(handler, { decodeEntities: true });
        parser.write(html);
        parser.done();
    })
}

function getDesc(microdata) {
    try {
        return microdata[1].offers[0].description[0]
    }catch(e) {}

    try {
        return microdata[1].description[0]
    }catch(e) {}
    return ""
}

async function getProductMeta(homeURL, productURL, storename) {
    // console.log("query " + productURL)
    const req = await fetch(productURL)
    const rawHTML = await req.text()
    
    const parsed = await parseMicrocode(rawHTML, productURL)
    // console.log(parsed)

    let { rdfa, microdata } = parsed
    try {
        // console.log(microdata)
        const builder = {
            description: getDesc(microdata),
            displayname: rdfa[0]['og:title'][0],
            tags: [],
            image: rdfa[0]['og:image:secure_url'][0],
            price: parseFloat(rdfa[0]['og:price:amount']),
            currency: rdfa[0]['og:price:currency'][0],
            url: rdfa[0]['og:url'][0] || productURL,
            shortcode: storename + '-' + productURL.substring(homeURL.length).split('/').reverse()[0]
            
        }
        // console.log(builder)
        // process.exit(0)
        return builder
    }catch(e) {
        console.log(e)
    }


    return {}

}
let done = 0
let wait = time => new Promise((r,rj)=> setTimeout(r,time))
async function getAllProductLinks(homeURL) {
    done++
    if(done > 20) {
        console.log("Breathing for 200ms...")
        await wait(time)
        done = 0
    }
    const req = await fetch(homeURL + '/sitemap.xml')
    const rawXML = await req.text()
    let obj = xml.parse(rawXML)
        .filter(a => a.tagName == "sitemapindex")[0].childNodes
        .filter(a => a.tagName == "sitemap")
        .map(a =>
            a.childNodes
                .filter(b => b.tagName == "loc")
                .map(c => c.childNodes)[0][0]
        ).map(a => a.text)
        .filter(a => a.includes("products"))

    let productLinkCollection = []
    for (let sitemapLink of obj) {
        productLinkCollection = [...productLinkCollection, ...await parseSitemap(homeURL, sitemapLink)]
    }

    return productLinkCollection
}

async function parseSitemap(homeURL, sitemapLink) {
    const req = await fetch(sitemapLink)
    const rawXML = await req.text()
    let obj = rawXML.split('\n').map(a => a.trim()).filter(a => a.startsWith('<loc>')).map(a => a.replace('<loc>', '').replace('</loc>', ''))
    obj = obj.filter(a => shouldDiscard(homeURL, a))
    return obj
}

function shouldDiscard(homeURL, link) {
    if (link.endsWith("/") && !homeURL.endsWith('/'))
        homeURL += '/'

    return homeURL != link

}

module.exports = parse