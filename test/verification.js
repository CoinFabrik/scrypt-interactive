
const tape = require('tape')
const spawn = require('tape-spawn')
const process = require('process')
const color = require('colors')
const child_process = require('child_process')

const compiler = require('./helpers/compiler')
const util = require('./helpers/util')
const random = require('./helpers/random')

console.log("Compiling contracts...".green)
compiler.compile()

const web3 = util.web3;

var contractAddr_dogeRelay = 0
var contractAddr_runner = 0
var contractAddr_verifier = 0
var contractAddr_claimManager = 0

var expectations = {
    0: [
        "0x3c268302673baaf8870141b9f4794454d2205c8f4074876a845d4df804bf55f",
        "0x62f06b94b13667ab93881eaeee5bdf4e803b452cc81928c314fe8160e1ecbb4f",
        "0xd97d406e33f717cad5950a7e6bdb7efbd171aa0dd30a1e448c33f791cf8c2016",
        "0x8e5bfa6d8e22bf3f240a4fc063e1f5b100728f046756d669cee62bb872154b45"
    ],
    1: [
        "0xafd217fb5feb256ef297b38bfaa3b6ab11bc21149568a18bf91dac87db4e7a83",
        "0x6458f3f41a9147b9abb7535fccca15de735fbc7b1bfeacfd3597600e12c08012",
        "0xc5a9f7db6589b26e8ab04ddd707892ceff0cf3e1ed5432b837540d6d1946952e",
        "0x396ffd44dfb9444c8adb64caffd9dd922d6542dae17db75ed82bf38bf3b91b78"
    ],
    1024: [
        "0x1c62770d44a4eeb47f01de7e65c8f43b026c637cf208dd6013a3f9df6e6ded0a",
        "0xe7b7ae5b8deaa9d9a147775886b0d31cfc7af04a27662405de9554aa06b1800b",
        "0x28c68c4b78f4b4fad370f4b662d9e7bc01fcecf2b6d9545714b909f272fe49b5",
        "0xc19f7ed077ec236a0721b6fe7abc9369ade9d7d7b60d22bbbe0baf8699c09472"
    ],
    1025: [
        "0xfaf12052158160f6a7255bc1689a6cc5bd8bc953ebddf8bbe645157d479119b9",
        "0xf5d793693d8f7c2840341db0abb693c2e562bae33883c731b1d9170436b2a5c1",
        "0xf92d1f40b7a4f75f121568fe96389755f8b689a05082e084cc8e6b70eb0ec1d3",
        "0x799d0314cfc8962dab57508b04f6d94e73b554c3d1a6bd0bb7c404fcc08b1133"
    ],
    2048: [
        "0x3f3d915849eba08428ac85aa72f9159d4a406afc43a598789d32110ff4d0bc40",
        "0x3959831424f3546318d09292760cc19bd6a7559f4bd603470c16c61b45398fa",
        "0x9e17c9061d1313a0a0998c7664d5588f13c9040cb4aa942702ff75c460e92145",
        "0x28b3b2ce855bea481cd966c078c062a715e2897e7c144e15c05dfd52e3bb7cdb"
    ]
}

async function testStepValues(runner, verifier, account) {
    console.log("testing step values:".green)
    var input = '0x5858585858585858585858585858585858585858585858585858585858585858585858585858585858585858585858585858585858585858585858585858585858585858585858585858585858585858'
    for (var i of [0, 1, 1024, 1025, 2048]) {
        var result = await runner.methods.run(input, i).call({
            from: account
        })
        for (var j = 0; j < 4; j++) {
            if (expectations[i][j] != web3.utils.numberToHex(result.vars[j])) {
                console.log(("Invalid internal state at step " + i).red)
                console.log(web3.utils.numberToHex(result.vars[0]))
                console.log(web3.utils.numberToHex(result.vars[1]))
                console.log(web3.utils.numberToHex(result.vars[2]))
                console.log(web3.utils.numberToHex(result.vars[3]))
                error = true
            }
        }
    }
    result = await runner.methods.run(input, 2049).call({from: account})
    if (result.output != "0xda26bdbab79be8f5162c4ca87cc52d6f926fb21461b9fb1c88bf19180cb5c246") {
        console.log("Invalid result after step 2049: ".red + result.output)
        anyError = true
    }
}

async function runProverVerifierCombination(prover, verifier, account, step, input)
{
    var state = (await prover.methods.getStateAndProof(input, step).call({from: account})).state;
    var postData = (await prover.methods.getStateAndProof(input, step + 1).call({from: account}))
    return await verifier.methods.verifyStep(step, state, postData.state, postData.proof || '0x00').call({from: account});
}

/// This tests the prover-verifier-combination on same steps for a specific input.
async function testProverVerifierCombination(runner, verifier, account, input) {
    console.log(("Testing prover verifier combination on " + input + "...").green)
    for (var step of [0, 1, 2, 3, 100, 106, 1021, 1023, 1024, 1025, 1026, 2000, 2044, 2045, 2046, 2047, 2048, 2049]) {
        if (await runProverVerifierCombination(runner, verifier, account, step, input) !== true) {
            console.log(("Error verifying step " + step).red)
            anyError = true;
        }
    }
}

