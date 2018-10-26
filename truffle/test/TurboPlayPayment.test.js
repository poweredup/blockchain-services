let TurboPlayPayment = artifacts.require('TurboPlayPayment');

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

contract('Test TurboPlayRegistry:', function(accounts) {
  const creator = accounts[0];
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  const sampleGameIDs = [100, 200, 300, 400, 500, 600, 700, 800, 900];
  const sampleTokenIDs = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000];

  beforeEach(async function() {
    this.instance = await TurboPlayPayment.new({ from: creator });
  });

  describe('Registry', async function() {
    beforeEach(async function() {
      await this.instance.addGamePublisher(accounts[1], sampleGameIDs[1], { from: creator });
      await this.instance.mintGameCopy(sampleGameIDs[1], sampleTokenIDs[1], { from: accounts[1] });
    });

    it('Should assign owner address to deployer address', async function() {
      let ownerAddress = await this.instance.owner.call();
      ownerAddress.should.be.equal(creator);
    });

    it('Should add new gameID for publisher', async function() {
      let ownerAddress = await this.instance.ownerByGameId(sampleGameIDs[1]);
      let gameIdIndex = await this.instance.gameIndexByGameId(sampleGameIDs[1]);
      let gameId = await this.instance.gameIdByOwner(accounts[1], gameIdIndex);
      ownerAddress.should.be.equal(accounts[1]);
      gameId.toNumber().should.be.equal(sampleGameIDs[1]);
    });

    it('Should remove gameId for publisher', async function() {
      await this.instance.removeGamePublisher(accounts[1], sampleGameIDs[1], { from: creator });
      let ownerAddress = await this.instance.ownerByGameId(sampleGameIDs[1]);
      ownerAddress.should.be.equal(ZERO_ADDRESS);
    });

    it('Should mint new game copy', async function() {
      let ownerAddress = await this.instance.ownerByGameId(sampleGameIDs[1]);
      let tokenIdIndex = await this.instance.tokenIndexByTokenId(sampleTokenIDs[1]);
      let gameId = await this.instance.gameIdByTokenId(sampleTokenIDs[1]);
      let tokenId = await this.instance.tokenIdByGameIdIndex(gameId, tokenIdIndex);
      let tokenOwner = await this.instance.ownerOf(tokenId);
      ownerAddress.should.be.equal(accounts[1]);
      tokenId.toNumber().should.be.equal(sampleTokenIDs[1]);
      gameId.toNumber().should.be.equal(sampleGameIDs[1]);
      tokenOwner.should.be.equal(accounts[1]);
    });

    it('Should burn game copy', async function() {
      let tokenIdIndex = await this.instance.tokenIndexByTokenId(sampleTokenIDs[1]);
      let gameId = await this.instance.gameIdByTokenId(sampleTokenIDs[1]);
      let tokenId = await this.instance.tokenIdByGameIdIndex(gameId, tokenIdIndex);
      await this.instance.burnGameCopy(sampleGameIDs[1], sampleTokenIDs[1], { from: accounts[1] });
      let tokenOwner = await this.instance.ownerOf(tokenId);
      tokenOwner.should.be.equal(ZERO_ADDRESS);
    });
  });

  describe('payment', async function() {
    let publisher = accounts[1];
    let customer = accounts[2];
    let hacker = accounts[7];
    let game = sampleGameIDs[1];
    let price = 1;
    let gasLimit = 500000;
    beforeEach(async function() {
      await this.instance.addGamePublisher(publisher, game, { from: creator });
      await this.instance.setPrice(game, price, { from: creator });
    });

    it('will accept payment', async function() {
      const balanceBefore = web3.eth.getBalance(customer).toNumber();
      try {
        await this.instance.orderGameCopy(game, { from: customer, value: price, gas: gasLimit });
      } catch (err) {
        assert(false, err);
      }
      const balanceAfter = web3.eth.getBalance(customer).toNumber();
      assert.notEqual(balanceBefore, balanceAfter, 'payment was not processed');
    });

    xit('will transfer funds to publisher upon game order', async function() {
      const balanceBefore = web3.eth.getBalance(publisher).toNumber();
      await this.instance.orderGameCopy(game, { from: customer, value: price, gas: gasLimit });
      const balanceAfter = web3.eth.getBalance(publisher).toNumber();
      assert.notEqual(balanceBefore, balanceAfter, 'payment was not processed');
    });

    it('will error if value sent is incorrect', async function() {
      let failmsg = 'failed to fail';
      try {
        let result = await this.instance.orderGameCopy(game, { from: customer, value: price - 0.1, gas: gasLimit });
        assert.fail(failmsg);
      } catch (err) {
        assert(err);
        assert.notEqual(err.actual, failmsg, failmsg);
      }
    });

    it('mints token and sends to customer', async function() {
      await this.instance.orderGameCopy(game, { from: customer, value: price, gas: gasLimit });
      const orderEvent = this.instance.GameCopyOrdered({ buyer: customer });
      orderEvent.watch(async (err, data) => {
        assert.equal(err, null);
        const orderId = data.args.pendingOrderId;
        await this.instance.acceptGameOrder(orderId, { from: publisher });
        const acceptEvent = this.instance.GameOrderAccepted();
        acceptEvent.watch(async (err, data) => {
          assert.equal(err, null);
          const tokenId = data.args.tokenId;
          const tokenOwner = await this.instance.ownerOf(tokenId);
          assert.equal(tokenOwner, customer);
          acceptEvent.stopWatching();
        });
        orderEvent.stopWatching();
      });
    });
  });
});
