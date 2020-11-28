const ConvertLib = artifacts.require("ConvertLib");
const MetaCoin = artifacts.require("MetaCoin");
const SafeMath = artifacts.require("SafeMath");
const Context = artifacts.require("Context");
const PEthDex = artifacts.require("PEthDex");

module.exports = function(deployer) {
  // deployer.deploy(ConvertLib);
  // deployer.link(ConvertLib, MetaCoin);
  // deployer.deploy(MetaCoin);

  deployer.deploy(SafeMath)
  deployer.link(SafeMath, PEthDex)
  deployer.deploy(PEthDex)
};
