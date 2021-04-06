const BN = require("bn.js");
const { assert } = require("console");

const peths = artifacts.require("PEthDex");
const VAULT = artifacts.require("SimpleVault");
const WETH = artifacts.require("WETH");

function bn(some){
  return web3.utils.toBN(some);
}

contract('PEthDex', (accounts, network) => {

  it('Make WETH for Dex', async() => {
    const dex = await peths.deployed();
    const weth = await WETH.deployed();

    let eth = bn(web3.utils.toWei("1400", "ether"))
    await weth.deposit({value: eth});
    await weth.deposit({value: eth, from: accounts[1]});

    await weth.transfer(dex.address, eth);
    expect((await weth.balanceOf(dex.address)).toString()).equal(eth.toString(), "1400 should be in dex")

    await weth.approve(dex.address, web3.utils.toWei("300000", "ether"), {from: accounts[0]});
    await weth.approve(dex.address, web3.utils.toWei("300000", "ether"), {from: accounts[1]});
  })

  it('Test Buying / Selling', async () => {

    const peth = await peths.deployed();
    const weth = await WETH.deployed();

    let eth = bn(web3.utils.toWei("300", "ether"))
    await peth.buyPeth(eth, {from: accounts[1]})
    // console.log(res)
    // expect(res.toString()).equal(web3.utils.toWei("300", "ether").toString())
    let bal = await peth.balanceOf(accounts[1]);
    
    expect((bal).toString()).equal(web3.utils.toWei("240", "ether").toString())

    let balBefore = bn(await weth.balanceOf(accounts[1]));

    await peth.sellPeth(web3.utils.toWei("240", "ether"), {from: accounts[1]});

    let balAfter = bn(await weth.balanceOf(accounts[1]));
    console.log(balBefore.toString() + " " + balAfter.toString());
    expect(balAfter.sub(balBefore).toString()).equal(web3.utils.toWei((240 * 1.25).toString(), "ether").toString())

  });

  it("Test SimpleVault", async () => {

    let vault = VAULT.deployed();
    

  });

});