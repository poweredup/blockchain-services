const jayson = require('jayson');
const mongoose = require('mongoose');
const cors = require('cors');
const connect = require('connect');
const jsonParser = require('body-parser').json;
const Web3 = require('web3');
const config = require('./config');
const HDWalletProvider = require('truffle-hdwallet-provider');
const app = connect();

app.utility = {};
app.utility.websocket = require('./util/websocket');
app.utility.workflow = require('./util/workflow');
app.utility.jwt = require('./util/jwt');

app.db = mongoose.createConnection(config.mongodb.uri);
app.db.on('error', console.error.bind(console, 'mongoose connection error: '));
app.db.once('open', function() {
  console.log('Mongo connected successfully');
});

//config data models
require('./models')(app.db, mongoose);

app.wallet = new HDWalletProvider(config.mnemonic, config.web3Provider);
app.web3 = new Web3(app.wallet);
app.tokenPlayPayment = new app.web3.eth.Contract(
  require('./truffle/build/contracts/TokenPlayPayment.json').abi,
  config.paymentContractAddress
);
app.utility.txQueue = require('./util/transactionQueue')(app.web3);
require('./util/updateContract')(app);

console.log(`
  Web3 Provider: ${config.web3Provider}
  Web3 WS Provider: ${config.web3WsProvider}
  Contract Address: ${config.paymentContractAddress}
  Storage Address: ${config.storageContractAddress}
  Contract Owner: ${app.wallet.addresses[0]}
`);

// collect: false, use named parameters instead of arg array
const jaysonOptions = {
  collect: false
};
const server = jayson.server(require('./methods')(app), jaysonOptions);

app.use(cors({ methods: ['POST'] }));
app.use(jsonParser());
app.use(server.middleware());

app.listen(config.port);
process.on('unhandledRejection', err => {
  console.log(err);
});
process.on('uncaughtException', err => {
  console.log(err);
});
