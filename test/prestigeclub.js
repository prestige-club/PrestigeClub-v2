// const { expect } = require("chai");
const { BigNumber, ethers } = require("ethers");
// const { ethers } = require("hardhat");
const prestigeclub = artifacts.require("PrestigeClub");
const dex = artifacts.require("PEthDex");
const peth = artifacts.require("PEth");
const WETH = artifacts.require("WETH");
const StableFormula = artifacts.require("StableFormula");
const BN = require("bn.js");

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function call(call) {
  let result = await call();
  console.log(result)
  return result;
}

async function initContract(accounts){

  const contract = await prestigeclub.deployed();
  const dexC = await dex.deployed();
  const formula = await StableFormula.new();
  const weth = await WETH.deployed();

  await dexC.setExchange(contract.address);
  await dexC.setFormula(formula.address);

  await weth.deposit({from: accounts[15], value: web3.utils.toWei("3000", "ether")})
  await weth.approve(dexC.address, web3.utils.toWei("3000", "ether"))
  await weth.transfer(dexC.address, web3.utils.toWei("400", "ether"), {from: accounts[15]})

  for(let i = 0 ; i < accounts.length / 2 ; i++){
    await weth.deposit({from: accounts[i], value: web3.utils.toWei("90", "ether")})
    await weth.approve(dexC.address, web3.utils.toWei("90", "ether"), {from: accounts[i]})
    await dexC.buyPeth(web3.utils.toWei("90", "ether"), {from: accounts[i]})
  }
  return [dexC, contract];
  
}

function bn(some){
  return web3.utils.toBN(some);
}

function getSigners(accounts, contract){
  return accounts.map(x => contract.connect(x));
}

function it2(x, y){}


contract("PrestigeClub", (accounts) => {

  it("Downlinebonustest 2", async function(){
    
    const [dexC, contract] = await initContract(accounts);

    let min_deposit = bn("20000");
    let one_ether = bn(web3.utils.toWei("1", "ether")); //1000
    let overrides_min = (acc) => {
        return {
            value: min_deposit,
            from: acc
        }
    }
    let overrides_max = (acc) => {
        return {
            value: one_ether,
            from: acc
        }
    }

    // let base_deposit = min_deposit.div(20).mul(19);
    let ether_deposit = one_ether;

    //1. Test normal downline without difference effect

    // let x = JSON.stringify(contract).substr(0, 10000);

    await contract.methods['recieve(uint112)'](one_ether.mul(bn(3)), {from: accounts[1]});

    await contract.methods["recieve(uint112,address)"](1000, accounts[1], {from: accounts[2]});
    
    await contract.methods["recieve(uint112,address)"](min_deposit, accounts[2], {from: accounts[3]});

    await contract.methods["recieve(uint112,address)"](one_ether, accounts[1], {from: accounts[4]});

    await contract.methods["recieve(uint112,address)"](one_ether, accounts[3], {from: accounts[5]});

    expect((await contract.getDownlinePayout(accounts[5])).toNumber()).equal(0);
    expect((await contract.getDownlinePayout(accounts[4])).toNumber()).equal(0);
    expect((await contract.getDownlinePayout(accounts[2])).toNumber()).equal(0);

    expect((await contract.getDownlinePayout(accounts[3])).toString()).equal((ether_deposit.div(bn(1000000)).mul(bn(100))).toString());

    let expected = (ether_deposit.mul(bn(160))).add(ether_deposit.mul(bn(260))).div(bn(1000000))
    expect((await contract.getDownlinePayout(accounts[1]))).satisfies(x => fluctuation(bn(expected), x, 0.9999));

    console.log(" --------------- \nPart2 ")
    let res = await contract.methods["recieve(uint112)"](one_ether.mul(bn(3)), {from: accounts[2]});

    expect((await contract.getDownlinePayout(accounts[3])).toString()).equal((ether_deposit.div(bn(1000000)).mul(bn(100))).toString());

    expected = (ether_deposit.mul(bn(160)).div(bn(1000000)))
    expect((await contract.getDownlinePayout(accounts[2]))).satisfies(x => fluctuation(bn(expected), x, 0.9999));

    expected = (ether_deposit.mul(bn(4 * 50))).add(ether_deposit.mul(bn(260))).div(bn(1000000))
    expect((await contract.getDownlinePayout(accounts[1]))).satisfies(x =>fluctuation(bn(expected), x, 0.9999));


  });
});

