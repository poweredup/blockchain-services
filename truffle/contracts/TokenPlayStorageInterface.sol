pragma solidity ^0.4.19;

contract TpStorageInterface {
  function getTokenIdCounter() external view returns (uint);
  function getOrderCounter() external view returns (uint);
  function setCurrentTpAddress(address _newAddress) external;
  function setGamesIdToGamePrice(uint _gamesId, uint _gamePrice) external;
  function getGamesIdToGamePrice(uint _gamesId) external view returns (uint);
  function getPendingOrders(uint _orderIndex) external view returns (address buyer, uint gamesId);
  function setPendingOrder(address _buyer, uint _gamesId) external;
  function setOwnerToGamesIds(address _owner, uint _index, uint _gamesId) external;
  function getOwnerToGamesIds(address _owner) external view returns (uint[]);
  function pushOwnerToGamesIds(address _owner, uint _gamesId) external;
  function getGamesIdIndex(uint _gamesId) external view returns (uint);
  function setGamesIdIndex(uint _gamesId, uint _index) external;
  function getGamesIdToOwnerAddress(uint _gamesId) external view returns (address);
  function setGamesIdToOwnerAddress(uint _gamesId, address _gameOwner) external;
  function getGamesIdToTokensId(uint _gamesId) external view returns (uint[]);
  function pushGamesIdToTokensId(uint _gamesId, uint _tokensId) external;
  function setGamesIdToTokensId(uint _gamesId, uint _index, uint _tokensId) external;
  function getTokensIdToTokensIdIndex(uint _tokensId) external view returns (uint);
  function setTokensIdToTokensIdIndex(uint _tokensId, uint _index) external;
  function getTokensIdToGamesId(uint _tokensId) external view returns (uint);
  function setTokensIdToGamesId(uint _tokensId, uint _gamesId) external;
  function saveGameOrder(uint _orderId, uint _tokensId) external;
  function saveBurnGame(uint _gamesId, uint _tokensId) external;
  function ownerOf(uint _tokensId) external view returns (address);
}