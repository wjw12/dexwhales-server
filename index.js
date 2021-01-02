import { fetchLatestBlock, fetchBlockByNumber, filterBlockByToAccounts, getReceipt } from './utils.js'
import { web3, UNISWAP_ROUTER_ADDRESS, SUSHISWAP_ROUTER_ADDRESS, ONEINCH_ADDRESS } from './share'
import { processUniswapTransaction, processSushiswapTransaction, process1inchTransaction } from './transaction'

import logger from './common/logger'


var blockQueue = [] // not in order
var lastBlockNumber = 0; // monotonically increasing
var unfetchedBlocks = [] // monotonically increasing

console.log('connected...')

// process latest block
setInterval(async() => {
    var latestBlock = await fetchLatestBlock(web3);
    if (!latestBlock) return
    
    var number = parseInt(latestBlock.number)
    if (number > lastBlockNumber) {
        blockQueue.push(latestBlock)
        
        if (number > lastBlockNumber + 1 && number < lastBlockNumber + 100) {
            for (var i = lastBlockNumber + 1; i < number; ++i) {
                unfetchedBlocks.push(i)
            }
        }
        lastBlockNumber = number
    }
}, 4000)

// process unfetched
setInterval(async() => {
    if (unfetchedBlocks.length > 0) {
        var n = unfetchedBlocks[0]
        var block = await fetchBlockByNumber(web3, n)
        if (block) {
            unfetchedBlocks.shift() // dequeue
            blockQueue.push(block)
        }
    }
}, 1000)

// process tx
setInterval(async () => { 
    if (blockQueue.length > 0) {
        var block = blockQueue.shift()
        var txs = await filterBlockByToAccounts(web3, [SUSHISWAP_ROUTER_ADDRESS, UNISWAP_ROUTER_ADDRESS, ONEINCH_ADDRESS], block)
        if (txs && txs.length > 0) {
            logger.log(`found ${txs.length} txs in block ${block.number}`)
            for (let tx of txs) {
                if (!tx.input) continue
                try {
                    let receipt = await getReceipt(web3, tx.hash);
                    if (!receipt || !receipt.logs) continue
                    if (receipt && receipt.status) {
                        tx.logs = receipt.logs
                        tx.timestamp = block.timestamp
                        switch (tx.to.toLowerCase()) {
                            case UNISWAP_ROUTER_ADDRESS:
                                processUniswapTransaction(tx)
                                break
                            case SUSHISWAP_ROUTER_ADDRESS:
                                processSushiswapTransaction(tx)
                                break
                            case ONEINCH_ADDRESS:
                                process1inchTransaction(tx)
                                break
                            default:
                                break
                        }
                    }
                } catch (e) {
                    logger.log('[index.js] error', e)
                    continue
                }
            }
        }
    }
    
}, 2000)