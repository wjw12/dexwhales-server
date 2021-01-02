const redis = require("redis")
const client = redis.createClient("redis://dexwhale.nrknya.0001.use1.cache.amazonaws.com:6379")
import { WHALE_THRESHOLD_DOLLAR_TIER1, 
    WHALE_THRESHOLD_DOLLAR_TIER2, 
    WHALE_THRESHOLD_DOLLAR_TIER3 
} from './const'
import { getTier } from './tokenList'
import logger from './common/logger'

var AWS = require('aws-sdk');

AWS.config.update({
  region: "us-east-1",
  endpoint: 'http://dynamodb.us-east-1.amazonaws.com',
  accessKeyId: process.env.AWS_KEY_ID,
  secretAccessKey: process.env.AWS_KEY_SECRET
})


//var dynamodb = new AWS.DynamoDB();
var dynamoClient = new AWS.DynamoDB.DocumentClient();

function isWhaleAction(action) {
    if (action.newPair) return true  // reportable new pairs are recorded
    var tier = getTier(action)
    switch (tier) {
        case 1:
            return action.dollarValue > WHALE_THRESHOLD_DOLLAR_TIER1
        case 2:
            return action.dollarValue > WHALE_THRESHOLD_DOLLAR_TIER2
        case 3:
            return action.dollarValue > WHALE_THRESHOLD_DOLLAR_TIER3
        default:
            throw new Error('invalid tier', tier)
    }
}

export async function saveActionsToDatabase(actions) {
    var tableName = process.env.DEBUG ? "dex_watch_debug" : "dex_watch"
    var requestItems = {}
    requestItems[tableName] = actions.map(action => {
        return {
            PutRequest: {
                Item: action
            }
        }
    })
    
    var params = {
        RequestItems: requestItems
    }
    
    dynamoClient.batchWrite(params, function(err, data) {
        if (err) {
            logger.log('[saveActionsToDatabase] error', err)
        }
        else {
            // console.log(data)
        }
    })
    
    
    // put to token list
    for (var action of actions) {
        var data = {
            symbol: action.token0Name,
            lastSeen: action.timestamp
        }
        client.hset(['token_list', action.token0, JSON.stringify(data)])
        
        var data = {
            symbol: action.token1Name,
            lastSeen: action.timestamp
        }
        client.hset(['token_list', action.token1, JSON.stringify(data)])
    }
    
    // filter whale actions
    actions = actions.filter(action => isWhaleAction(action))
    if (actions.length < 1) return
    
    
    var tableName = process.env.DEBUG ? "dex_watch_whale_debug" : "dex_watch_whale"
    actions = actions.map(action => {
        action.tier = getTier(action)
        return action
    })
    var requestItems = {}
    requestItems[tableName] = actions.map(action => {
        return {
            PutRequest: {
                Item: action
            }
        }
    })
    var params = {
        RequestItems: requestItems
    }
    
    
    dynamoClient.batchWrite(params, function(err, data) {
        if (err) {
            logger.log('[saveActionsToDatabase] error', err)
        }
        else {
            // console.log(data)
        }
    })
    
    // every tx in the same block has the same timestamp
    // add to redis sorted set
    client.zadd([tableName, 'NX', actions[0].timestamp, JSON.stringify(actions)], function(err, res) {
        if (err) { 
            logger.log('[saveActionsToDatabase] error', err)
        }
    })
    
}
