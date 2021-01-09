const PrestigeClub = artifacts.require("PrestigeClub");
const PrestigeClubCalculations = artifacts.require("PrestigeClubCalculations");
const SafeMath112 = artifacts.require("SafeMath112");
// const PEthDex = artifacts.require("PEthDex");
// const Seller = artifacts.require("AccountExchange");

module.exports = function(deployer, network, accounts) {

  deployer.deploy(SafeMath112)//.then(() => {

  deployer.link(SafeMath112, PrestigeClubCalculations)
  deployer.deploy(PrestigeClubCalculations)


    // deployer.deploy(SafeMath112)//.then(() => {

    //   deployer.link(SafeMath112, PrestigeClubCalculations)
    //   deployer.link(SafeMath112, PrestigeClub)
    //   deployer.deploy(PrestigeClubCalculations)
      
    //   PrestigeClubCalculations.deployed().then(() => {

    //     deployer.link(PrestigeClubCalculations, PrestigeClub)

    //     PEthDex.deployed().then(function(dex) {

    //     deployer.deploy(PrestigeClub, dex.address).then(() => {
    
    //       // deployer.deploy(Seller, PrestigeClub.address, {from: accounts[1]});
    //       PrestigeClub.deployed().then(function(pc) {
    //         dex.setExchange(pc.address);
    
    //         deployer.deploy(Seller, pc.address, {from: accounts[1]}).then(() => {
    //           console.log("PrestigeClub: " + pc.address);
    //           console.log("Dex: " + dex.address);
    //           Seller.deployed().then(function(seller) {
    //             console.log("Seller: " + seller.address);
    //           })
    //         });
      
    //         // console.log("PC: " + pc.address)
    //         // console.log("Dex: " + dex.address)
      
    //       })
    //     });

    //   })

    // })
  // });

  // deployer.then(() => {
  //   return SafeMath112.new();
  // }).then((safemath) => {
  //   deployer.link(safemath, PrestigeClubCalculations)
  //   deployer.link(safemath, PrestigeClub)
  //   PrestigeClubCalculations.new();
  // }).then((pc) => {

  //   deployer.link(pc, PrestigeClub)

  //   PEthDex.deployed().then(function(dex) {

  //     deployer.deploy(PrestigeClub, dex.address);

  //     PrestigeClub.deployed().then(function(pc) {
  //       dex.setExchange(pc.address);

  //       deployer.deploy(Seller, pc.address, {from: accounts[1]}).then(() => {
  //         console.log("PrestigeClub: " + pc.address);
  //         console.log("Dex: " + dex.address);
  //         Seller.deployed().then(function(seller) {
  //           console.log("Seller: " + seller.address);
  //         })
  //       });

  //     })

  // });

  // })


};
