const ethSettings = require('./ethSettings.json');
exports.port = process.env.PORT || 3000;
exports.mongodb = {
  uri: process.env.MONGODB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost:27017/tokenplay'
};
exports.web3Provider = process.env.WEB3_PROVIDER || ethSettings.ROPSTEN_URL;
exports.web3WsProvider = process.env.WEB3_WS_PROVIDER || 'wss://ropsten.infura.io/ws';
exports.jwtKey = process.env.JWT_KEY || 'cryp706r4phy';
exports.mnemonic = process.env.mnemonic || ethSettings.MNEMONIC;
const networkId = process.env.NETWORK_ID || 1;
exports.paymentContractAddress = require('./truffle/build/contracts/TokenPlayPayment.json').networks[networkId].address;
exports.storageContractAddress = require('./truffle/build/contracts/EternalStorage.json').networks[networkId].address;
exports.gasLimit = process.env.GAS_LIMIT || 1000000;
