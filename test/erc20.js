const dex = artifacts.require("PEthDex");
const WETH = artifacts.require("WETH");
const StableFormula = artifacts.require("StableFormula");

const increaseTime = function(duration) {
  const id = Date.now()

  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [duration],
      id: id,
    }, err1 => {
      if (err1) return reject(err1)

      web3.currentProvider.sendAsync({
        jsonrpc: '2.0',
        method: 'evm_mine',
        id: id+1,
      }, (err2, res) => {
        return err2 ? reject(err2) : resolve(res)
      })
    })
  })
}

contract('dex test', async (accounts) => {
	it("shoud init init with contract balance of 4000 tokens", async () => {
		let dexi = await dex.deployed();

		let bal = await dexi.balanceOf(accounts[0]);

		assert.equal(bal.toString(), "4000000000000000000000");
	})
	
	it("should buy tokens", async () => {
		let dexi = await dex.deployed();
		let weth = await WETH.deployed();
		let formula = await StableFormula.new();

		await dexi.setFormula(formula.address);

		var acc = accounts[1];
		
		await weth.deposit({from: acc, value: web3.utils.toWei("5500", "finney")});
		await weth.approve(dexi.address, web3.utils.toWei("5500", "finney"), {from: acc});
		await dexi.buyPeth(web3.utils.toWei("5500", "finney"), {from: acc});
		
		let tokenBal = await dexi.balanceOf(acc);

		assert.equal(tokenBal, web3.utils.toWei("5500", "finney"));
	})
	
	it("should block transferFrom", async () => {
		let dexi = await dex.deployed();
		
		try{
			await dexi.transferFrom(accounts[0], accounts[2], "3");
			assert(true, "");
		} catch(e) {
			return;
		}
		
		assert(false, "transfer is not blocked");
	})
	
	it("should block transfer", async () => {
		let dexi = await dex.deployed();
		
		try{
			await dexi.transfer(accounts[2], web3.utils.toWei("3500", "ether"), {from: accounts[1]});
			assert(true, "");
		} catch(e) {
			return;
		}
		
		assert(false, "transferFrom is not blocked");
	})
	
	it("should block approve", async () => {
		let ins = await dex.deployed();
		
		try{
			await ins.approve("0x123", "3");
			assert(true, "");
		} catch(e) {
			return;
		}
		
		assert(false, "approve is not blocked");
	})
	
	it("should withdraw tokens", async () => {
		let dexi = await dex.deployed();
		
		var acc = accounts[1];

		await dexi.approve(accounts[4], web3.utils.toWei("3500", "finney"), {from: acc})
		
		await dexi.transferFrom(acc, accounts[4], web3.utils.toWei("3500", "finney"), {from: accounts[4]});
		
		let bal = await dexi.balanceOf(accounts[4]);
		assert.equal(bal.valueOf(), web3.utils.toWei("3500", "finney"), "the withdraw didn't happen");

		let bal2 = await dexi.balanceOf(accounts[1]);
		assert.equal(bal2.valueOf(), web3.utils.toWei("2000", "finney"), "the withdraw didn't work on sender");
	})
	
	it("should transfer tokens", async () => {
		let dexi = await dex.deployed();
		
		var acc = accounts[1];
		var acc2 = accounts[2];
		
		let bal1 = await dexi.balanceOf(acc);
		
		let bal2 = await dexi.balanceOf(acc2);
		
		let wei = web3.utils.toWei("1000", "wei");
		await dexi.transfer(acc2, wei, {from: acc});
		
		let bal1_after = await dexi.balanceOf(acc);
		let bal2_after = await dexi.balanceOf(acc2);
		
		assert.equal(bal1.sub(web3.utils.toBN(wei)).valueOf().toString(), bal1_after.valueOf().toString(), "The transfer didn't happen");
		assert.equal(bal2.add(web3.utils.toBN(wei)).valueOf().toString(), bal2_after.valueOf().toString(), "The transfer didn't happen");
	})

	// it("should block minting", async () => {
		
	// 	let dexi = await dex.deployed();
		
	// 	try{
	// 		await dexi.mint(web3.utils.toWei("1", "ether"), {from: accounts[1]});
	// 		assert(true, "");
	// 	} catch(e) {

	// 		return;
	// 	}
		
	// 	assert(false, "transferFrom is not blocked");

	// })
})