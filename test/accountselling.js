const { hasUncaughtExceptionCaptureCallback } = require("process");

const prestigeclub = artifacts.require("PrestigeClub");
const dex = artifacts.require("PEthDex");
const peth = artifacts.require("PEth");
const seller = artifacts.require("AccountExchange");

async function initContract(accounts){

    const contract = await prestigeclub.deployed();
    const dexC = await dex.deployed();

    await dexC.setExchange(contract.address);

    for(let i = 0 ; i < accounts.length ; i++){
        await dexC.buy({from: accounts[i], value: web3.utils.toWei("90", "ether")})
    }
    return [dexC, contract];
    
}
  
function bn(some){
    return web3.utils.toBN(some);
}


contract("PrestigeClub", (accounts) => {

    it("Selling Account Test", async function(){

        const [dexC, contract] = await initContract(accounts);

        const sell = await seller.new(contract.address);
        await contract.setSellingContract(sell.address);

        let min_deposit = bn("20000");
        let one_ether = bn(web3.utils.toWei("1", "ether")); //1000

        await contract.methods['recieve(uint112)'](one_ether.mul(bn(3)), {from: accounts[1]});

        await contract.methods["recieve(uint112,address)"](one_ether, accounts[1], {from: accounts[2]});
        
        await contract.methods["recieve(uint112,address)"](min_deposit, accounts[2], {from: accounts[3]});

        await increaseTime((100 * 60 * 100000));

        await sell.offer(one_ether, {from: accounts[2]})

        let balance2 = bn(await web3.eth.getBalance(accounts[2]))

        await sell.buy(accounts[2], {from: accounts[4], value: one_ether})

        let balance22 = bn(await web3.eth.getBalance(accounts[2]))

        let balance4 = await dexC.balanceOf(accounts[4])

        expect(balance22.toString()).equals(balance2.add(one_ether).toString());

        // console.log((await contract.users(accounts[4])).deposit.toString())
        // console.log((await contract.users(accounts[2])).deposit.toString())
        // console.log(await contract.users(accounts[4]))
        // console.log(await contract.users(accounts[2]))

        await contract.withdraw(bn(100000), {from: accounts[4]})

        let balance42 = await dexC.balanceOf(accounts[4])
        expect(balance42.toString()).equals(balance4.add(bn(95000)).toString());
    })

    it("Cancel Request", async function() {

        let one_ether = bn(web3.utils.toWei("1", "ether"));

        const contract = await prestigeclub.deployed();
        const dexC = await dex.deployed();

        const sell = await seller.deployed();

        await sell.request(accounts[4], {from: accounts[5], value: one_ether});

        console.log((await sell.indexOfRequest(accounts[4], accounts[5])).toString())
        console.log(await sell.getRequests(accounts[4]))
        let balance = bn(await web3.eth.getBalance(accounts[5]))

        await sell.cancelRequest(accounts[4], {from: accounts[5]});

        let requests = await sell.getRequests(accounts[4]);

        let balanceAfter = bn(await web3.eth.getBalance(accounts[5]))
        
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