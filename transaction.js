import { routerDecoder, factoryDecoder, pairDecoder, oneinchDecoder, readTokenBasic, readPairBasic, readCachedTokenBasic } from './contractReader.js'
import {E18, REPORT_THRESHOLD_DOLLAR, ETH_PRICE_APPROX} from './const'
import {getPrices, getCachedPrice, cutDecimals} from './price'
import { saveActionsToDatabase } from './database'
import { isTrustedCoin, USD_STABLECOINS, BTC_STABLECOINS } from './coinlist'
import logger from './common/logger'

const QUEUE_SIZE = 3

var routerQueue = []

function combine(a, b) {
    return Object.assign({}, a, b);
}

function isLargeETH(amount) {
    amount = parseInt(amount)
    return amount > REPORT_THRESHOLD_DOLLAR * E18 / ETH_PRICE_APPROX 
}

function isLargeToken(tokenInfo, amount, price) {
    amount = parseInt(amount) / Math.pow(10, tokenInfo.decimals)
    return amount * price > REPORT_THRESHOLD_DOLLAR
}

// convert token amount to decimals, get token symbols, calculate dollar amount
// return null if not successful or transaction not reportable
async function processRawActionData(action) {
    action.token0 = action.token0.toLowerCase()
    action.token1 = action.token1.toLowerCase()
    var token0Info = await readTokenBasic(action.token0)
    var token1Info = await readTokenBasic(action.token1)
    action.token0Name = token0Info.symbol
    action.token1Name = token1Info.symbol
    action.token0Amount = cutDecimals(action.token0Amount, token0Info.decimals)
    action.token1Amount = cutDecimals(action.token1Amount, token1Info.decimals)
    
    var token0Sym = token0Info.symbol.toLowerCase()
    var token1Sym = token1Info.symbol.toLowerCase()
    // if either one of the token is trusted (according to trusted list)
    // use that to decide dollarValue
    var eitherTrusted = false
    if (isTrustedCoin(action.token0)) {
        var prices = await getPrices(token0Sym)
        action.token0Price = prices[token0Sym]
        action.dollarValue = action.token0Price * action.token0Amount
        
        action.token1Price = action.dollarValue * 0.997 / action.token1Amount
        eitherTrusted = true
    }
    if (isTrustedCoin(action.token1)) {
        var prices = await getPrices(token1Sym)
        action.token1Price = prices[token1Sym]
        action.dollarValue = action.token1Price * action.token1Amount
        
        action.token0Price = action.dollarValue * 1.003 / action.token0Amount
        eitherTrusted = true
    }
    
    if (!eitherTrusted) {
        // get both prices from coingecko
        var prices = await getPrices([token0Sym, token1Sym])
        action.token0Price = prices[token0Sym]
        action.token1Price = prices[token1Sym]
        var v0 = action.token0Amount * action.token0Price
        var v1 = action.token1Amount * action.token1Price
        if (v0 < REPORT_THRESHOLD_DOLLAR || v1 < REPORT_THRESHOLD_DOLLAR) {
            // either side is lower than reportable limit, do not report
            return null
        }
        action.dollarValue = (v0 + v1) / 2
    }
    
    if (!action.dollarValue || isNaN(action.dollarValue)) {
        logger.log('[processRawActionData] error: invalid dollar amount', action)
        return null
    }
    
    if (action.dollarValue < REPORT_THRESHOLD_DOLLAR) return null
    
    // ignore swapping stablecoins
    if (USD_STABLECOINS[action.token0Name] && USD_STABLECOINS[action.token1Name]) return null
    
    if (BTC_STABLECOINS[action.token0Name] && BTC_STABLECOINS[action.token1Name]) return null
    
    return action
}


function processFactoryCall(tx) {
    var calldata = factoryDecoder._decodeMethod(tx.input.toLowerCase())
    console.log(calldata)
}

function processRouterCall(tx) {
    var calldata = routerDecoder._decodeMethod(tx.input.toLowerCase())
    calldata = combine(calldata, tx)
    routerQueue.push(calldata)
    if (routerQueue.length >= QUEUE_SIZE) {
        batchProcessRouterCalls()
        routerQueue = []
    }
}

