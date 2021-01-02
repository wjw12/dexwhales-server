import Decoder from './decoder'
import { web3, ROUTER_ABI, FACTORY_ABI, FACTORY_ADDRESS, PAIR_ABI, ERC20_ABI, ONEINCH_ABI } from './share'


export const routerDecoder = new Decoder(ROUTER_ABI)
export const factoryDecoder = new Decoder(FACTORY_ABI)
export const pairDecoder = new Decoder(PAIR_ABI)
export const oneinchDecoder = new Decoder(ONEINCH_ABI)

var cachedContracts = {}

// only cache the basics
var cachedTokens = {}
var cachedPairs = {}

function _loadContract(abi, address) {
    address = address.toLowerCase()
    if (address in cachedContracts) {
        return cachedContracts[address]
    }
    else {
        var contract = new web3.eth.Contract(abi, address)
        cachedContracts[address] = contract
        return contract
    }
}

export async function readTokenBasic(address) {
    address = address.toLowerCase()
    if (address in cachedTokens) {
        return cachedTokens[address]
    }
    
    var contract = _loadContract(ERC20_ABI, address)
    var name = await contract.methods.name().call()
    var decimals = await contract.methods.decimals().call()
    var symbol = await contract.methods.symbol().call()
    var info = {name: name, decimals: parseInt(decimals), symbol: symbol}
    cachedTokens[address] = info
    return info
}

export async function readPairBasic(address) {
    address = address.toLowerCase()
    if (address in cachedPairs) {
        return cachedPairs[address]
    }
    
    var contract = _loadContract(PAIR_ABI, address)
    var token0 = await contract.methods.token0().call()
    var token1 = await contract.methods.token1().call()
    var info = {token0: token0, token1: token1}
    cachedPairs[address] = info
    return info
}

export function readCachedTokenBasic(address) {
    address = address.toLowerCase()
    return cachedTokens[address]
}

export function readCachedPairBasic(address) {
    address = address.toLowerCase()
    return cachedPairs[address]
}