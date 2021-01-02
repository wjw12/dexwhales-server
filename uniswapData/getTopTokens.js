const fetch = require('node-fetch');
import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { HttpLink } from 'apollo-link-http'
import { TOKENS_CURRENT } from './queries'

const client = new ApolloClient({
  link: new HttpLink({
    uri: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2',
    fetch: fetch
  }),
  cache: new InMemoryCache()
  //shouldBatch: true,
})


export async function getTopTokens() {
    let result = await client.query({
          query: TOKENS_CURRENT,
    })
    return result.data.tokens // a list of token info
}