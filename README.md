# DEX Whales Server

Node.js server for retrieving, parsing and storing transaction data from Ethereum blockchain.

## Available scripts

### `npm run start`

Run the server in production mode.

### `npm run debugStart`

Run the server in debug mode. Console logs will be printed. Transaction data will be sent to debugging databases instead of production ones.

### `jest`

Run all tests.

## Environment variables

An `.env` file containing environment variables must be placed in the root directory of this project. The following variables must be set.

- RPC_URL: JSON RPC for making requests to query the blockchain.
- AWS_KEY_ID: For connecting with DynamoDB, ElastiCache Redis cluster and CloudWatch logging service
- AWS_KEY_SECRET
- LOG_GROUP: Name of log group in AWS CloudWatch
- LOG_STREAM: Prefix name of log streams in AWS CloudWatch. Every time the server starts, it creates a new log stream with a name in the format of `{LOG_STREAM}+{date}+{4 random digits}` under the same log group


## Server architecture

The server communicates with multiple AWS and third-party services.

1. There are 2 tables in DynamoDB storing large transactions (dollar value > 10000 USD) and whale transactions (dollar value > 30000 USD, actual threshold depends on the type of tokens)

2. A Redis cluster hosted on ElastiCache is used for storing recent (within 24 hours) whale activities in memory, that allows the API service to quickly read from.

3. A Lambda function service handles API requests from the frontend. Visit https://github.com/wjw12/dexwhales-lambda for details

4. The server queries Ethereum blockchain through JSON RPC calls at a high frequency ~30 times/second. This is best handled by a self-hosted Eth node. Using commercial services like Infura or Alchemy can be expensive.

## Configurations
Several conditions are applied to determine whether or not to report a whale transaction. In general, the threshold for more popular (mainstream) token pairs is higher. Plus, swapping between stablecoins is not counted no matter how large the size is.

1. Tokens are classified by 3 tiers in `tokenList.js`. Tier 1: Most widely used stablecoins, WETH, WBTC and a few DeFi tokens with highest cumulative volume on Uniswap. Tier 2: Top 50 (trading volume) tokens of Uniswap and Top 10 tokens of Sushiswap. Tier 3: Any other tokens.

2. The whale thresholds for all tiers are defined in `const.js`. For swapping between two Tier 1 tokens, use the high threshold. For swapping between Tier 2 tokens with Tier 1/2, use the medium threshold. For any other trades (that involves Tier 3 tokens) use the low threshold.

3. Trade between USD-pegged stablecoins, and bridged versions of BTC, are ignored as defined in `coinlist.js`. Normally these trades are not interesting to our users.
