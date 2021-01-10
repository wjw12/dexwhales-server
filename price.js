import {getCoinId, COINID_TO_SYMBOL} from './coinlist'
import { readCachedTokenBasic } from './contractReader'
import FileCache from './common/fileCache'
import logger from './common/logger'
const fetch = require('node-fetch')

const COINGECKO_API = 'https://api.coingecko.com/api/v3/'
const EXPIRE = 120 // second

const priceCache = new FileCache('coingecko_price', EXPIRE)
priceCache.loadFromFile()

// const cachedPrice = {}


setInterval(() => {
    priceCache.dumpToFile()
}, 60 * 60 * 1000)

export async function getPrices(symbols) {
    if (!Array.isArray(symbols)) symbols = [symbols]
    for (var i = 0; i < symbols.length; ++i) {
        symbols[i] = symbols[i].toLowerCase()
    }
    var result = {}
    var coinsToFetch = []
    for (var symbol of symbols) {
        try {
            var coinId = getCoinId(symbol)
            if (!coinId) {
                result[symbol] = null
            }
            else if (priceCache.get(symbol)) {
                result[symbol] = priceCache.get(symbol)
            }
            else {
                coinsToFetch.push(symbol)
            }
        }
        catch(e) { result[symbol] = null }
    }
    
    if (coinsToFetch.length > 0) {
        try {
            var ids = coinsToFetch.map(symbol => getCoinId(symbol)).join(',')
            // query is like https://api.coingecko.com/api/v3/simple/price?ids=privacy,publish&vs_currencies=usd
            var queryString = 'ids=' + ids + '&vs_currencies=usd'
            var url = COINGECKO_API + 'simple/price?' + queryString
            var res = await fetch(url)
            var body = await res.json()
            if (body && body !== {}) {
                for (var coinId in body) {
                    if (body.hasOwnProperty(coinId)) {
                        var price = body[coinId].usd
                        var symbol = COINID_TO_SYMBOL[coinId]
                        priceCache.set(symbol, price)
                        result[symbol] = price
                    }
                }
            }
            
        } catch (e) {
            logger.log('[getPrices] error', e)
        }
        
        // maybe some coins are not avaiable in API
        for (var symbol of coinsToFetch) {
            if (!result.hasOwnProperty(symbol)) {
                result[symbol] = null
            }
        }
    }
    
    return result
}

// make sure cache is available
export function getCachedPrice(addressOrSymbol, amount) {
    if (addressOrSymbol.startsWith('0x')) {
        var info = readCachedTokenBasic(addressOrSymbol)
        var symbol = info.symbol.toLowerCase()
        return priceCache.get(symbol)
    }
    else {
        var symbol = addressOrSymbol.toLowerCase()
        return priceCache.get(symbol)
    }
}

export function cutDecimals(amountInteger, decimals) {
    return amountInteger / Math.pow(10, decimals)
}