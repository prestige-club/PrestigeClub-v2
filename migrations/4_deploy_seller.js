const PrestigeClub = artifacts.require("PrestigeClub");
const PrestigeClubCalculations = artifacts.require("PrestigeClubCalculations");
const SafeMath112 = artifacts.require("SafeMath112");
const PEthDex = artifacts.require("PEthDex");
const Seller = artifacts.require("AccountExchange");

module.exports = async function(deployer, network, accounts) {

  // deployer.then(function() {
  let dex = await PEthDex.deployed();
  console.log(dex.address);
  // }).then(function(dex) {
  deployer.link(PrestigeClubCalculations, PrestigeClub)
  deployer.link(SafeMath112, PrestigeClub)

  await deployer.deploy(PrestigeClub, dex.address)

  let pc = await PrestigeClub.deployed()

  await dex.setExchange(pc.address);

  await deployer.deploy(Seller, pc.address, {from: accounts[1]});

  console.log("PC: " + pc.address)
  console.log("Dex: " + dex.address)

  let seller = await Seller.deployed()
  console.log("Seller: " + seller.address);


  // PEthDex.deployed().then(function(dex) {
    // PrestigeClubCalculations.deployed().then((pc) => {

      // deployer.link(PrestigeClubCalculations, PrestigeClub)
      // deployer.link(SafeMath112, PrestigeClub)

      // deployer.deploy(PrestigeClub, dex.address)

      // deployer.deploy(Seller, PrestigeClub.address, {from: accounts[1]});
      // PrestigeClub.deployed().then(function(pc) {
        
  
        // console.log("PC: " + pc.address)
        // console.log("Dex: " + dex.address)
  
      // })

    // })
  // })

  // PrestigeClub.deployed().then(function(pc) {
  //   deployer.deploy(Seller, pc.address);
    // PrestigeClub.deployed().then(function(pc) {
      // dex.setExchange(pc.address);

      // console.log("PC: " + pc.address)
      // console.log("Dex: " + dex.address)

    // })
  // });
};