contract("PrestigeClub #2", (accounts) => {

  it("Downlinebonus test", async function(){
    
    const [dexC, contract] = await initContract(accounts);

    let one_ether = bn(web3.utils.toWei("40", "ether"));

    let base_deposit = one_ether;

    //1. Test normal downline without difference effect

    await contract.methods["triggerCalculation()"]();
    await contract.methods["triggerCalculation()"]();
    await contract.methods["recieve(uint112)"](one_ether, {from: accounts[1]});

    await contract.methods["recieve(uint112,address)"](one_ether, accounts[1], {from: accounts[2]});
    
    await contract.methods["recieve(uint112,address)"](one_ether, accounts[1], {from: accounts[3]});

    //await account4["recieve(address)"](accounts[2].address, overrides);

    await increaseTime((10 * 60));
    
    await contract.methods["recieve(uint112,address)"](one_ether, accounts[2], {from: accounts[4]});

    let poolsnum = 7;
    let downlinestage = 4;
    let downlinePercentage = 260

    let streamline = (base_deposit * 3) / 3 * 2
    console.log("Streamline: " + streamline)
    let poolpayout = (streamline / 1000000 * 130) 
    let interest = base_deposit / 1000 * (poolsnum > 3 ? 1.5 : 1);
    let downline = 2 * base_deposit / 1000000 * downlinePercentage;
    let expected = interest + (2 * base_deposit / 10000 * 5) + poolsnum * poolpayout + downline

    console.log("Expected: interest: " + interest + " directs " + 2 * (base_deposit / 10000 * 5) + " pool " + poolsnum * poolpayout + " down: " + downline)

    let userdata = await contract.users(accounts[1])
    expect(userdata.payout).satisfies(x => fluctuation(bn(expected), x, 0.99))

    expect(userdata.qualifiedPools.toNumber()).equal(poolsnum);
    expect(userdata.downlineBonus.toNumber()).equal(downlinestage);

    //2. Test Downline with difference

    await contract.methods["recieve(uint112,address)"](one_ether, accounts[2], {from: accounts[5]});

    await increaseTime((10 * 60));

    await contract.methods["recieve(uint112,address)"](one_ether, accounts[4], {from: accounts[6]});

    let userdata1 = await contract.users(accounts[1]);
    //let userdata2 = await account2.getUserData();

    let streamline1 = (base_deposit * 5) / 4 * 3 //5 bc of double entry of 4
    console.log("Streamline1: " + streamline1)
    let poolpayout1 = poolsnum * (streamline1 / 1000000 * 130) / 2
    let downline1 = (2 * base_deposit) / 1000000 * downlinePercentage
    let expected1 = expected + (interest + (2 * base_deposit / 10000 * 5) + poolpayout1 + downline1)
    console.log("Expected: interest: " + interest + " directs " + 2 * (base_deposit / 10000 * 5) + " pool " + poolpayout1 + " down: " + downline1)
    expect(userdata1.payout).satisfies(x => fluctuation(bn(expected1), x, 0.99))

    expect(userdata1.qualifiedPools.toNumber()).equal(poolsnum);
    expect(userdata1.downlineBonus.toNumber()).equal(downlinestage);

    for(let i = 1 ; i <= 6 ; i++){
      let info = await contract.users(accounts[i])
      console.log(i + ":")
      const v = {
        address: accounts[i],
        deposit: info.deposit.toString(),
        position: info.position,
        referer: info.referer,
        qualifiedPools: info.qualifiedPools,
        downlineBonus: info.downlineBonus};
      console.log(JSON.stringify(v))

      let volumes = (await contract.getDetailedUserInfos(accounts[i]))[1]
      console.log(volumes.map(x => x.toString()))

    }    


    //3. Test upgrade 2nd Level

  });

});

