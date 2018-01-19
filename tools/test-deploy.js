require('dotenv').config()

const contract = require('truffle-contract')
const promisify = require('es6-promisify')
const path = require('path')
const readFile = promisify(require('fs').readFile)

const artifactDir = process.env.BTTM_ARTIFACT_DIR || '../build/contracts'
const artifactPath = (name) => path.resolve(__dirname, artifactDir, `${name}.json`)
const getArtifact = async (name) => JSON.parse(await readFile(artifactPath(name), 'utf8'))

const Web3 = require('web3')

Web3.providers.HttpProvider.prototype.sendAsync = Web3.providers.HttpProvider.prototype.send

const web3 = new Web3(new Web3.providers.HttpProvider(process.env.WEB3_HTTP_PROVIDER))
// const parity = new Web3(new Web3.providers.HttpProvider(process.env.WEB3_PARITY_PROVIDER, 2000))

// web3.eth.defaultAccount = process.env.OPERATOR_ADDRESS || web3.eth.defaultAccount || web3.eth.coinbase

const getContract = async (name, provider = web3.currentProvider) => {
  const AbstractContract = contract(await getArtifact(name))
  AbstractContract.setProvider(provider)
  return AbstractContract
}

const main = async () => {
  const ClaimManager = await getContract('ClaimManager', web3.currentProvider)

  console.log('start')
  try {
    await ClaimManager.new()
    console.log('done?')
  } catch (error) {
    console.log('what??')
    console.error(error)
    throw error
  }
  console.log('end')
}

process.on('unhandledRejection', (error, p) => {
  console.error('Unhandled Rejection at:', p, 'error:', error)
})

main()
  .then(console.log.bind(console))
  .catch(console.error.bind(console))
