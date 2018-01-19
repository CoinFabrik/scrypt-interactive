
const contract = require('truffle-contract')
const promisify = require('es6-promisify')
const path = require('path')
const readFile = promisify(require('fs').readFile)

const artifactDir = process.env.BTTM_ARTIFACT_DIR || '../../../build/contracts'
const artifactPath = (name) => path.resolve(__dirname, artifactDir, `${name}.json`)
const getArtifact = async (name) => JSON.parse(await readFile(artifactPath(name), 'utf8'))

module.exports = async ({ web3, parity }) => {
  const getContract = async (name, provider = web3.currentProvider) => {
    const AbstractContract = contract(await getArtifact(name))
    AbstractContract.setProvider(provider)
    return AbstractContract
  }

  const ClaimManager = await getContract('ClaimManager', web3.currentProvider)
  const ScryptVerifier = await getContract('ScryptVerifier')
  const ScryptRunner = await getContract('ScryptVerifier')
  // ^ this one contract is on the parity dev chain
  const DogeRelay = await getContract('DogeRelay')

  return {
    getContract,
    ClaimManager,
    ScryptVerifier,
    ScryptRunner,
    DogeRelay,
    at: ({
      claimManagerAddress,
      scryptVerifierAddress,
      scryptRunnerAddress,
      dogeRelayAddress
    }) => ({
      claimManager: ClaimManager.at(claimManagerAddress),
      scryptVerifier: ScryptVerifier.at(scryptVerifierAddress),
      scryptRunner: ScryptRunner.at(scryptRunnerAddress),
      dogeRelay: DogeRelay.at(dogeRelayAddress),
    }),
    deploy: async () => {
      console.log('1')
      const scryptVerifier = await ScryptVerifier.new()
      console.log('2')
      const claimManager = await ClaimManager.new(
        process.env.DOGE_RELAY_ADDRESS,
        scryptVerifier.address
      )
      console.log('3')
      const scryptRunner = await ScryptRunner.new()
      console.log('4')
      const dogeRelay = DogeRelay.at(process.env.DOGE_RELAY_ADDRESS)
      console.log('5')

      return {
        claimManager,
        scryptVerifier,
        scryptRunner,
        dogeRelay
      }
    }
  }
}