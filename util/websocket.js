module.exports = {
  createPaymentWs: () => {
    const Web3 = require('web3');
    const config = require('../config');
    const web3Ws = new Web3(new Web3.providers.WebsocketProvider(config.web3WsProvider));
    return new web3Ws.eth.Contract(require('../truffle/build/contracts/TurboPlayPayment.json').abi, config.paymentContractAddress);
  }
};
