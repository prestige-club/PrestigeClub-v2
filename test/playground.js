const peths = artifacts.require("PEthDex");

function it2(x){}

contract('PEthDex', (accounts) => {
  it('Test Minting', async () => {
    const pethinstance = await peths.deployed();
    const balance = await pethinstance.balanceOf(accounts[0]);

    assert.equal(balance.valueOf(), 100000, "100000 wasn't in the first account");
  });

  it('Test Transfer', async () => {
    const peth = await peths.deployed();

    let success = await peth.transfer(accounts[1], 1000, {from: accounts[0]})
    // console.log(success.valueOf());
    // console.log(success.logs);
    // assert.equal(success.valueOf(), true)

    const balance0 = await peth.balanceOf(accounts[0]);
    const balance1 = await peth.balanceOf(accounts[1]);

    assert.equal(balance0.valueOf(), 99000, "99000 wasn't in the first account");
    assert.equal(balance1.valueOf(), 1000, "1000 wasn't in the second account");

  });

  it('Test Buying / Selling', async () => {
    const peth = await peths.deployed();

    await peth.buy({from: accounts[2], value: 10000})

    const balance = await peth.balanceOf(accounts[2]);
    assert.equal(balance.valueOf(), 10000, "10000 wasn't in the first account");

    let supply = await peth.totalSupply();
    assert.equal(supply.valueOf(), 110000);

    // const getBalance = (account, at) =>
    //   promisify(cb => web3.eth.getBalance(account, at, cb));

    // let prevbalance = await getBalance(accounts[2]);
    // console.log("Balance:")
    // console.log(prevbalance)
    await peth.sell(5000, {from: accounts[2]})

    supply = await peth.totalSupply();
    assert.equal(supply.valueOf(), 105000);

    const balance2 = await peth.balanceOf(accounts[2]);
    assert.equal(balance2.valueOf(), 5000, "5000 wasn't in the first account");

    // let newbalance = await getBalance(accounts[2]);
    // console.log(newbalance)
    // assert.equal(prevbalance - newbalance <= -5000, true);

  });

});


const promisify = (inner) =>
  new Promise((resolve, reject) =>
    inner((err, res) => {
      if (err) { reject(err) }
      resolve(res);
    })
  );