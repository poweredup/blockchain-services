pragma solidity ^0.4.21;

import "./TokenPlayRegistry.sol";

contract TokenPlayPayment is TokenPlayRegistry {
  event PriceSet(uint256 indexed gamesId, uint256 indexed value);
  event GameCopyOrdered(address indexed buyer, uint256 indexed pendingOrderId, uint256 indexed gamesId, uint256 value);
  event GameOrderAccepted(address indexed buyer, uint256 indexed gamesId, uint256 indexed tokenId);

  modifier matchPrice(uint256 _gamesId) {
    uint gamePrice = TpEternalStorage.getGamesIdToGamePrice(_gamesId);
    require(gamePrice != 0 && gamePrice == msg.value, 
      "Game not registered or transaction value does not match game price");
    _;
  }

  function setPrice(uint256 _gamesId, uint256 _price) public onlyOwnerOrGamePublisher(msg.sender, _gamesId) {
    TpEternalStorage.setGamesIdToGamePrice(_gamesId, _price);
    emit PriceSet(_gamesId, _price);
  }

  function addGameWithPrice(address _gameDev, uint256 _gamesId, uint256 _price) public onlyOwner {
    addGamePublisher(_gameDev, _gamesId);
    setPrice(_gamesId, _price);
  }

  function orderGameCopy(uint256 _gamesId) public payable matchPrice(_gamesId) {
    uint orderCount = TpEternalStorage.getOrderCounter().add(1);
    address gamePublisher = TpEternalStorage.getGamesIdToOwnerAddress(_gamesId);
    gamePublisher.transfer(msg.value);
    TpEternalStorage.setPendingOrder(msg.sender, _gamesId);
    emit GameCopyOrdered(msg.sender, orderCount, _gamesId, msg.value);
  }
  
  function getGameOrder(uint256 _orderId) public view returns (address, uint256) {
    return (TpEternalStorage.getPendingOrders(_orderId));
  }

  function acceptGameOrder(uint256 _orderId) public {
    address _gameBuyer;
    uint _gamesId;
    (_gameBuyer, _gamesId) = TpEternalStorage.getPendingOrders(_orderId);
    require(_gameBuyer != address(0), "Order does not have a buyer address");
    address _ownerAddress = TpEternalStorage.getGamesIdToOwnerAddress(_gamesId);
    require(_ownerAddress == msg.sender || msg.sender == owner,
      "Game does not belong to transaction origin address");

    uint _tokenId = TpEternalStorage.getTokenIdCounter().add(1);
    mintGameCopy(_gamesId, _tokenId, _orderId);
    emit GameOrderAccepted(_gameBuyer, _gamesId, _tokenId);
  }
}
