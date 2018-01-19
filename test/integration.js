
require('dotenv').config()
const { web3, parity } = require('../client/bridge-to-the-moon/util/web3s')
const getContracts = require('../client/bridge-to-the-moon/util/getContracts')

require('./helpers/chai').should()

describe('Integration!!', function () {
  this.timeout(5000)

  let bridge
  let contracts

  before(async () => {
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
