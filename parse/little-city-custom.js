const { log, warn, test, okay, fail } = require('../utils/logger')

const fetch = require('node-fetch')

const striptags = require("striptags")

const delay = require('../utils/delay')

const xml = require("xml-parse")

const { Parser } = require('htmlparser2')
const { Handler } = require('htmlmetaparser')

var DomParser = require('dom-parser')

const jsdom = require("jsdom")
const { JSDOM } = jsdom

var parser = new DomParser()

async function parse(store, HOST_URL) {
    const { shortname, homepage } = store
    const homeURL = store['store-home']
    const productLinks = await getAllProductLinks(homeURL)
    okay("Loaded ", productLinks.length, " product links")
    let payload = []
    for (let link of productLinks) {
        try {
            payload.push(await getProductMeta(homeURL, link, shortname))
        } catch (e) {
            fail("Failed loading product link ", link)
            fail(e)
        }
    }
    payload.forEach(a=> a.seller=shortname )
    okay("Successfully loaded ", payload.length, " product meta into memory")
    return payload
}

async function getProductMeta(homeURL, productURL, storename) {
    const p = await fetch(productURL)
    const rawHTML = await p.text()
    const { document } = (new JSDOM(rawHTML)).window
    let b = {
        description: striptags(document.getElementsByClassName('abaproduct-body')[0].innerHTML).replace('Description', '').trim(),
        displayname: document.getElementsByClassName('page-title')[0].innerHTML,
        tags: striptags(Object.values(document.getElementsByClassName('abaproduct-related-editions'))
                .filter(a=>striptags(a.innerHTML).includes("Categories"))[0].innerHTML).split('Categories')[1].trim().split('\n'),
        image: Object.values(document.getElementsByTagName('img')).filter(a=>a.src.includes("booksense"))[0].src,
        price: parseFloat(document.getElementsByClassName('abaproduct-price')[0].innerHTML.trim().substring(1)),
        currency: 'USD',
        url: productURL,
        shortcode: storename + '-' + striptags(document.getElementById('aba-product-details-fieldset').innerHTML).split(': ')[1].split('\n')[0], //isbn
        seller: storename
    }
    return b
}

async function getAllProductLinks(homeURL) {
    // take first 10 pages
    let fetches = []
    for(let i = 0; i < 10; i++) {
        const link = `https://www.littlecitybooks.com/browse/book?page=${i}`
        const promise = fetch(link)
        fetches.push(promise)
    }
    fetches = await Promise.all(fetches)
    let a = []
    for(let prom of fetches) {
        try {

            let rawHTML = await prom.text()
            const { document } = (new JSDOM(rawHTML)).window
            let links = Object.values(document.getElementsByTagName('a')).map(a=>a.href).filter(a=>(a + "").startsWith('/book/'))
            for(let link of links) {
                if(!(link || "").includes("littlecitybooks.com")) {
                    link = "https://www.littlecitybooks.com" + link
                }
                a.push(link)
            }

        }catch(e) {
            throw("Could not load product link")
        }
        
    }
    return a
}

function shouldDiscard(homeURL, link) {
    if (link.endsWith("/") && !homeURL.endsWith('/'))
        homeURL += '/'

    return homeURL != link
}

module.exports = parse