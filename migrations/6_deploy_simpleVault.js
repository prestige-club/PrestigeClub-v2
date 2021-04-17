const PEthDex = artifacts.require("PEthDex");
const Vault = artifacts.require("SimpleVault");
const WETH = artifacts.require("WETH");
const APYFormula = artifacts.require("APYFormula");

module.exports = async function(deployer, network, accounts) {

    // let dex = await PEthDex.deployed();
    let formula = await APYFormula.deployed();

    let usdc = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"; //Mainnet
    // let usdc = "0xe6b8a5CF854791412c1f6EFC7CAf629f5Df1c747"; //mumbai

    let weth = "";

    if(network == "mumbai"){

        weth = "0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa"; //mumbai

    }else if(["develop", "development", "local", "ganache", "gnache"].includes(network)){

        let w = await WETH.deployed();
        weth = w.address;

    }else if(network == "matic" || network == "matic-fork") {

        weth_addr = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";
    
    }else{
        console.log("Bad")
    }

    // let weth = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619" //mainnet
    
    await deployer.deploy(Vault, weth, usdc);
    let vault = await Vault.deployed();

    console.log("Vault: " + vault.address);
    // vault.addEthLocked(web3.utils.toWei("3600", "ether"))
    formula.addVault(vault.address);

}