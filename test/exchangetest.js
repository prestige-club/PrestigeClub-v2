const BN = require("bn.js");
const { assert } = require("console");

const peths = artifacts.require("PEthDex");
const VAULT = artifacts.require("SimpleVault");
const WETH = artifacts.require("WETH");
const StableFormula = artifacts.require("StableFormula");

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
    // console.log(await peth.formula())
    // console.log(await peth.)
    let bal = await peth.balanceOf(accounts[1]);
    
    expect((bal).toString()).equal(web3.utils.toWei("240", "ether").toString())

    let balBefore = bn(await weth.balanceOf(accounts[1]));

    await peth.sellPeth(web3.utils.toWei("240", "ether"), {from: accounts[1]});

    let balAfter = bn(await weth.balanceOf(accounts[1]));
    console.log(balBefore.toString() + " " + balAfter.toString());
    expect(balAfter.sub(balBefore).toString()).equal(web3.utils.toWei((240 * 1.25).toString(), "ether").toString())

  });

  it("Test StableFormula", async () => {

    const formula = await StableFormula.new();
    const dex = await peths.deployed();
    const weth = await WETH.deployed();

    const e = web3.utils.toWei("10", "ether");
    await weth.deposit({value: e})
    await weth.approve(dex.address, e)
    // await weth.transfer(dex.address, e);
    await dex.setFormula(formula.address);

    expect((await dex.getAmountBuy(1000000000)).toNumber()).equal(1000000000)

    let peth1 = await dex.balanceOf(accounts[0]);
    let weth1 = await weth.balanceOf(accounts[0]);

    console.log((await dex.getAmountBuy(web3.utils.toWei("1", "ether"))).toString());
    console.log((await dex.getAmountSell(web3.utils.toWei("1", "ether"))).toString());
    await dex.buyPeth(e);

    let peth2 = await dex.balanceOf(accounts[0]);
    let weth2 = await weth.balanceOf(accounts[0]);
    
    expect(peth2.sub(peth1).toString()).equal(e.toString());
    expect(bn(weth1).sub(bn(weth2)).toString()).equal(e.toString());

    await dex.sellPeth(e);

    let peth3 = await dex.balanceOf(accounts[0]);
    let weth3 = await weth.balanceOf(accounts[0]);

    expect(peth1.toString()).equal(peth3.toString())
    expect(weth1.toString()).equal(weth3.toString())

  });

});