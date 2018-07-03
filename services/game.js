const config = require('../config');

exports.register = function(jwt, gameObj, callback, app) {
  const workflow = app.utility.workflow(callback, app);
  const gameId = parseInt(gameObj.id);

  if (!(typeof gameId === 'number') || gameId < 0 || gameId % 1 !== 0) {
    return workflow.emit('exception', 'game Id must be supplied as an unsigned integer (formatted in a string)');
  }

  try {
    const userId = app.utility.jwt.getIdFromToken(jwt);

    workflow.on('checkGameId', () => {
      app.db.models.Game.findOne({ gameId }, (err, game) => {
        if (err) {
          return workflow.emit('exception', err);
        }
        if (game) {
          return workflow.emit('exception', 'Game ID already registered!');
        }
        workflow.emit('verifyUser');
      });
    });

    workflow.on('verifyUser', () => {
      app.db.models.User.findOne({ _id: userId })
        .populate('account')
        .exec((err, user) => {
          // TODO: Check user for publisher rights
          if (err) {
            return workflow.emit('exception', err);
          }
          if (!user) {
            return workflow.emit('exception', 'invalid user');
          }
          workflow.emit('response', { message: 'Game registration processed!' });
          workflow.emit('registerPublisher', user);
        });
    });

    workflow.on('registerPublisher', user => {
      if (gameObj.price < 1) {
        gameObj.price = app.web3.utils.toWei(gameObj.price.toString(), 'ether');
      }
      const tx = {
        from: app.wallet.addresses[0],
        to: config.paymentContractAddress,
        gas: config.gasLimit,
        data: app.tokenPlayPayment.methods.addGameWithPrice(user.account.walletId, gameId, gameObj.price.toString()).encodeABI()
      };

      app.utility.txQueue
        .push(app.wallet.addresses[0], tx)
        .then(response => {
          console.log('Add game for publisher complete: '); //, response);
          workflow.emit('createGame');
        })
        .catch(err => {
          workflow.emit('logError', userId, 'error registering publisher to game', err);
        });
    });

    workflow.on('createGame', () => {
      gameObj.createdBy = userId;
      gameObj.gameId = gameObj.id;

      const game = new app.db.models.Game(gameObj);
      game.save((err, game) => {
        if (err) {
          workflow.emit('logError', userId, 'failed to save game to db', err);
        } else {
          console.log('game saved!'); //, game);
        }
      });
    });

    workflow.emit('checkGameId');
  } catch (error) {
    workflow.emit('exception', error);
  }
};

exports.get = function(page, limit, callback, app) {
  const workflow = app.utility.workflow(callback, app);

  workflow.on('getGames', () => {
    app.db.models.Game.pagedFind(
      {
        limit: limit ? limit : 20,
        page: page ? page : 1,
        sort: { _id: 1 }
      },
      (err, games) => {
        if (err) {
          return workflow.emit('exception', err);
        }
        workflow.emit('response', games);
      }
    );
  });

  workflow.emit('getGames');
};