contract("PrestigeClub", (accounts) => {
  it("Simple basic test", async function() {

    const [dexC, contract] = await initContract(accounts);

    console.log("---- ")

    let one_ether = bn(web3.utils.toWei("0.001", "ether"));
    
    await contract.methods["triggerCalculation()"]();
    await contract.methods["triggerCalculation()"]();
    await contract.methods["recieve(uint112)"](one_ether, {from: accounts[1]});

    await increaseTime((10 * 60) - 5);

    await contract.methods["recieve(uint112,address)"](one_ether, accounts[1], {from: accounts[2]});

    let userdata = await contract.users(accounts[1])

    let base_deposit = one_ether;

    //Test Deposit Payout

    expect(userdata["deposit"].toString()).equal(base_deposit.toString());
    expect((await contract.users(accounts[2])).deposit.toString()).equal(base_deposit.toString());
    expect((await contract.users(accounts[1])).payout.toString()).equal((base_deposit / 10000 * 10).toString());

    await contract.methods["recieve(uint112,address)"](one_ether, accounts[1], {from: accounts[5]});
    await contract.methods["recieve(uint112,address)"](one_ether, accounts[2], {from: accounts[3]});

    await increaseTime((10 * 60) - 5);

    await contract.methods["triggerCalculation()"]();

    await increaseTime((10 * 60) - 5);

    await contract.methods["recieve(uint112,address)"](one_ether, accounts[3], {from: accounts[4]});

    //2 Days basic payout

    let totalUsers = 4;

    console.log(" --- ")
    //Expected:  2 * deposit / 1000  +  pool 2  + 1eth / 10000 * 5
    let streamline = (base_deposit * 4) / 4 * 3
    console.log("Streamline: " + streamline)
    let poolpayout = 3 * (streamline / 1000000 * 130) / 2 //1 day
    let interest = base_deposit / 10000 * 10;
    let downline = (base_deposit * 1) / 1000000 * 100;
    let expected = interest + (2 * base_deposit / 10000 * 5) + poolpayout + downline

    // console.log(await contract.states(2)["totalDeposits"])
    // console.log(await contract.states(1).totalDeposits)
    // console.log(((await contract.users(accounts[1])).qualifiedPools).toString())
    // console.log("Address " + accounts[1]);
    
    console.log("interest: " + interest + " directs " + 2 * (base_deposit / 10000 * 5) + " pool " + 2*poolpayout + " down " + downline)

    // let interest2 = (await contract.getInterestPayout(accounts[1])).toString()
    // let downline2 = (await contract.getDownlinePayout(accounts[1])).toString()
    // let poolPayout2 = (await contract.getPoolPayout(accounts[1], 1)).toString()
    // let directs2 = bn((await contract.users(accounts[1])).directSum).mul(bn(5)).div(bn(10000)).toString();
    // console.log("interest: " + interest + " directs " + directs2 + " pool " + poolPayout2 + " down " + downline2)

    expect((await contract.users(accounts[1])).payout).satisfies(x => fluctuation(bn((2 * expected + interest)), bn(x), 0.99));

  });

  it2("Test minting", async () => {

    const contract = await prestigeclub.deployed();
    const dexC = await dex.deployed();

    let userdata = await contract.users(accounts[1]);

    let payout = userdata["payout"];

    console.log(payout.toString());

    let balance = await dexC.balanceOf(accounts[1]);
    let balancePC = await dexC.balanceOf(contract.address);

    console.log(balance.toString())
    console.log(balancePC.toString())

    await increaseTime((10 * 60 * 100000) - 5);

    contract.withdraw(payout.mul(bn(90000 / 3)), {from: accounts[1]});

    let balance2 = await dexC.balanceOf(accounts[1]);
    let balancePC2 = await dexC.balanceOf(contract.address);

    console.log(balance2.toString())
    console.log(balancePC2.toString())

    expect(balancePC2.eq(balancePC)).equal(true)
    expect(balance2.gt(payout.add(balancePC))).equal(true)


  })
});


