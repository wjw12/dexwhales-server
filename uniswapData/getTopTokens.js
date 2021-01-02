const fetch = require('node-fetch');
import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { HttpLink } from 'apollo-link-http'
import { TOKENS_TOP50, TOKENS_TOP10 } from './queries'

const client = new ApolloClient({
  link: new HttpLink({
    uri: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2',
    fetch: fetch
  }),
  cache: new InMemoryCache()
  //shouldBatch: true,
})

const clientSushi = new ApolloClient({
  link: new HttpLink({
    uri: 'https://api.thegraph.com/subgraphs/name/zippoxer/sushiswap-subgraph-fork',
    fetch: fetch
  }),
  cache: new InMemoryCache()
  //shouldBatch: true,
})


export async function getTopTokens() {
    let result = await client.query({
          query: TOKENS_TOP50,
    })
    
    let resultSushi = await clientSushi.query({
          query: TOKENS_TOP10,
    })
    
    
    return result.data.tokens.concat(resultSushi.data.tokens) // a list of token info
}