// This flips a random nibble in the proof or state.
async function testRandomManipulatedProverVerifierCombination(prover, verifier, account)
{
    var input = random.randomHexString()
    var step = chooseRandomly([0, 1, 2, 78, 79, 1020, 1022, 1023, 1024, 1025, 1026, 2047, 2048, 2049])
    console.log(("Random manipulation test on step " + step).cyan)
    var preState = (await prover.methods.getStateAndProof(input, step).call({from: account})).state;
    var postData = (await prover.methods.getStateAndProof(input, step + 1).call({from: account}))
    var postState = postData.state;
    var proof = postData.proof || '0x00';

    var correctData = '';
    var which = random.randomInt(3);
    if (which == 0) {
        correctData = preState
        preState = flipRandomNibble(preState);
    } else if (which == 1 || step == 0 /* proof is unused in step 0 */) {
        correctData = postState
        postState = flipRandomNibble(postState);
    } else {
        correctData = proof
        proof = flipRandomNibble(proof);
    }
    if ((await verifier.methods.verifyStep(step, preState, postState, proof).call({from: account})) !== false) {
        console.log("Verification of manipulated data succeeded:".green)
        console.log("input: " + input)
        console.log("step: " + step)
        console.log("Manipulated part: " + ['pre state', 'post state', 'proof'][which])
        console.log("Original value: " + correctData)
        console.log("Modified data:")
        console.log("preState: " + preState)
        console.log("postState: " + postState)
        console.log("proof: " + proof)
        anyError = true
    }
}

/**
 * Class to retrieve some information from the blockchain, does not send transactions.
 */
function Info(account, prover, verifier) {
    this.getSession = async function(id) {
        return await verifier.methods.sessions(id).call({from: account})
    }
    this.getStateProofAndHash = async function(input, step) {
        return await prover.methods.getStateProofAndHash(input, step).call({from: account})
    }
}

function Claimant(interface, info) {
    var steps = 2050;
    var that = this;
    this.switchingPoint = 2051; // disabled at construction time
    this.switchedInput = '0x00'
    // TODO only respond to queries to own sessions
    function inputForStep(step, input) {
        return +step >= that.switchingPoint ? that.switchedInput : input
    }
    console.log("Registering events".yellow)
    interface.verifier.events.NewQuery(async function(err, event) {
        if (err) throw err
        console.log("Got NewQuery event...".yellow)
        var session = await info.getSession(event.returnValues.sessionId)
        console.log(("New query for session " + event.returnValues.sessionId + " at step " + session.medStep).yellow)
        if (session.medHash == "0x0000000000000000000000000000000000000000000000000000000000000000") {
            // Regular case
            var stateHash = (await info.getStateProofAndHash(inputForStep(session.medStep, session.input), session.medStep)).stateHash
            console.log(("Sending state hash: " + stateHash).yellow)
            await interface.verifier.methods.respond(event.returnValues.sessionId, session.medStep, stateHash).send({from: interface.account})
        } else {
            // Binary search is finished
            if (+session.highStep - session.lowStep != 1) {
                throw "Med hash set, but we are not in final step."
            }
            console.log("Binary search ended. Asking for verification of step ".yellow + session.lowStep)
            var preState = (await info.getStateProofAndHash(inputForStep(session.lowStep, session.input), session.lowStep)).state
            var postStateAndProof = await info.getStateProofAndHash(inputForStep(session.highStep, session.input), session.highStep)
            var postState = postStateAndProof.state
            var proof = postStateAndProof.proof || '0x00'
            console.log("... using\n   PreState:  ".yellow + preState + "\n   PostState: ".yellow + postState + "\n   Proof:    ".yellow + proof)
            await interface.verifier.methods.performStepVerification(
                event.returnValues.sessionId,
                preState, 
                postState,
                proof
            ).send({from: interface.account, gas: 1000000})
        }
    })
    this.claim = async function(input) {
        console.log("Claiming computation...".yellow)
        var output = (await info.getStateProofAndHash(inputForStep(steps, input), steps)).state
        console.log("with output ".yellow + output)
        var claimOut = await interface.verifier.methods.claimComputation(input, output, steps).send({from: interface.account, gas: 2000000})
        // console.log(claimOut)
    }
}

