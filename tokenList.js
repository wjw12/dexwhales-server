import { getTopTokens } from './uniswapData/getTopTokens.js'

var tier1 = {
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': true, // WETH
    '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': true, // WBTC
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': true, // USDC
    '0xdac17f958d2ee523a2206206994597c13d831ec7': true, // USDT
    '0x6b175474e89094c44da98b954eedeac495271d0f': true, // DAI
    '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': true, // UNI
    '0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e': true, // YFI
    '0x514910771af9ca656af840dff83e8264ecf986ca': true // LINK
}

var tier2 = {}

var tier3 = {}

function updateUniswapTopTokens() {
    getTopTokens().then(tokens => {
        tier2 = {}
        for (let token of tokens) {
            tier2[token.id] = {
                name: token.name, // like "Wrapped Ether"
                symbol: token.symbol // like "WETH"
            }
        }
        console.log('updated uniswap top token list')
        console.log(tier2)
    }).catch (e => { console.error(e) })
}

// upon start
updateUniswapTopTokens()

// refresh every 6 hours
setInterval(() => {
    updateUniswapTopTokens()
}, 6 * 60 * 60 * 1000)

export function getTier(action) {
    if (tier1[action.token0] && tier1[action.token1]) {
        return 1
    }
    else if (tier2[action.token0] || tier2[action.token2]){
        return 2
    }
    else return 3
}