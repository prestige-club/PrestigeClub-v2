const SafeMath = artifacts.require("SafeMath");
const PEthDex = artifacts.require("PEthDex");
const WETH = artifacts.require("WETH");

module.exports = async function(deployer, network, accounts) {
  // deployer.deploy(ConvertLib);
  // deployer.link(ConvertLib, MetaCoin);
  // deployer.deploy(MetaCoin);

  deployer.deploy(SafeMath);
  deployer.link(SafeMath, PEthDex);
  
  let weth_addr = ""

  if(network == "mumbai"){

    weth_addr = "0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa";

  }else if(["develop", "development", "local", "ganache", "gnache"].includes(network)){

    await deployer.deploy(WETH);
    let we = await WETH.deployed(); 
    console.log("WETH: " + we.address)
    weth_addr = we.address;

    // for(let i = 0 ; i < 5 ; i++){
    //   await we.deposit({value: web3.utils.toWei("10", "ether"), from: accounts[i]});
    // }

  }else if(network == "matic" || network == "matic-fork") {

    weth_addr = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";

  }else{
    console.log("Network is not support from Migration 2");
  }

  await deployer.deploy(PEthDex, weth_addr);

  if(["develop", "development", "local", "ganache"].includes(network)){
    (await PEthDex.deployed()).mintOwner(web3.utils.toWei("4000", "ether"));
  }
};
