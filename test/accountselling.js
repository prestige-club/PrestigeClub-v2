const { hasUncaughtExceptionCaptureCallback } = require("process");

const prestigeclub = artifacts.require("PrestigeClub");
const dex = artifacts.require("PEthDex");
const peth = artifacts.require("PEth");
const seller = artifacts.require("AccountExchange");
const WETH = artifacts.require("WETH");

async function initContract(accounts){

    const contract = await prestigeclub.deployed();
    const dexC = await dex.deployed();
    const weth = await WETH.deployed();

    await dexC.setExchange(contract.address);

    await weth.deposit({from: accounts[0], value: web3.utils.toWei("3000", "ether")})
    await weth.approve(dexC.address, web3.utils.toWei("3000", "ether"))
    await weth.transfer(dexC.address, web3.utils.toWei("400", "ether"), {from: accounts[0]})

    for(let i = 0 ; i < accounts.length / 2 ; i++){
        await weth.deposit({from: accounts[i], value: web3.utils.toWei("120", "ether")})
        await weth.approve(dexC.address, web3.utils.toWei("1000", "ether"), {from: accounts[i]})
        await dexC.buyPeth(web3.utils.toWei("90", "ether"), {from: accounts[i]})
        console.log((await dexC.balanceOf(accounts[i])).toString())
    }
    return [dexC, contract, weth];
    
}
  
function bn(some){
    return web3.utils.toBN(some);
}


contract("PrestigeClub", (accounts) => {

    it("Selling Account Test", async function(){

        const [dexC, contract, weth] = await initContract(accounts);

        // const sell = await seller.new(contract.address);
        const sell = await seller.deployed();
        await contract.setSellingContract(sell.address);

        let min_deposit = bn(web3.utils.toWei("0.2", "ether"));
        let one_ether = bn(web3.utils.toWei("1", "ether")); //1000

        await contract.methods['recieve(uint112)'](one_ether.mul(bn(3)), {from: accounts[1]});

        await contract.methods["recieve(uint112,address)"](one_ether, accounts[1], {from: accounts[2]});
        
        await contract.methods["recieve(uint112,address)"](min_deposit, accounts[2], {from: accounts[3]});

        console.log((await sell.PCUserExists(accounts[2])).toString());

        await increaseTime((100 * 60 * 100000));

        await sell.offer(one_ether, {from: accounts[2]})

        let balance2 = bn(await weth.balanceOf(accounts[2]))

        await weth.approve(sell.address, one_ether, {from: accounts[4]});

        await sell.buy(accounts[2], one_ether, {from: accounts[4]})

        let balance22 = bn(await weth.balanceOf(accounts[2]))

        let balance4 = await dexC.balanceOf(accounts[4])

        expect(balance22.toString()).equals(balance2.add(one_ether).toString());

        // console.log((await contract.users(accounts[4])).deposit.toString())
        // console.log((await contract.users(accounts[2])).deposit.toString())
        // console.log(await contract.users(accounts[4]))
        // console.log(await contract.users(accounts[2]))

        await contract.withdraw(bn(100000), {from: accounts[4]})

        let balance42 = await dexC.balanceOf(accounts[4])
        expect(balance42.toString()).equals(balance4.add(bn(100000)).toString());
    })

    it("Cancel Request", async function() {

        let one_ether = bn(web3.utils.toWei("1", "ether"));

        const contract = await prestigeclub.deployed();
        const dexC = await dex.deployed();
        const weth = await WETH.deployed();

        const sell = await seller.deployed();

        await weth.approve(sell.address, one_ether, {from: accounts[5]});

        await sell.request(accounts[4], one_ether, {from: accounts[5]});

        console.log((await sell.indexOfRequest(accounts[4], accounts[5])).toString())
        console.log(await sell.getRequests(accounts[4]))
        let balance = bn(await weth.balanceOf(accounts[5]))

        await sell.cancelRequest(accounts[4], {from: accounts[5]});

        let requests = await sell.getRequests(accounts[4]);

        let balanceAfter = bn(await weth.balanceOf(accounts[5]))
        
        expect(balance.add(one_ether).gt(balanceAfter.sub(bn("10000000000000000")))).equals(true);
        
        expect(requests.length).equals(0);

        console.log(requests);

    })

})

const increaseTime = function(duration) {
    const id = Date.now()

    return new Promise((resolve, reject) => {
        web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        params: [duration],
        id: id,
        }, err1 => {
        if (err1) return reject(err1)

        web3.currentProvider.send({
            jsonrpc: '2.0',
            method: 'evm_mine',
            id: id+1,
        }, (err2, res) => {
            return err2 ? reject(err2) : resolve(res)
        })
        })
    })
}