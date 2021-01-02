import gql from 'graphql-tag'

const TokenFields = `
  fragment TokenFields on Token {
    id
    name
    symbol
    derivedETH
    tradeVolume
    tradeVolumeUSD
    untrackedVolumeUSD
    totalLiquidity
    txCount
  }
`

export const TOKENS_TOP50 = gql`
  ${TokenFields}
  query tokens {
    tokens(first: 50, orderBy: tradeVolumeUSD, orderDirection: desc) {
      ...TokenFields
    }
  }
`

export const TOKENS_TOP10 = gql`
  ${TokenFields}
  query tokens {
    tokens(first: 50, orderBy: tradeVolumeUSD, orderDirection: desc) {
      ...TokenFields
    }
  }
`