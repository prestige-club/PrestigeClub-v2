const { Console } = require("console");
const { ethers } = require("ethers");
const { hasUncaughtExceptionCaptureCallback } = require("process");

const prestigeclub = artifacts.require("PrestigeClub");
const CakeClub = artifacts.require("CakeClub");
const CakeClone = artifacts.require("CakeClone");
const CakePool = artifacts.require("CakeVault2");
const CakeVault = artifacts.require("CakeVault");
const CakeVaultMock = artifacts.require("CakeVaultMock");
const ReversionContract = artifacts.require("ReversionContract");

contract("PrestigeClub", (accounts) => {

  it("ReversionContract Test", async function(){

    const vault = await CakeClub.deployed();
    const cake = await CakeClone.deployed();
    const vaultRef = await CakeVaultMock.deployed();

    const contract = await ReversionContract.new(vaultRef.address, cake.address, 170*24*60*60);
    await contract.transferOwnership(accounts[2])

    console.log("Reversion: " + contract.address)

    let ether = ethers.utils.parseEther("1")
    let ether101 = ether.mul(201)

    await contract.importUsers([accounts[0], accounts[1], "0x3beace27eb2a022a19d1ddc5b827c433e7a1eff3"], [ether, ether.mul(100), ether.mul(100)], {from: accounts[2]})
    await cake.mint(ether101, {from: accounts[2]})
    await cake.approve(contract.address, ether101, {from: accounts[2]})
    await contract.enterStaking(ether101, {from: accounts[2]})

    console.log((await cake.balanceOf(accounts[0])).toString())
    console.log((await cake.balanceOf(accounts[1])).toString())
    console.log((await cake.balanceOf(accounts[2])).toString())

    // await advanceBlockAtTime(10000)
    
    // await contract.withdrawRewards({from: accounts[0]})
    // await contract.withdrawRewards({from: accounts[1]})
    // await contract.payoutProvision({from: accounts[2]})

    // console.log((await cake.balanceOf(accounts[0])).toString())
    // console.log((await cake.balanceOf(accounts[1])).toString())
    // console.log((await cake.balanceOf(accounts[2])).toString())
    // console.log((await vaultRef.userInfo(0, contract.address)).toString())

    // await advanceBlockAtTime(10000)

    await web3.eth.sendTransaction({to: "0x3BeAce27eb2a022A19D1ddC5b827c433E7a1EFf3", from: accounts[9], value: ethers.utils.parseEther("10")})
    await contract.transferOwnership("0x3BeAce27eb2a022A19D1ddC5b827c433E7a1EFf3", {from: accounts[2]})

    let eth = ethers.utils.parseEther;

    //Prestige
    let prestige = await prestigeclub.deployed();
    let z = "0x0000000000000000000000000000000000000000"
    
    await prestige._import(["0xe6b1b029feDe0F74787bcA48F730146f8713Cc88", "0x3BeAce27eb2a022A19D1ddC5b827c433E7a1EFf3", "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", "0xCcd63970824546d0B4b8A1acE3dF4638B803cC1e"],
      [eth("1000"), eth("1000"), eth("100"), eth("100")],
      [z, "0xe6b1b029feDe0F74787bcA48F730146f8713Cc88", "0x3BeAce27eb2a022A19D1ddC5b827c433E7a1EFf3", "0xe6b1b029feDe0F74787bcA48F730146f8713Cc88"],
      1, [3, 2, 0, 0], [[eth("100"),0,eth("1100"),0,0], [eth("100"),0,0,0,0], [0,0,0,0,0], [0,0,0,0,0]]
      )

    await prestige.reCalculateImported(2, eth("1100"))
    await cake.mint(eth("1100"))
    await cake.transfer(vault.address, eth("1100"))
    await vault.initialInvest(eth("1100"))

    await prestige.transferOwnership("0x3BeAce27eb2a022A19D1ddC5b827c433E7a1EFf3")
    await vault.transferOwnership("0x3BeAce27eb2a022A19D1ddC5b827c433E7a1EFf3")

    await cake.mint(eth("1"), {from: accounts[3]})
    await cake.approve(prestige.address, eth("1"), {from: accounts[3]})
    await prestige.methods["recieve(uint112,address)"](eth("1"), "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", {from: accounts[3]})

  });

  it2("Caketest", async function(){

    console.log("Accounts[0]: " + accounts[0])

    const prestige = await prestigeclub.deployed();
    const vault = await CakeClub.deployed();
    // const cake = await IERC20.at("0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82");
    // const pool = await CakePool.at("0xa80240eb5d7e05d3f250cf000eec0891d00b51cc")
    // const vaultRef = await CakeVault.at("0x73feaa1ee314f8c655e354234017be2193c9e24e")
    const cake = await CakeClone.deployed();
    const vaultRef = await CakeVaultMock.deployed();

    //// if(((await cake.balanceOf("0xd46f7E32050f9B9A2416c9BB4E5b4296b890A911")).lt(web3.utils.toWei("10000", "ether")))){
      // await pool.withdraw(web3.utils.toWei("1000", "ether"), {from: "0xd46f7E32050f9B9A2416c9BB4E5b4296b890A911"})
    //// }

    let x = await cake.balanceOf("0xd46f7E32050f9B9A2416c9BB4E5b4296b890A911")
    console.log(x.toString())

    // await cake.transfer(accounts[0], web3.utils.toWei("1000", "ether"), {from: "0xd46f7E32050f9B9A2416c9BB4E5b4296b890A911"})
    cake.mint(web3.utils.toWei("1000", "ether"), {from: accounts[0]})
    await cake.approve(prestige.address, web3.utils.toWei("1000", "ether"), {from: accounts[0]})
    await prestige.recieve(web3.utils.toWei("1", "ether"), {from: accounts[0]})

    let userinfo = await vaultRef.userInfo(0, vault.address)
    console.log(JSON.stringify(userinfo));

    await advanceBlockAtTime(106400)

    let before = await cake.balanceOf(accounts[0])

    await vault.updateEstimation()

    x = await vaultRef.pendingCake(0, vault.address)
    console.log("Pending Cake:" + x.toString())

    await prestige.withdraw(web3.utils.toWei("0.001", "ether"), {from: accounts[0]})

    let user = await prestige.users(accounts[0])
    console.log("Payout: " + user["payout"].toString())

    let after = await cake.balanceOf(accounts[0])
    let pendingafter = await vaultRef.pendingCake(0, vault.address)

    console.log("Before / After:")
    console.log(before.toString())
    console.log(after.toString())

    let diff = after.sub(before).toString()
    console.log("Diff: " + diff + " should be roughly " + x.div(3).toString())

    expect(pendingafter.toString()).equal(0);

    expect(1).equal(2);
      
  })

})

function it2(a){}

const advanceBlockAtTime = (time) => {
    return new Promise((resolve, reject) => {
      web3.currentProvider.send(
        {
          jsonrpc: "2.0",
          method: "evm_increaseTime",
          params: [time],
          id: new Date().getTime(),
        },
        (err, _) => {
          if (err) {
            return reject(err);
          }
          if (!err) {
            web3.currentProvider.send({
              jsonrpc: '2.0', 
              method: 'evm_mine', 
              params: [], 
              id: new Date().getTime()
            }, (err2, _) => {
              (web3.eth.getBlock("latest")).then((res) => {
                // console.log(res)
                resolve(res);
              })

            })
          }
        }
      );
    });
};