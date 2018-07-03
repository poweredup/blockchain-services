exports = module.exports = function(web3) {
    // Queuing framework used to execute transaction from a given address in sequence
    // hence eliminating race conditions

    const queue = {};
  
    // Use to store a list of array of raw transactions by originator addresses
    queue.transactions = {};
    // Use to store nonces by originator addresses, this futher prevents race conditions
    queue.nonces = {};

    queue.shift = function(address) {
      queue.transactions[address].shift();
      queue.nonces[address]++;
      queue.next(address);
    }; 

    // Process transaction at head of queue
    queue.next = function(address) {
      if (queue.transactions[address] && queue.transactions[address].length > 0) {
        const request = queue.transactions[address][0];
        request.tx.nonce = queue.nonces[address];
        let signPromise = null;
        if (request.privateKey) {
          signPromise = web3.eth.accounts.signTransaction(request.tx, request.privateKey);
        } else {
          // If no private key is provided, assume account is unlocked
          signPromise = web3.eth.signTransaction(request.tx, request.tx.from);
        }
        signPromise.then((signedTx) => {
          const sentTx = web3.eth.sendSignedTransaction(signedTx.raw || signedTx.rawTransaction);
          sentTx.on('receipt', receipt => {
            request.resolve(receipt);
            queue.shift(address);
          });

          sentTx.on('error', err => {
            request.reject(err);
            // Dump the transaction on error
            queue.shift(address);
          });
        }).catch((err) => {
          request.reject(err);
        });
      }
    };
  
    queue.push = function(address, tx, privateKey) {
      if (!queue.transactions[address]) {
        queue.transactions[address] = [];
      }

      return new Promise((resolve, reject) => {
        queue.transactions[address].push({
          tx, privateKey, resolve, reject
        });
        if (queue.transactions[address] && queue.transactions[address].length === 1) {
          // If this is the only transaction, execute right away
          // Reset nonce just to be safe when queue refreshes
          web3.eth.getTransactionCount(address).then((response) => {
            queue.nonces[address] = response;
            queue.next(address);
          }).catch((err) => {
            // Error getting transaction count, continue anyway
            queue.next(address);
          });
        }
      });
    };
  
    return queue;
  };
  