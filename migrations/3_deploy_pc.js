const PrestigeClub = artifacts.require("PrestigeClub");
const SafeMath112 = artifacts.require("SafeMath112");
const PEthDex = artifacts.require("PEthDex");

module.exports = function(deployer) {

  deployer.deploy(SafeMath112)
  deployer.link(SafeMath112, PrestigeClub)

  PEthDex.deployed().then(function(dex) {
    deployer.deploy(PrestigeClub, dex.address);
    // PrestigeClub.deployed().then(function(pc) {
      // dex.setExchange(pc.address);

      // console.log("PC: " + pc.address)
      // console.log("Dex: " + dex.address)

    // })
  });
};
