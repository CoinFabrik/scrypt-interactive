
require('dotenv').config()
const { web3, parity } = require('../client/bridge-to-the-moon/util/web3s')
const getContracts = require('../client/bridge-to-the-moon/util/getContracts')

require('./helpers/chai').should()

describe('Integration!!', function () {
  this.timeout(5000)

  let bridge
  let contracts

  before(async () => {
    console.log('ok')

    const Web3 = require('web3')
    Web3.providers.HttpProvider.prototype.sendAsync = Web3.providers.HttpProvider.prototype.send

    const provider = new Web3.providers.HttpProvider(process.env.WEB3_HTTP_PROVIDER)

    const web3 = new Web3(provider)
    const contract = require('truffle-contract')
    const promisify = require('es6-promisify')
    const path = require('path')
    const readFile = promisify(require('fs').readFile)

    const artifactDir = '../build/contracts'
    const artifactPath = (name) => path.resolve(__dirname, artifactDir, `${name}.json`)
    const getArtifact = async (name) => JSON.parse(await readFile(artifactPath(name), 'utf8'))

    const ScryptVerifier = contract(await getArtifact('ScryptVerifier'))
    ScryptVerifier.setProvider(web3)
    await ScryptVerifier.new()

    console.log('done')
    contracts = await (await getContracts({ web3, parity })).deploy()
    process.env.SCRYPT_VERIFIER_ADDRESS = contracts.scryptVerifier.address
    process.env.SCRYPT_RUNNER_ADDRESS = contracts.scryptRunner.address
    process.env.CLAIM_MANAGER_ADDRESS = contracts.claimManager.address

    bridge = await require('../client/bridge-to-the-moon')({ web3, parity })
    // spin up parity
    // spin up ganache-cli

    // set addresses in ENV
  })

  after(async () => {
    // teardown processes
  })

  describe('ClaimManager', () => {
    it('does stuff', async () => {
      (await bridge.api.getDeposit('0x0'))
        .should.be.bignumber.equal(0)
      // test deposit CRUD
      // test monitorClaim and then run through the entire flow
    })
  })
})
