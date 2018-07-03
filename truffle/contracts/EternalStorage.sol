pragma solidity ^0.4.21;

import "./token/ERC721/ERC721Token.sol";
import "./ownership/Ownable.sol";

contract EternalStorage is Ownable, ERC721Token("TokenPlayRegistry", "TPR") {

  address currentTpAddress;

  modifier onlyCurrentTpContractOrOwner() {
    require(msg.sender == currentTpAddress || msg.sender == owner);
    _;
  }

  function setCurrentTpAddress(address _newAddress) public onlyCurrentTpContractOrOwner {
    currentTpAddress = _newAddress;
  }

  struct GameOrder {
    address buyer;
    uint256 gamesId;
  }

  uint256 public tokenIdCounter;

  function getTokenIdCounter() public view returns (uint) {
    return tokenIdCounter;
  }

  uint256 public orderCounter;

  function getOrderCounter() public view returns (uint) {
    return orderCounter;
  }

  mapping (uint256 => uint256) public gamesIdToGamePrice;

  function setGamesIdToGamePrice(uint _gamesId, uint _gamePrice) public onlyCurrentTpContractOrOwner {
    gamesIdToGamePrice[_gamesId] = _gamePrice;
  }

  function getGamesIdToGamePrice(uint _gamesId) public view returns (uint) {
    return gamesIdToGamePrice[_gamesId];
  }

  mapping (uint256 => GameOrder) internal pendingOrders;

  function getPendingOrders(uint _orderIndex) public view returns (address, uint) {
    return (pendingOrders[_orderIndex].buyer, pendingOrders[_orderIndex].gamesId);
  }

  function setPendingOrder(address _buyer, uint _gamesId) public onlyCurrentTpContractOrOwner {
    orderCounter++;
    pendingOrders[orderCounter] = GameOrder(_buyer, _gamesId);
  }

  mapping(address => uint[]) internal ownerToGamesId;

  function setOwnerToGamesIds(address _owner, uint _index, uint _gamesIds) public onlyCurrentTpContractOrOwner {
    ownerToGamesId[_owner][_index] = _gamesIds;
  }

  function getOwnerToGamesIds(address _owner) public view returns (uint[]) {
    return ownerToGamesId[_owner];
  }

  function pushOwnerToGamesIds(address _owner, uint _gamesId) public onlyCurrentTpContractOrOwner {
    ownerToGamesId[_owner].push(_gamesId);
  }

  mapping(uint256 => uint256) internal gamesIdIndex;

  function getGamesIdIndex(uint _gamesId) public view returns (uint) {
    return gamesIdIndex[_gamesId];
  }

  function setGamesIdIndex(uint _gamesId, uint _index) public onlyCurrentTpContractOrOwner {
    gamesIdIndex[_gamesId] = _index;
  }

  mapping(uint256 => address) internal gamesIdToOwnerAddress;

  function getGamesIdToOwnerAddress(uint _gamesId) public view returns (address) {
    return gamesIdToOwnerAddress[_gamesId];
  }

  function setGamesIdToOwnerAddress(uint _gamesId, address _gameOwner) public onlyCurrentTpContractOrOwner {
    gamesIdToOwnerAddress[_gamesId] = _gameOwner;
  }

  mapping(uint256 => uint256[]) internal gamesIdToTokensId;

  function getGamesIdToTokensId(uint _gamesId) public view returns (uint[]) {
    return gamesIdToTokensId[_gamesId];
  }

  function setGamesIdToTokensId(uint _gamesId, uint _index, uint _tokensId) public onlyCurrentTpContractOrOwner {
    gamesIdToTokensId[_gamesId][_index] = _tokensId;
  }

  function pushGamesIdToTokensId(uint _gamesId, uint _tokenId) public onlyCurrentTpContractOrOwner {
    gamesIdToTokensId[_gamesId].push(_tokenId);
  }

  mapping(uint256 => uint256) internal tokensIdToTokensIdIndex;

  function getTokensIdToTokensIdIndex(uint _tokenId) public view returns (uint) {
    return tokensIdToTokensIdIndex[_tokenId];
  }

  function setTokensIdToTokensIdIndex(uint _tokenId, uint _index) public onlyCurrentTpContractOrOwner {
    tokensIdToTokensIdIndex[_tokenId] = _index;
  }

  mapping(uint256 => uint256) internal tokensIdToGamesId;

  function getTokensIdToGamesId(uint _tokenId) public view returns (uint) {
    return tokensIdToGamesId[_tokenId];
  }

  function setTokensIdToGamesId(uint _tokenId, uint _gamesId) public onlyCurrentTpContractOrOwner {
    tokensIdToGamesId[_tokenId] = _gamesId;
  }

  function saveGameOrder(uint _orderId, uint _tokensId) public onlyCurrentTpContractOrOwner {
    uint _gamesId = pendingOrders[_orderId].gamesId;
    address _buyer = pendingOrders[_orderId].buyer;
    require(tokensIdToGamesId[_tokensId] == 0, "Token id has already been allocated.");
    tokenIdCounter++;
    tokensIdToGamesId[_tokensId] = _gamesId;
    tokensIdToTokensIdIndex[_tokensId] = gamesIdToTokensId[_gamesId].length;
    gamesIdToTokensId[_gamesId].push(_tokensId);

    _mint(_buyer, _tokensId);
    // approve(_buyer, _tokensId);
    // transferFrom(_seller, _buyer, _tokensId);

    delete pendingOrders[_orderId];
  }

  function saveBurnGame(uint _gamesId, uint _tokensId) public onlyCurrentTpContractOrOwner {
    require(tokensIdToGamesId[_tokensId] == _gamesId);

    address gameOwner = ownerOf(_tokensId);
    _burn(gameOwner, _tokensId);

    uint256 lastTokenIndex = gamesIdToTokensId[_gamesId].length.sub(1);
    uint256 lastToken = gamesIdToTokensId[_gamesId][lastTokenIndex];
    gamesIdToTokensId[_gamesId][tokensIdToTokensIdIndex[_tokensId]] = lastToken;
    gamesIdToTokensId[_gamesId][lastTokenIndex] = 0;
    gamesIdToTokensId[_gamesId].length--;
    tokensIdToTokensIdIndex[_tokensId] = 0;
    tokensIdToTokensIdIndex[lastToken] = tokensIdToTokensIdIndex[_tokensId];
  }
}