exports.buy = function(jwt, gameId, callback, app) {
  const workflow = app.utility.workflow(callback, app);

  let tokenPlayPaymentWs;
  let userId;
  try {
    userId = app.utility.jwt.getIdFromToken(jwt);
  } catch (err) {
    return workflow.emit('exception', 'token expired or invalid');
  }
  workflow.on('getAddress', () => {
    console.log('Buy game initiated');
    console.log('Getting user account');
    app.utility.jwt
      .getWalletFromToken(jwt, app)
      .then(wallet => {
        if (!wallet) {
          return workflow.emit('exception', 'wallet not available');
        }
        workflow.emit('checkUserBalance', wallet);
      })
      .catch(err => workflow.emit('exception', err));
  });

  workflow.on('checkUserBalance', wallet => {
    console.log('Checking user account balance');
    app.db.models.Game.findOne({ gameId: gameId }, (err, game) => {
      if (err) {
        return workflow.emit('exception', err);
      }
      if (!game) {
        return workflow.emit('exception', 'game not found');
      }
      app.web3.eth
        .getBalance(wallet.walletId)
        .then(balance => {
          if (Number(balance) > Number(game.price)) {
            console.log('got balance');
            return workflow.emit('createPendingToken', game, wallet);
          }
          return workflow.emit('exception', 'insufficient funds');
        })
        .catch(err => {
          return workflow.emit('exception', err);
        });
    });
  });

  workflow.on('createPendingToken', (game, wallet) => {
    const pendingToken = new app.db.models.Token({
      user: userId,
      game: game._id,
      status: 'processing'
    })
      .save()
      .then(pendingToken => {
        console.log('pending token created');
        return workflow.emit('submitGameOrder', game, wallet, pendingToken);
      })
      .catch(err => {
        return workflow.emit('exception', err);
      });
  });

  workflow.on('submitGameOrder', (game, wallet, pendingToken) => {
    tokenPlayPaymentWs = app.utility.websocket.createPaymentWs();
    const tx = {
      from: wallet.walletId,
      to: config.paymentContractAddress,
      gas: config.gasLimit,
      value: game.price,
      data: app.tokenPlayPayment.methods.orderGameCopy(gameId).encodeABI()
    };
    console.log('Submitting game order ', tx);
    workflow.emit('response', { message: 'Game order processing.' });
    let txHash = new Promise((resolve, reject) => {
      app.utility.txQueue
        .push(wallet.walletId, tx, wallet.privateKey)
        .then(response => {
          resolve(response);
        })
        .catch(err => {
          reject(err);
        });
    });

    tokenPlayPaymentWs.events.GameCopyOrdered((err, event) => {
      if (err) {
        workflow.emit('logError', userId, 'Exception listening to GameCopyOrdered event', err);
      }
      txHash
        .then(response => {
          if (event.transactionHash === response.transactionHash) {
            console.log('id', event.returnValues.pendingOrderId);
            pendingToken.orderId = event.returnValues.pendingOrderId;
            pendingToken
              .save()
              .then(x => console.log('orderId saved to token', x))
              .catch(err => workflow.emit('logError', userId, 'error saving orderId to token', err));

            return acceptGameOrder(userId, event.returnValues.pendingOrderId, pendingToken, app);
          }
        })
        .catch(err => workflow.emit('logError', userId, 'error during GameCopyOrdered transaction', err));
    });
  });

  workflow.emit('getAddress');
};

exports.getOwned = function(jwt, page, limit, callback, app) {
  const workflow = app.utility.workflow(callback, app);

  try {
    const userId = app.utility.jwt.getIdFromToken(jwt);

    workflow.on('getUserGames', () => {
      app.db.models.Token.pagedFind(
        {
          filters: { user: userId },
          limit: limit ? limit : 20,
          page: page ? page : 1,
          sort: { _id: -1 },
          populate: ['game']
        },
        (err, games) => {
          if (err) {
            return workflow.emit('exception', err);
          }
          workflow.emit('response', games);
        }
      );
    });

    workflow.emit('getUserGames');
  } catch (error) {
    workflow.emit('exception', error);
  }
};

exports.acceptGameOrder = function(jwt, orderId, callback, app) {
  const workflow = app.utility.workflow(callback, app);

  const userId = app.utility.jwt.getIdFromToken(jwt);
  if (!userId) {
    return workflow.emit('exception', 'invalid user calling method');
  }

  workflow.on('getInfo', () => {
    app.db.models.Token.findOne({ orderId }, (err, token) => {
      if (err) {
        return workflow.emit('exception', 'error finding order', err);
      }
      if (!token) {
        return workflow.emit('exception', 'no order found');
      }
      workflow.emit('response', 'Processing order acceptance');
      acceptGameOrder(userId, orderId, token, app);
    });
  });
  workflow.emit('getInfo');
};