async function batchProcessRouterCalls() {
    // clone the queue
    var txs = JSON.parse(JSON.stringify(routerQueue))
    
    // decide if reportable
    var reportable = []
    var requirePricesTokens = {}
    for (var tx of txs) {
        if (tx.name.includes('ETH')) {
            if (tx.name === 'swapTokensForExactETH') {
                tx.params.forEach(item => {
                   if (item.name === 'amountOut' && isLargeETH(item.value)) {
                       reportable.push(tx)
                   }
                })
            }
            else if (tx.name === 'swapExactTokensForETH') {
                tx.params.forEach(item => {
                   if (item.name === 'amountOutMin' && isLargeETH(item.value)) {
                       reportable.push(tx)
                   }  
                })
            }
            else if (isLargeETH(tx.value)){ // swap ETH for ...
                reportable.push(tx)
            }
            else {
                tx.params.forEach(item => {
                    if (item.name === 'amountETHMin' && isLargeETH(item.value)) { // add or remove liquidity
                        reportable.push(tx)
                    }
                })
            }
        }
        else {
            // swaping tokens to tokens
            // get all the prices
            // note: price can be inaccurate because of duplicate symbols
            // need to further decide the actual dollar value
            if (tx.name.includes('swap')) {
                for (var item of tx.params) {
                    if (item.name === 'path') {
                        for (var address of item.value) {
                            var tokenInfo = await readTokenBasic(address)
                            var symbol = tokenInfo.symbol.toLowerCase()
                            requirePricesTokens[symbol] = true
                        }
                    }
                }
            }
            else {
                for (var item of tx.params) {
                    if (item.name === 'tokenA' || item.name === 'tokenB') {
                        var tokenInfo = await readTokenBasic(item.value)
                        var symbol = tokenInfo.symbol.toLowerCase()
                        requirePricesTokens[symbol] = true
                    }
                }
            }
        }
    }
    
    // need to check both tokens in case the price of one of them is not available
    var tokenPrices = await getPrices(Object.keys(requirePricesTokens))
    for (var tx of txs) {
        if (!tx.name.includes('ETH')) {
            var txParams = {'0': {}, '1': {}}
            if (tx.name.includes('Liquidity')) {
                tx.params.forEach(item => { // ETH already handled above
                    if (item.name === 'tokenA') {
                        txParams['0'].token = item.value
                    }
                    else if (item.name === 'amountAMin') {
                        txParams['0'].amount = item.value
                    }
                    else if (item.name === 'tokenB') {
                        txParams['1'].token = item.value
                    }
                    else if (item.name === 'amountBMin') {
                        txParams['1'].amount = item.value
                    }
                })
            }
            else if (tx.name.includes('swap')) {
                tx.params.forEach(item => {
                    if (item.name === 'amountIn' || item.name === 'amountInMax') {
                        txParams['0'].amount = item.value
                    }
                    else if (item.name === 'path') {
                        txParams['0'].token = item.value[0]
                        txParams['1'].token = item.value[item.value.length - 1]
                    }
                    else if (item.name === 'amountOutMin' || item.name === 'amountOut') {
                        txParams['1'].amount = item.value
                    }
                })
            }
            
            var token0Info = await readTokenBasic(txParams['0'].token)
            var token1Info = await readTokenBasic(txParams['1'].token)
            if (!token0Info || !token1Info ) continue
            var price0 = tokenPrices[token0Info.symbol.toLowerCase()]
            var price1 = tokenPrices[token1Info.symbol.toLowerCase()]
            if ((price0 && isLargeToken(token0Info, txParams['0'].amount, price0)) || (price1 && isLargeToken(token1Info, txParams['1'].amount, price1))) {
                reportable.push(tx)
            }
        }
    }
    
    await reportTransactions(reportable)
}

