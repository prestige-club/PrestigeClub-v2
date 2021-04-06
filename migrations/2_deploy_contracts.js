const SafeMath = artifacts.require("SafeMath");
const PEthDex = artifacts.require("PEthDex");
const WETH = artifacts.require("WETH");

module.exports = async function(deployer, network) {
  // deployer.deploy(ConvertLib);
  // deployer.link(ConvertLib, MetaCoin);
  // deployer.deploy(MetaCoin);

  deployer.deploy(SafeMath);
  deployer.link(SafeMath, PEthDex);
  
  let weth_addr = ""

  if(network == "mumbai"){

    weth_addr = "0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa";

  }else if(["develop", "development", "local", "ganache"].includes(network)){

    await deployer.deploy(WETH);
    let we = await WETH.deployed(); 
    console.log("WETH: " + we.address)
    weth_addr = we.address;

  }else{
    throw "Network is not support from Migration 2";
  }

  await deployer.deploy(PEthDex, weth_addr);
};