it2("PrestigeClub", (accounts) => {

  // it("SafeMath Test", async function(){
    
  //   const [accounts, contract] = await createContract("SafeMath104");

  //   let max = Math.pow(2, 104) - 1

  //   let res = await contract.add(max - 5, 100000);
  //   expect(res).equal(BigNumber.from(max))

  // })

  it2("Import Test", async function(){

    const accounts = await ethers.getSigners();
    
    const factory = await ethers.getContractFactory("PrestigeClub");
    const contract = await factory.deploy();

    let signers = getSigners(accounts, contract);

    let str = '[{"address":"0xb112581045f19d35b704724c871c60ADF6de277F","deposit":"30400000000000000000","position":1,"referer":"0x0000000000000000000000000000000000000000"},{"address":"0xDBd432Df8a6d098161df9DFB430E66A3920E7838","deposit":"110200000000000000000","position":2,"referer":"0xb112581045f19d35b704724c871c60ADF6de277F"},{"address":"0x1feE7972A98ADb1163521471f9342d7E6F39752d","deposit":"30400000000000000000","position":3,"referer":"0x0000000000000000000000000000000000000000"},{"address":"0x5a681BaB9fa658E4C24Ac7cA5F453cF4A14ff0eb","deposit":"42750000000000000000","position":4,"referer":"0xDBd432Df8a6d098161df9DFB430E66A3920E7838"},{"address":"0x406591bAf2BE52809168E538DAc20334d44a2222","deposit":"78850000000000000000","position":5,"referer":"0xDBd432Df8a6d098161df9DFB430E66A3920E7838"},{"address":"0x53Af92AE19b3B0FC245db937f646D71f099346aC","deposit":"1235000000000000000","position":6,"referer":"0xDBd432Df8a6d098161df9DFB430E66A3920E7838"},{"address":"0x39D9339c5F68Cf21f80d133bFbd5eBd3BdbB0947","deposit":"950000000000000000","position":7,"referer":"0xDBd432Df8a6d098161df9DFB430E66A3920E7838"},{"address":"0x7E203771B250a52774927760fe5F5430Dfa6d69E","deposit":"950000000000000000","position":8,"referer":"0x5a681BaB9fa658E4C24Ac7cA5F453cF4A14ff0eb"},{"address":"0x40483eCDd76853A5c9543a0Ad1300596bE1386D9","deposit":"3002000000000000000","position":9,"referer":"0xDBd432Df8a6d098161df9DFB430E66A3920E7838"},{"address":"0x2Fa9fC0F7120c625880bB4c7C3f3c65EA2D53dF8","deposit":"950000000000000000","position":10,"referer":"0xDBd432Df8a6d098161df9DFB430E66A3920E7838"},{"address":"0x866b653151806e0741069EcD974b7342887f26D4","deposit":"3800000000000000000","position":11,"referer":"0x7E203771B250a52774927760fe5F5430Dfa6d69E"},{"address":"0xaE3aC691b79753c1B28eA7f842420909164b7DAD","deposit":"42750000000000000000","position":12,"referer":"0x1feE7972A98ADb1163521471f9342d7E6F39752d"},{"address":"0x1C60338E5E01f50731e5C0cCF3976bc5182A6b28","deposit":"1092500000000000000","position":13,"referer":"0x1feE7972A98ADb1163521471f9342d7E6F39752d"},{"address":"0xB685e659Ad5dfF5e53bd57A9bd99B208c9B60865","deposit":"15200000000000000000","position":14,"referer":"0xb112581045f19d35b704724c871c60ADF6de277F"},{"address":"0x39E961793B2f6340b33DB30B51a2fA3739C9b6A5","deposit":"950000000000000000","position":15,"referer":"0x40483eCDd76853A5c9543a0Ad1300596bE1386D9"},{"address":"0x97653B7B53375e0DA6f62F14D0899b35252DCD67","deposit":"950000000000000000","position":16,"referer":"0xDBd432Df8a6d098161df9DFB430E66A3920E7838"},{"address":"0x8A8A7Fe79AACcD069d1C6A142A50550D3782679A","deposit":"950000000000000000","position":17,"referer":"0xDBd432Df8a6d098161df9DFB430E66A3920E7838"},{"address":"0x5fe51877F1037000126df64A4df4c6AB9f5CD54c","deposit":"950000000000000000","position":18,"referer":"0x0000000000000000000000000000000000000000"},{"address":"0xF2032C786BF642e935f682e27bfC3468757caFf4","deposit":"950000000000000000","position":19,"referer":"0x0000000000000000000000000000000000000000"},{"address":"0xe485dDDDb572581A73279082d25baa44c9A1a515","deposit":"3800000000000000000","position":20,"referer":"0x0000000000000000000000000000000000000000"},{"address":"0x35d4f7a90a442ACd13F7723AB3817bd6E6A16028","deposit":"13300000000000000000","position":21,"referer":"0xDBd432Df8a6d098161df9DFB430E66A3920E7838"},{"address":"0x348c90d8a64B359F6A8be2151E438Aa805dfbDDF","deposit":"950000000000000000","position":22,"referer":"0x0000000000000000000000000000000000000000"},{"address":"0x65082A7D36ec7641d7fC6944d1A2bD6D8Fbb987b","deposit":"950000000000000000","position":23,"referer":"0x40483eCDd76853A5c9543a0Ad1300596bE1386D9"},{"address":"0xCe73DdF86C90dCAf23aDB07E2301D7C4ad637Fb4","deposit":"2945000000000000000","position":24,"referer":"0x0000000000000000000000000000000000000000"},{"address":"0xcb83C4B63550C672c05dBb4d8564b494a658c12f","deposit":"3135000000000000000","position":25,"referer":"0x0000000000000000000000000000000000000000"},{"address":"0x271Ba625508D4935b5e57E2bEe532899014B8246","deposit":"3135000000000000000","position":26,"referer":"0x0000000000000000000000000000000000000000"},{"address":"0xA710653FaA82790ED35B244A8b3C76547a615dDf","deposit":"950000000000000000","position":27,"referer":"0x1feE7972A98ADb1163521471f9342d7E6F39752d"},{"address":"0x9dd04208F33C93BbC3107dd80eD0B5AEA1F476C3","deposit":"950000000000000000","position":28,"referer":"0x0000000000000000000000000000000000000000"},{"address":"0x2F3d78c6d380B8C259BD274F85D98b601EC1A68e","deposit":"950000000000000000","position":29,"referer":"0xDBd432Df8a6d098161df9DFB430E66A3920E7838"},{"address":"0x5a4520437A5a5Eca4eDCd202d2D2f27bb5DDb644","deposit":"950000000000000000","position":30,"referer":"0x1feE7972A98ADb1163521471f9342d7E6F39752d"},{"address":"0xFB6a4050C261BcC1a8D2291e6134E50B163F0BE0","deposit":"950000000000000000","position":31,"referer":"0xDBd432Df8a6d098161df9DFB430E66A3920E7838"},{"address":"0xcD8B0683861B0294A1de4d5542c38754744B16A6","deposit":"18335000000000000000","position":32,"referer":"0x1feE7972A98ADb1163521471f9342d7E6F39752d"},{"address":"0xd22541a98dbD72bf00aE66aE823F49BbdF247Fad","deposit":"950000000000000000","position":33,"referer":"0x35d4f7a90a442ACd13F7723AB3817bd6E6A16028"},{"address":"0x1c5169e7E542eA400E3D0Bd372CdaCf5946bb2e4","deposit":"3705000000000000000","position":34,"referer":"0x1C60338E5E01f50731e5C0cCF3976bc5182A6b28"},{"address":"0xC7789d2a2C9Ed443AbcEF688ac70B79c6268437C","deposit":"1900000000000000000","position":35,"referer":"0x35d4f7a90a442ACd13F7723AB3817bd6E6A16028"},{"address":"0x4dbc6Fa7200Bf5b3fd7c49773899e603e8041B40","deposit":"28500000000000000000","position":36,"referer":"0xb112581045f19d35b704724c871c60ADF6de277F"},{"address":"0x5Ab2be2C9C065657489EBBe0275303C1d20301d4","deposit":"3057100000000000000","position":37,"referer":"0xDBd432Df8a6d098161df9DFB430E66A3920E7838"},{"address":"0xC53DCB722A64eEfa003899396D7B84f3798d506A","deposit":"950000000000000000","position":38,"referer":"0x0000000000000000000000000000000000000000"},{"address":"0x4C3549B9A0F8fc5669ECFC7D6B78EC43b641E710","deposit":"2099500000000000000","position":39,"referer":"0x1feE7972A98ADb1163521471f9342d7E6F39752d"},{"address":"0x648EcBb4BEcdcF75c97250793909222D08A1EB75","deposit":"950000000000000000","position":40,"referer":"0x5a681BaB9fa658E4C24Ac7cA5F453cF4A14ff0eb"},{"address":"0xA0C2E742F95d6C7d49e3Ca62465e1867C800183E","deposit":"2850000000000000000","position":41,"referer":"0x0000000000000000000000000000000000000000"},{"address":"0x2E601A6b20B6e10740f839d5e354261545e9e415","deposit":"2992500000000000000","position":42,"referer":"0x0000000000000000000000000000000000000000"},{"address":"0x9c1F4493172a658923F21C8307749b87830958d8","deposit":"3800000000000000000","position":43,"referer":"0x0000000000000000000000000000000000000000"},{"address":"0x8FC34225e017C6DFaaDE4a93675C17FB8cd641e9","deposit":"950000000000000000","position":44,"referer":"0x0000000000000000000000000000000000000000"},{"address":"0x589C858BB3DEB2a32D2f392e83a12568FCfBAFfB","deposit":"950000000000000000","position":45,"referer":"0x0000000000000000000000000000000000000000"},{"address":"0x6162dEa9539a98C573547C48DEFB3938F783B315","deposit":"950000000000000000","position":46,"referer":"0x5a681BaB9fa658E4C24Ac7cA5F453cF4A14ff0eb"},{"address":"0x3f39c32215B4D797045395f36F2aDf122AbF97B9","deposit":"1172490000000000000","position":47,"referer":"0x5a681BaB9fa658E4C24Ac7cA5F453cF4A14ff0eb"},{"address":"0xB1855382f6580eC28e1000cDD4bD2926d4f8dE3F","deposit":"950000000000000000","position":48,"referer":"0xDBd432Df8a6d098161df9DFB430E66A3920E7838"},{"address":"0x3e0E158ED1BfC55f47F3D8F81422F03aB42e3E7f","deposit":"1045000000000000000","position":49,"referer":"0x1feE7972A98ADb1163521471f9342d7E6F39752d"},{"address":"0x0B7afD4889e56795362a49C7E658a708838F5aEF","deposit":"997500000000000000","position":50,"referer":"0x0000000000000000000000000000000000000000"},{"address":"0x0F92a0c6A5478Cc1B26Bc096b8dC7d6ee4FC9a61","deposit":"3097000000000000000","position":51,"referer":"0x5a681BaB9fa658E4C24Ac7cA5F453cF4A14ff0eb"},{"address":"0x1f39A76d2d6b16f3874E52d4ff9Af85091d21608","deposit":"950000000000000000","position":52,"referer":"0x40483eCDd76853A5c9543a0Ad1300596bE1386D9"},{"address":"0x99cd72835BE08B721acf967C6Fa7B9690C904F19","deposit":"950000000000000000","position":53,"referer":"0xDBd432Df8a6d098161df9DFB430E66A3920E7838"},{"address":"0x2462f84F84841dE5fab1aC3a345687041510E2B8","deposit":"950000000000000000","position":54,"referer":"0x40483eCDd76853A5c9543a0Ad1300596bE1386D9"}]';

    let arr = JSON.parse(str)
    // console.log(arr)
    arr = arr.slice(0, 50).map(x => {
      x.deposit = ethers.BigNumber.from(x.deposit);
      return x
    })
    let addresses = arr.map(x => x.address)
    let referer = arr.map(x => x.referer)
    let deposit = arr.map(x => x.deposit)
    contract._import(addresses, deposit, referer).then(tx => {
      // console.log(tx)
    }).catch(err => console.log(err));

    expect((await signers[0].users("0xb112581045f19d35b704724c871c60ADF6de277F")).position).equals(1)
    expect((await signers[0].users("0xDBd432Df8a6d098161df9DFB430E66A3920E7838")).position).equals(2)

    await contract.triggerCalculation();
    await contract.triggerCalculation();
    await contract.reCalculateImported(0, 50);
    
    console.log(await signers[0].users("0xb112581045f19d35b704724c871c60ADF6de277F"))


  })
});