async function reportTransactions(txs) {
    var storeList = [] // to be stored in database
    for (var tx of txs) {
        var decodedLogs = pairDecoder._decodeLogs(tx.logs)
        var action = {} // name, sender, from, to, fromAmount, toAmount
        
        if (tx.name.includes('swap')) {
            var swapLogNumber = 0
            for (var logEvent of decodedLogs) {
                if (!logEvent || !logEvent.name) continue
                if (logEvent.name === 'Swap') {
                    // get amount
                    for (var event of logEvent.events) {
                        if (swapLogNumber === 0) {
                            if (event.name === 'amount0In' && parseInt(event.value) != 0) {
                                // token0 is source token
                                action.token0Amount = parseInt(event.value)
                            } 
                            else if (event.name === 'amount1In' && parseInt(event.value) != 0) {
                                action.token0Amount = parseInt(event.value)
                            }
                        }
                        
                        // eventuall these will save info of last swap
                        if (event.name === 'amount0Out' && parseInt(event.value) != 0) {
                            // token1 is destination token
                            action.token1Amount = parseInt(event.value)
                        } 
                        else if (event.name === 'amount1Out' && parseInt(event.value) != 0) {
                            action.token1Amount = parseInt(event.value)
                        }
                    }
                    swapLogNumber++
                }
            }
            // get first and last token on the path
            // one of them could be WETH
            for (var item of tx.params) {
                if (item.name === 'path') {
                    action.token0 = item.value[0]
                    action.token1 = item.value[item.value.length - 1]
                }
            }
            
            action.name = 'Swap'
        }
        else if (tx.name.includes('addLiquidity')) {
            for (var logEvent of decodedLogs) {
                if (!logEvent || !logEvent.name) continue
                if (logEvent.name === 'Mint') {
                    action.token0Amount = parseInt(logEvent.events[1].value)
                    action.token1Amount = parseInt(logEvent.events[2].value)
                    var pairInfo = await readPairBasic(logEvent.address) // pair address
                    action.token0 = pairInfo.token0
                    action.token1 = pairInfo.token1
                }
            }
            
            action.name = 'AddLiquidity'
        }
        else if (tx.name.includes('removeLiquidity')) {
            for (var logEvent of decodedLogs) {
                if (!logEvent || !logEvent.name) continue
                if (logEvent.name === 'Burn') {
                    action.token0Amount = parseInt(logEvent.events[1].value)
                    action.token1Amount = parseInt(logEvent.events[2].value)
                    var pairInfo = await readPairBasic(logEvent.address) // pair address
                    action.token0 = pairInfo.token0
                    action.token1 = pairInfo.token1
                }
            }
            
            action.name = 'RemoveLiquidity'
        }
        
        action = await processRawActionData(action)
        if (!action) continue
        
        action.sender = tx.from
        action.hash = tx.hash
        action.timestamp = tx.timestamp
        action.market = tx.market
        
        logger.log(action)
        storeList.push(action)
    }
    if (storeList.length > 0) {
        await saveActionsToDatabase(storeList)
    }
}

async function process1inchCall(tx) {
    var methodID = tx.input.slice(2, 10).toLowerCase()
    if (methodID !== '90411a32' && methodID !== '34b0793b') return
    var decodedLogs = oneinchDecoder._decodeLogs(tx.logs)
    for (var logItem of decodedLogs) {
        if (logItem && logItem.name === 'Swapped') {
            var action = {} // name, sender, from, to, fromAmount, toAmount
            action.name = 'Swap'
            for (var event of logItem.events) {
                switch (event.name) {
                    case 'sender':
                        action.sender = event.value
                        break
                    case 'srcToken':
                        action.token0 = event.value
                        break
                    case 'dstToken':
                        action.token1 = event.value
                        break
                    case 'spentAmount':
                        action.token0Amount = event.value
                        break
                    case 'returnAmount':
                        action.token1Amount = event.value
                        break
                    default:
                        break
                }
            }
            
            try {
                action = await processRawActionData(action)
            }
            catch (e) {
                logger.log('[process1inchCall] error', e)
                return
            }
            if (!action) return
            
            action.hash = tx.hash
            action.timestamp = tx.timestamp
            action.market = tx.market
            
            logger.log(action)
            saveActionsToDatabase([action])
            return
        }
    }
}

export function processUniswapTransaction(tx) {
    if (tx.input && tx.input.length > 0) {
        tx.market = "uniswap"
        processRouterCall(tx)
    }
}

export function processSushiswapTransaction(tx) {
    if (tx.input && tx.input.length > 0) {
        tx.market = "sushiswap"
        processRouterCall(tx)
    }
}

export function process1inchTransaction(tx) {
    if (tx.input && tx.input.length > 0) {
        tx.market = "1inch"
        process1inchCall(tx)
    }
}