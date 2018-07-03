let TokenPlayPayment = artifacts.require("./TokenPlayPayment.sol");
let EternalStorage = artifacts.require("./EternalStorage.sol");

module.exports = function(deployer) {
  deployer.deploy(TokenPlayPayment);
  deployer.deploy(EternalStorage, { overwrite: false });
};