const acceptGameOrder = function(userId, orderId, pendingToken, app) {
  const workflow = app.utility.workflow(() => {}, app);
  let tokenPlayPaymentWs = app.utility.websocket.createPaymentWs();

  console.log('accepting order!', orderId);
  workflow.on('acceptGameOrder', (orderId, pendingToken) => {
    const tx = {
      from: app.wallet.addresses[0],
      to: config.paymentContractAddress,
      gas: config.gasLimit,
      data: app.tokenPlayPayment.methods.acceptGameOrder(orderId).encodeABI()
    };
    console.log('Accepting game order ', tx);
    const acceptPromise = app.utility.txQueue.push(app.wallet.addresses[0], tx);

    tokenPlayPaymentWs.events.GameOrderAccepted((err, event) => {
      if (err) {
        pendingToken.status = 'failed';
        pendingToken.save();
        workflow.emit('logError', userId, 'error listening for orderAcceptance', err);
      }
      acceptPromise
        .then(response => {
          if (event.transactionHash === response.transactionHash) {
            console.log('Order accepted '); //, response);
            workflow.emit('createTokenDocument', event.returnValues.tokenId, pendingToken);
          }
        })
        .catch(err => {
          workflow.emit('logError', userId, 'error in GameOrderAccepted transaction', err);
          pendingToken.status = 'failed';
          pendingToken.save();
        });
    });
  });

  workflow.on('createTokenDocument', (tokenId, pendingToken) => {
    if (!tokenId) {
      return workflow.emit('logError', userId, 'No Token Id found on create token document');
    } else {
      pendingToken.tokenId = tokenId;
      pendingToken.status = 'confirmed';
      pendingToken.tokenIssueDate = new Date();
      pendingToken
        .save()
        .then(token => {
          console.log('Confirmed token saved '); //, token);
        })
        .catch(err => {
          pendingToken.status = 'failed';
          pendingToken.save();
          console.log('error saving accepted token', err);
        });
    }
  });
  workflow.emit('acceptGameOrder', orderId, pendingToken);
};
exports.setPrice = function(jwt, gameId, price, callback, app) {
  const workflow = app.utility.workflow(callback, app);
  let userId;
  try {
    userId = app.utility.jwt.getIdFromToken(jwt);
  } catch (err) {
    return workflow.emit('exception', 'token expired or invalid');
  }
  //check gameId in mongo
  workflow.on('verifyGame', () => {
    app.db.models.Game.findOne({ gameId })
      .then(game => {
        if (!game) {
          return workflow.emit('exception', 'gameId not found!');
        }
        workflow.emit('setPrice', game);
      })
      .catch(err => {
        workflow.emit('exception', 'error finding game', err);
      });
  });

  //once publisher rights are implemented we will need to verify rights here

  workflow.on('setPrice', game => {
    if (price < 1) {
      price = app.web3.utils.toWei(price.toString(), 'ether');
    }
    const tx = {
      from: app.wallet.addresses[0],
      to: config.paymentContractAddress,
      gas: config.gasLimit,
      data: app.tokenPlayPayment.methods.setPrice(gameId, price).encodeABI()
    };
    const pricePromise = app.utility.txQueue.push(app.wallet.addresses[0], tx);
    workflow.emit('response', 'updating price');
    pricePromise
      .then(res => {
        console.log('price set', res);

        workflow.emit('updateGame', game, price);
      })
      .catch(err => {
        workflow.emit('logError', userId, 'error setting price on Ethereum network', err);
      });
  });

  workflow.on('updateGame', game => {
    game.price = price;
    game
      .save()
      .then(game => {
        console.log('price set successfully', game.price);
      })
      .catch(err => console.log('error saving new price', err));
  });

  workflow.emit('verifyGame');
};

exports.verifyGameOwner = function(username, tokenId, callback, app) {
  const workflow = app.utility.workflow(callback, app);

  workflow.on('getUser', () => {
    app.db.models.User.findOne({ $or: [{ username }, { email: username }] }, (err, user) => {
      if (err) {
        return workflow.emit('exception', err);
      }
      if (!user) {
        workflow.emit('checkOwnership', username);
      } else {
        workflow.emit('getAccount', user.account);
      }
    });
  });

  workflow.on('getAccount', account => {
    app.db.models.Account.findOne({ _id: account }, (err, account) => {
      if (err) {
        return workflow.emit('exception', err);
      }
      workflow.emit('checkOwnership', account.walletId);
    });
  });

  workflow.on('checkOwnership', address => {
    app.tokenPlayPayment.methods
      .ownerOf(tokenId)
      .call()
      .then(res => {
        workflow.emit('response', res === address);
      })
      .catch(err => {
        workflow.emit('exception', err);
      });
  });

  workflow.emit('getUser');
};

exports.getOrder = (jwt, orderId, callback, app) => {
  const workflow = app.utility.workflow(callback, app);
  let userId;
  try {
    userId = app.utility.jwt.getIdFromToken(jwt);
  } catch (err) {
    return workflow.emit('exception', 'token expired or invalid');
  }
  app.tokenPlayPayment.methods
    .getGameOrder(orderId)
    .call()
    .then(order => {
      const response = {
        customerAddress: order[0],
        gameId: order[1]
      };

      if (app.web3.utils.toBN(response.customerAddress).isZero()) {
        return workflow.emit('exception', 'order does not exist or is already approved');
      }
      return workflow.emit('response', response);
    })
    .catch(err => {
      workflow.emit('exception', 'failed request', err);
    });
};
