const PrestigeClub = artifacts.require("PrestigeClub");
const PEthDex = artifacts.require("PEthDex");
const Seller = artifacts.require("AccountExchange");

module.exports = async function(deployer, network, accounts) {

    let pc = await PrestigeClub.deployed()
    await deployer.deploy(Seller, pc.address, {from: accounts[1]});

    let seller = await Seller.deployed()
    console.log("Seller: " + seller.address);

}