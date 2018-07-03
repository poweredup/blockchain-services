const jwtKey = require('../config').jwtKey;

function checkPasswordStrengthError(password) {
  const regEx = /^(?=.*[0-9].*[0-9]).{8,24}$/i;
  if (!regEx.test(password)) {
    return 'Password must be between 8 to 24 charaters long containing at least two numeric characters';
  }
  return null;
}

exports.signup = function(username, email, password, callback, app) {
  const workflow = app.utility.workflow(callback);

  workflow.on('validate', () => {
    if (!password) {
      workflow.outcome.errfor.password = 'required';
    }
    if (checkPasswordStrengthError(password)) {
      workflow.outcome.errfor.password = checkPasswordStrengthError(password);
    }
    if (workflow.hasErrors()) {
      return workflow.emit('response');
    }
    workflow.emit('createWeb3Account');
  });

  workflow.on('createWeb3Account', () => {
    const wallet = app.web3.eth.accounts.create();

    const account = new app.db.models.Account({
      walletId: wallet.address,
      privateKey: wallet.privateKey,
      gamerId: 'placeholder'
    });
    account.save((err, account) => {
      if (err) {
        return workflow.emit('exception', err);
      }
      workflow.emit('createUser', account);
    });
  });

  workflow.on('createUser', account => {
    app.db.models.User.encryptPassword(password, function(err, hash) {
      if (err) {
        return workflow.emit('exception', err);
      }

      const user = new app.db.models.User({
        isActive: 'yes',
        username: username,
        email: email.toLowerCase(),
        password: hash,
        account: account._id
      });
      user.save(function(err, user) {
        if (err) {
          return workflow.emit('exception', err);
        }
        app.db.models.Account.findOneAndUpdate({ _id: account._id }, { $set: { userId: user._id } }, (err, account) => {
          if (err) {
            return workflow.emit('exception', err);
          }
          workflow.emit('response', { username: user.username, email: user.email });
        });
      });
    });
  });

  workflow.emit('validate');
};

exports.login = (username, password, callback, app) => {
  const workflow = app.utility.workflow(callback);
  workflow.on('retrieveUser', () => {
    app.db.models.User.findOne({ $or: [{ username }, { email: username }] }, (error, user) => {
      if (error) {
        return workflow.emit('exception', error);
      }
      if (!user) {
        return workflow.emit('exception', 'no user found');
      }

      workflow.emit('matchPassword', user);
    });
  });
  workflow.on('matchPassword', user => {
    app.db.models.User.validatePassword(password, user.password, (error, res) => {
      if (error) {
        return workflow.emit('exception', error);
      }
      if (!res) {
        return workflow.emit('exception', 'incorrect password');
      }
      workflow.emit('issueToken', user);
    });
  });
  workflow.on('issueToken', ({ _id }) => {
    const jwt = app.utility.jwt;
    const token = jwt.sign({ data: { user: _id } }, jwtKey, { expiresIn: 60 * 60 * 24 });
    workflow.emit('response', { token });
  });

  workflow.emit('retrieveUser');
};

exports.setAccount = (jwt, firstName, lastName, callback, app) => {
  const workflow = app.utility.workflow(callback);
  try {
    const userId = app.utility.jwt.getIdFromToken(jwt);
    const fieldsToSet = {
      firstName,
      lastName
    };

    workflow.on('setAccount', () => {
      app.db.models.Account.findOneAndUpdate({ userId }, { $set: fieldsToSet }, { new: true }, (error, account) => {
        if (error) {
          return workflow.emit('exception', error);
        }
        if (!account) {
          return workflow.emit('exception', 'unable to update account');
        }
        const { firstName, lastName, walletId } = account;
        workflow.emit('response', { firstName, lastName, walletId });
      });
    });

    workflow.emit('setAccount');
  } catch (error) {
    workflow.emit('exception', error);
  }
};

