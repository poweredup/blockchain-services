'use strict';

const user = require('./services/user');
const game = require('./services/game');

exports = module.exports = function(app) {
  return {
    signUpUser: (username, email, password, callback) => user.signup(username, email, password, callback, app),
    registerGame: (jwt, gameObj, callback) => game.register(jwt, gameObj, callback, app),
    getOwnedGames: (jwt, page, limit, callback) => game.getOwned(jwt, page, limit, callback, app),
    verifyGameOwner: (username, tokenId, callback) => game.verifyGameOwner(username, tokenId, callback, app),
    getGames: (page, limit, callback) => game.get(page, limit, callback, app),
    buyGame: (jwt, gameId, callback) => game.buy(jwt, gameId, callback, app),
    getGameOrder: (jwt, orderId, callback) => game.getOrder(jwt, orderId, callback, app),
    setPrice: (jwt, gameId, price, callback) => game.setPrice(jwt, gameId, price, callback, app),
    acceptGameOrder: (jwt, orderId, callback) => game.acceptGameOrder(jwt, orderId, callback, app),
    login: (username, password, callback) => user.login(username, password, callback, app),
    setAccount: (jwt, firstName, lastName, callback) => user.setAccount(jwt, firstName, lastName, callback, app),
    getAccount: (jwt, callback) => user.getAccount(jwt, callback, app),
    getAccountBalance: (jwt, callback) => user.getAccountBalance(jwt, callback, app),
    transferFunds: (jwt, destAddress, amount, callback) => user.transferFunds(jwt, destAddress, amount, callback, app),
    getErrorLog: (jwt, page, limit, callback) => user.getErrorLog(jwt, page, limit, callback, app)
  };
};