contract("PrestigeClub", (accounts) => {

  it2("Load Test", async function(){

    const [dexC, contract] = await initContract(accounts);

    let one_ether = bn(web3.utils.toWei("1", "ether"));
    
    await contract.methods["recieve(uint112)"](one_ether, {from: accounts[0]});
    console.log(accounts[0])
    await contract.methods["recieve(uint112,address)"](bn(10000), accounts[0], {from: accounts[1]});

    for(let i = 2 ; i < accounts.length / 3 ; i++){

      console.log("-- " + i + " --")
      console.log(accounts[i])

      await contract.methods["recieve(uint112,address)"](one_ether, accounts[i - 1], {from: accounts[i]});

      // console.log("Payout: " + (await contract.getDownlinePayout(accounts[1].address)).toString())
    }
    for(let i = 0 ; i < accounts.length / 3 ; i++){
      console.log("----");
      console.log("Stage: " + (await contract.users(accounts[i])).downlineBonus.toString())
      console.log("Stage: " + (await contract.getDownline(accounts[i])).toString())
      console.log("Payout: " + (await contract.getDownlinePayout(accounts[i])).toString())
      // console.log("Volume: " + (await accounts[i].getDownline())[0].toString())
    }

    console.log("Tested for " + accounts.length + " signers");

  });

});

Number.prototype.fluctuation = function(other, n){
  var min = other * n;
  var max = other * (1 + (1 - n));
  if(this > min && this < max){
    return true;
  }else{
    console.error("Expected " + this + ", got " + other);
    return false;
  }
}

BN.prototype.fluctuation = function(other, n){
  let other2 = other.div(bn(1000000));
  let this2 = this.div(bn(1000000));
  var min = other2 * n;
  var max = other2 * (1 + (1 - n));
  if(this2 > min && this2 < max){
    return true;
  }else{
    console.error("Expected " + this + ", got " + other);
    return false;
  }
}

fluctuation = function(expected, other, n){
  let other2 = other.div(bn(1000000)).toNumber();
  let this2 = expected.div(bn(1000000)).toNumber();
  var min = other2 * n;
  var max = other2 * (1 + (1 - n));
  if(this2 > min && this2 < max){
    return true;
  }else{
    console.error("Expected " + expected.valueOf() + ", got " + other.valueOf());
    return expected.toString() === other.toString();
  }
}

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