exports.getAccount = (jwt, callback, app) => {
  const workflow = app.utility.workflow(callback);
  try {
    workflow.on('getAccount', () => {
      const userId = app.utility.jwt.getIdFromToken(jwt);
      app.db.models.Account.findOne({ userId }, 'firstName lastName walletId gamerId', (error, account) => {
        if (error) {
          return workflow.emit('exception', error);
        }
        if (!account) {
          return workflow.emit('exception', 'no account');
        }
        workflow.emit('response', { account });
      });
    });

    workflow.emit('getAccount');
  } catch (error) {
    workflow.emit('exception', error);
  }
};

exports.getAccountBalance = (jwt, callback, app) => {
  const workflow = app.utility.workflow(callback);

  try {
    workflow.on('getAddress', () => {
      console.log('getting balance!');
      app.utility.jwt.getWalletFromToken(jwt, app).then(wallet => {
        if (!wallet) {
          return workflow.emit('exception', 'wallet not available');
        }
        workflow.emit('getBalance', wallet.walletId);
      });
    });

    workflow.on('getBalance', address => {
      app.web3.eth.getBalance(address).then(balance => {
        workflow.emit('response', { balance });
      });
    });
    workflow.emit('getAddress');
  } catch (error) {
    workflow.emit('exception', error);
  }
};

exports.transferFunds = (jwt, destAddress, amount, callback, app) => {
  const workflow = app.utility.workflow(callback);
  const userId = app.utility.jwt.getIdFromToken(jwt);
  if (!userId) {
    return workflow.emit('exception', 'invalid user calling method');
  }

  workflow.on('getWallet', () => {
    app.utility.jwt
      .getWalletFromToken(jwt, app)
      .then(wallet => {
        if (!wallet) {
          return workflow.emit('exception', 'wallet not available');
        }
        workflow.emit('checkbalance', wallet);
      })
      .catch(err => {
        console.log(err);
        workflow.emit('exception', 'error fetching wallet', err);
      });
  });
  workflow.on('checkbalance', wallet => {
    const { gasLimit } = require('../config');
    app.web3.eth
      .getBalance(wallet.walletId)
      .then(balance => {
        app.web3.eth
          .getGasPrice()
          .then(gasPrice => {
            const gasFee = gasPrice * gasLimit;
            if (Number(amount) > Number(gasFee) + Number(balance)) {
              return workflow.emit('exception', 'insufficient funds');
            }
            workflow.emit('sendTransaction', wallet, gasLimit);
          })
          .catch(err => workflow.emit('exception', 'error checking gas price', err));
      })
      .catch(err => {
        console.log(err);
        workflow.emit('exception', 'error checking balance', err);
      });
  });
  workflow.on('sendTransaction', (wallet, gasLimit) => {
    const rawTx = {
      from: wallet.walletId,
      to: destAddress,
      value: amount,
      gas: gasLimit
    };
    workflow.emit('response', { message: 'Sending Transaction!' });
    app.utility.txQueue
      .push(wallet.walletId, rawTx, wallet.privateKey)
      .then(receipt => {
        console.log('reciept', receipt.transactionHash);
      })
      .catch(err => workflow.emit('logError', userId, 'error sending transaction', err));
  });

  workflow.emit('getWallet');
};

exports.getErrorLog = (jwt, page, limit, callback, app) => {
  const workflow = app.utility.workflow(callback);

  try {
    const userId = app.utility.jwt.getIdFromToken(jwt);
    app.db.models.UserError.pagedFind(
      {
        limit: limit ? limit : 20,
        page: page ? page : 1,
        filters: {
          user: userId
        },
        sort: {
          timeStamp: -1
        }
      },
      (err, errorLog) => {
        if (err) {
          return workflow.emit('exception', err);
        }
        workflow.emit('response', errorLog);
      }
    );
  } catch (error) {
    workflow.emit('exception', error);
  }
};
