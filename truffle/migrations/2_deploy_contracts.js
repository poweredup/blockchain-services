let TurboPlayPayment = artifacts.require("./TurboPlayPayment.sol");
let EternalStorage = artifacts.require("./EternalStorage.sol");

module.exports = function(deployer) {
  deployer.deploy(TurboPlayPayment);
  deployer.deploy(EternalStorage, { overwrite: false });
};
