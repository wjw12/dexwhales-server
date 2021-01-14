import logger from './common/logger'

// Using the Twit node package
// https://github.com/ttezel/twit
const Twit = require('twit');

const config = {
  consumer_key: process.env.TWITTER_API_KEY, 
  consumer_secret: process.env.TWITTER_API_KEY_SECRET,
  access_token: process.env.TWITTER_ACCESS_TOKEN,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
}

// Making a Twit object for connection to the API
const T = new Twit(config);

const EMOJI = {
    UNICORN: '🦄',
    SUSHI: '🍣',
    WHALE: '🐳',
    WATER: '💧',
    UMBRELLA: '☔️',
    FIRE: '🔥'
}

function formatNumber(x) {
    x = x.toFixed(2)
    return x.toLocaleString()// toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",")
}

function formatTx(hash) {
    return hash.substring(0, 12) + "..."
}

function getTokenLink(address) {
    return "https://etherscan.io/token/" + address
}

function getTxLink(hash) {
    return "https://etherscan.io/tx/" + hash
}

function formatToken(symbol) {
    var addDollar = true
    for (var letter of symbol) {
        if( letter.toUpperCase() == letter.toLowerCase() ) { // non-letter
            addDollar = false
            break
        }
    }
    return addDollar ? '$'+symbol : symbol
}

function getContent(action) {
    var action_type = action.name // string: Swap, AddLiquidity, RemoveLiquidity
    var whales = ""
    var emoji, conjunct
    switch (action_type) {
        case 'Swap':
            conjunct = " For "
            action_type = "Swap"
            emoji = EMOJI.WHALE
            break
        case 'AddLiquidity':
            conjunct = " And "
            action_type = "Add Liquidity"
            emoji = EMOJI.WATER
            break
        case 'RemoveLiquidity':
            conjunct = " And "
            emoji = EMOJI.UMBRELLA
            action_type = "Remove Liquidity"
            break
    }
    
    if (action.newPair) {
        emoji = EMOJI.FIRE
        action_type = "Create New Pair"
    }
    for (var i = 0; i < 4; ++i) {
        whales += emoji
    }

    var price0 = action.token0Price || null
    var price1 = action.token1Price || null
    if (price0 && !isNaN(price0)) {
        price0 = ` (\$${formatNumber(price0)})`
    }
    else price0 = null

    if (price1 && !isNaN(price1)) {
        price1 = ` (\$${formatNumber(price1)})`
    }
    else price1 = null

    var marketName
    switch (action.market) { // could be undefined
        case 'sushiswap':
            marketName = "#Sushiswap " + EMOJI.SUSHI
            break
        case '1inch':
            marketName = "#1inch "
            break
        default:
            marketName = '#Uniswap ' + EMOJI.UNICORN
            break
    }
    
    var link = getTxLink(action.hash)

    return whales + ' ' + action_type + ' ' + formatNumber(action.token0Amount) + ' ' + formatToken(action.token0Name) + (price0 ? price0 : '') + 
      conjunct + formatNumber(action.token1Amount) + ' ' + formatToken(action.token1Name) + (price1 ? price1 : '') + ' at ' + marketName + ' tx: ' + link
}

export function postTwitter(action) {
    var tweet = getContent(action)
    
      // Callback for when the tweet is sent
      function tweeted(err, data, response) {
        if (err) {
          logger.log('[postTwitter] error:', err)
        } else {
          logger.log('[postTwitter] success:' + data.text)
        }
      }
      
    // Post that tweet!
      T.post('statuses/update', { status: tweet }, tweeted);
    
}
