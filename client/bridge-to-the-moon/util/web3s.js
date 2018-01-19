const Web3 = require('web3')

Web3.providers.HttpProvider.prototype.sendAsync = Web3.providers.HttpProvider.prototype.send

const web3 = new Web3(new Web3.providers.HttpProvider(process.env.WEB3_HTTP_PROVIDER, 2000))
// const parity = new Web3(new Web3.providers.HttpProvider(process.env.WEB3_PARITY_PROVIDER, 2000))

web3.eth.defaultAccount = process.env.OPERATOR_ADDRESS || web3.eth.defaultAccount || web3.eth.coinbase

// parity.eth.defaultAccount = process.env.PARITY_UNLOCKED_ACCOUNT
// parity.personal.unlockAccount(parity.eth.defaultAccount, '')

module.exports = {
  web3,
  parity: web3
}