function Challenger(interface, info) {
    var steps = 2050;
    var that = this;
    this.switchingPoint = 2055 // disabled at construction time
    this.switchedInput = '0x00'
    console.log("Registering events".blue)
    function inputForStep(step, sessionInput) {
        return step >= that.switchingPoint ? that.switchedInput : sessionInput
    }
    interface.verifier.events.NewClaim(async function(err, event) {
        if (err) throw err
        console.log("Got NewClaim event...".blue)
        var session = await info.getSession(event.returnValues.sessionId)
        console.log(("New claim for session " + event.returnValues.sessionId).blue)
        var myOutput = (await info.getStateProofAndHash(inputForStep(steps, session.input), steps)).state
        console.log(("Claimed output: " + session.output).blue)
        console.log(("My output: " + myOutput).blue)
        if (myOutput != session.output) {
            console.log(("Challenging...").blue)
            await interface.verifier.methods.query(event.returnValues.sessionId, Math.floor(steps / 2)).send({from: interface.account})
        } else {
            console.log(("Will not challenge").blue)
        }
    })
    interface.verifier.events.NewResponse(async function(err, event) {
        if (err) throw err
        console.log("Got NewResponse event...".blue)
        var session = await info.getSession(event.returnValues.sessionId)
        console.log(("New response for session " + event.returnValues.sessionId).blue)
        var myStateHash = (await info.getStateProofAndHash(inputForStep(session.medStep, session.input), session.medStep)).stateHash
        console.log("Claimant responded with state hash ".blue + session.medHash + " - mine is ".blue + myStateHash)
        console.log("Current steps: ".blue + session.lowStep + " - ".blue + session.medStep + " - ".blue + session.highStep)
        var lowStep = +session.lowStep
        var medStep = +session.medStep
        var highStep = +session.highStep
        var step = 0
        if (session.medHash == myStateHash) {
            step = medStep + Math.floor((highStep - medStep) / 2)
        } else {
            step = lowStep + Math.floor((medStep - lowStep) / 2)
        }
        await interface.verifier.methods.query(event.returnValues.sessionId, step).send({from: interface.account})
    })
}

function createConvictionCallback(verifier, resolve) {
    verifier.events.ChallengerConvicted().on('data', function(event) {
        console.log("Challenger convicted for session ".greed + event.returnValues.sessionId)
        resolve(+event.returnValues.sessionId, true)
    })
    verifier.events.ClaimantConvicted().on('data', function(event) {
        console.log("Claimant convicted for session ".green + event.returnValues.sessionId)
        resolve(+event.returnValues.sessionId, false)
    })
}

async function testBinarySearchCheatingClaimant(runner, verifier, claimantAccount, challengerAccount, input) {
    var info = new Info(claimantAccount, runner, verifier)
    var claimantInterface = { account: claimantAccount, prover: runner, verifier: verifier }
    var challengerInterface = { account: challengerAccount, prover: runner, verifier: verifier }
    var claimant = new Claimant(claimantInterface, info)
    var challenger = new Challenger(challengerInterface, info)

    var game = {ended: null}
    createConvictionCallback(verifier, (sessionId, claimantWon) => {
        game.ended(claimantWon)
    })
    for (var i = 0; i < 5; i++) {
        claimant.switchingPoint = chooseRandomly([0, 1, 2, 78, 79, 1020, 1022, 1023, 1024, 1025, 1026, 2047, 2048, 2049])
        console.log((
            "---------------------------------\n" +
            "Testing binary search (cheating claimant at step " + claimant.switchingPoint + ") on " +
            input + "..."
        ).green)
        await claimant.claim(input)
        await new Promise(resolve => {
            var timeout = setTimeout(() => {
                console.log("ERROR: Timeout".red)
                anyErorr = true
                resolve()
            }, 200 * 1000)
            game.ended = (claimantWon) => {
                if (claimantWon) {
                    console.log("ERROR: Claimant won".red)
                    anyError = true
                } else {
                    console.log("Challenger won".green)
                }
                clearTimeout(timeout)
                resolve()
            }
        })
    }
}

async function testBinarySearchCheatingChallenger(runner, verifier, account, challengerAccount, input) {
    //console.log(("Testing binary search (cheating challenger) on " + input + "...").green)
    // TODO
}

async function test(_account) {
    var account = await util.setupAccount(_account)
    var runner = await util.deployContract(runnerCode, runnerABI, contractAddr_runner, account, 4000000, true, null)
    var verifier =  await util.deployContract(verifierCode, verifierABI, contractAddr_verifier, account, 4000000, true, null)
    await testStepValues(runner, verifier, account)
    var input = '0x5858585858585858585858585858585858585858585858585858585858585858585858585858585858585858585858585858585858585858585858585858585858585858585858585858585858585858'
    await testProverVerifierCombination(runner, verifier, account, input)
    console.log("Trying random input".green)
    for (var i = 0; i < 10; i++) {
        await testProverVerifierCombination(runner, verifier, account, random.randomHexString())
    }
    for (var i = 0; i < 50; i++) {
        await testRandomManipulatedProverVerifierCombination(runner, verifier, account)
    }
    var challengerAccount = await util.setupAccount()
    await testBinarySearchCheatingClaimant(runner, verifier, account, challengerAccount, random.randomHexString())
//    await testBinarySearchCheatingChallenger(runner, verifier, account, challengerAccount, randomHexString())
    process.exit(anyError ? 1 : 0)
}

var anyError = false
test()

