const config = require('../config.js');

exports = module.exports = function(app) {
  app.db.models.ContractAddresses.findOne({}, {}, { sort: { 'created_at' : -1 } }).then((addresses) => {
    const paymentAddress = app.web3.utils.toChecksumAddress(config.paymentContractAddress);
    const storageAddress = app.web3.utils.toChecksumAddress(config.storageContractAddress);
    if (!addresses) {
      addresses = {};
    }
    if (addresses.paymentAddress !== paymentAddress || addresses.storageAddress !== storageAddress) {
      console.log('Updating contract addresses..');
      const eternalStorage = new app.web3.eth.Contract(
        require('../truffle/build/contracts/EternalStorage.json').abi,
        config.storageContractAddress
      );
      eternalStorage.methods
      .setCurrentTpAddress(paymentAddress)
      .send({ from: app.wallet.addresses[0], gas: config.gasLimit })
      .then(() => {
        console.log('Payment address in eternal updated');
        addresses.paymentAddress = paymentAddress;
        app.turboPlayPayment.methods
          .setStorageAddress(storageAddress)
          .send({ from: app.wallet.addresses[0], gas: config.gasLimit })
          .then(() => {
            console.log('Storage address in turboplay updated');
            addresses.storageAddress = storageAddress;
            if (addresses.save) {
              addresses.save().then((res) => {
                console.log('Addresses updated');
              }).catch((err) => {
                console.log('error saving new addresses');
              });
            } else {
              app.db.models.ContractAddresses.create(addresses).then((res) => {
                console.log('Addresses created');
              }).catch((err) => {
                console.log('error creating addresses document', err);
              });
            }
          }).catch((err) => {
            console.log('err updating storage address', err);
          });
      }).catch((err) => {
        console.log('err updating payment address in storage', err);
      });
    } else {
      console.log('Addresses up to date');
    }
  });
};