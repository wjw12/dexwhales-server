export const fetchLatestBlock = async function (web3) {
    try {
        var block = await web3.eth.getBlock('latest', true); // full transactions
    } catch (e) { return null }
    return block;
}

export const fetchBlockByNumber = async function (web3, number) {
    try {
        var block = await web3.eth.getBlock(number, true); // full transactions
    } catch (e) { console.log('fetchBlockByNumber error', e);  return null }
    return block;
}

export const filterBlockByToAccounts = async function (web3, accounts, block) {
  for (var i = 0; i < accounts.length; i++) {
      accounts[i] = accounts[i].toLowerCase()
  }
  
  var txs = []
  if (block && block.transactions) {
      console.log('filter block number', block.number)
      for (let tx of block.transactions) {
          try {
              // var tx = await web3.eth.getTransaction(txHash);
              if (tx && tx.to && accounts.includes(tx.to.toLowerCase())) {
                  tx.to = tx.to.toLowerCase()
                  txs.push(tx)
              }
          }
          catch (e) { console.log('filterBlock error', e); }
      }
  }
  return txs;

}

export const getReceipt = async function(web3, txHash) {
    try {
        let receipt = await web3.eth.getTransactionReceipt(txHash);
        return receipt;
    }
    catch (e) { console.log('getReceipt error', e);  return null; }
}
