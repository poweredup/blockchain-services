pragma solidity ^0.4.21;

import "./ownership/Ownable.sol";
import "./TurboPlayStorageInterface.sol";
import "./math/SafeMath.sol";

contract TurboPlayRegistry is Ownable {
	using SafeMath for uint256;

	address storageAddress = 0x190d7484303eF6aD07A3D5625054808c2345E987;

  TpStorageInterface TpEternalStorage = TpStorageInterface(storageAddress);

	event AddedGamePublisher(address addr, uint256 gamesId, uint256 index);
	event RemovedGamePublisher(address addr, uint256 gamesId, uint256 index);

	event GameCopyCreated(address addr, uint256 gamesId, uint256 tokensId, uint256 index);
	event GameCopyRemoved(address addr, uint256 gamesId, uint256 tokensId, uint256 index);

	// Check address is owner of Game Id
	modifier onlyOwnerOrGamePublisher(address _gameDev, uint256 _gamesId) {
		require(TpEternalStorage.getGamesIdToOwnerAddress(_gamesId) == _gameDev || _gameDev == owner);
		_;
	}

	function setStorageAddress(address _newStorageAddress) public onlyOwner {
		TpEternalStorage = TpStorageInterface(_newStorageAddress);
	}

	// Prevent ether transaction to contract
	function () public payable {
		revert();
	}

	function ownerOf(uint _tokensId) public view returns (address) {
		return TpEternalStorage.ownerOf(_tokensId);
	}

	function gameIdByOwner(address _owner, uint256 _index) public view returns (uint256) {
		uint[] memory gameIdsFromOwner = TpEternalStorage.getOwnerToGamesIds(_owner);
		uint256 indexLength = gameIdsFromOwner.length;
		require(_index < indexLength);
		return gameIdsFromOwner[_index];
	}

	function gameIndexByGameId(uint256 _gamesId) public view returns (uint256) {
		return TpEternalStorage.getGamesIdIndex(_gamesId);
	}

	function ownerByGameId(uint256 _gamesId) public view returns (address) {
		return TpEternalStorage.getGamesIdToOwnerAddress(_gamesId);
	}

	function tokenIdByGameIdIndex(uint256 _gamesId, uint256 _tokenIndex) public view returns (uint256) {
		uint[] memory _tokenIds = TpEternalStorage.getGamesIdToTokensId(_gamesId);
		uint256 indexLength = _tokenIds.length;
		require(_tokenIndex < indexLength);
		return _tokenIds[_tokenIndex];
	}

	function tokenIndexByTokenId(uint256 _tokensId) public view returns (uint256) {
		return TpEternalStorage.getTokensIdToTokensIdIndex(_tokensId);
	}

	function gameIdByTokenId(uint256 _tokensId) public view returns (uint256) {
		return TpEternalStorage.getTokensIdToGamesId(_tokensId);
	}


	function addGamePublisher(address _gameDev, uint256 _gamesId) public onlyOwner {
		require(TpEternalStorage.getGamesIdToOwnerAddress(_gamesId) == address(0));

		uint256 length = TpEternalStorage.getOwnerToGamesIds(_gameDev).length;

		TpEternalStorage.setGamesIdToOwnerAddress(_gamesId, _gameDev);
		TpEternalStorage.pushOwnerToGamesIds(_gameDev, _gamesId);
		TpEternalStorage.setGamesIdIndex(_gamesId, length);

		emit AddedGamePublisher(_gameDev, _gamesId, length);
	}

	function removeGamePublisher(address _gameDev, uint256 _gamesId) public onlyOwner {
		require(TpEternalStorage.getGamesIdToOwnerAddress(_gamesId) == _gameDev);

		uint256 gameIndex = TpEternalStorage.getGamesIdIndex(_gamesId);
		uint[] memory ownersGames = TpEternalStorage.getOwnerToGamesIds(_gameDev);
		uint256 lastGameIndex = ownersGames.length.sub(1);
		uint256 lastGame = ownersGames[lastGameIndex];

		TpEternalStorage.setOwnerToGamesIds(_gameDev, gameIndex, lastGame);
		TpEternalStorage.setOwnerToGamesIds(_gameDev, lastGameIndex, 0);
		TpEternalStorage.setGamesIdIndex(_gamesId, 0);
		TpEternalStorage.setGamesIdIndex(lastGame, gameIndex);
		TpEternalStorage.setGamesIdToOwnerAddress(_gamesId, address(0));

		emit RemovedGamePublisher(_gameDev, _gamesId, gameIndex);
	}


	function mintGameCopy(uint256 _gamesId, uint256 _tokensId, uint _orderId) public onlyOwnerOrGamePublisher(msg.sender, _gamesId) {
		require(TpEternalStorage.getTokensIdToGamesId(_tokensId) == 0, "Token id has already been allocated.");

		uint256 length = TpEternalStorage.getGamesIdToTokensId(_gamesId).length;
		TpEternalStorage.saveGameOrder(_orderId, _tokensId);

		emit GameCopyCreated(msg.sender, _gamesId, _tokensId, length);
	}

	function burnGameCopy(uint256 _gamesId, uint256 _tokensId) public onlyOwnerOrGamePublisher(msg.sender, _gamesId) {
		require(TpEternalStorage.getTokensIdToGamesId(_tokensId) == _gamesId);

		uint256 tokenIndex = TpEternalStorage.getTokensIdToTokensIdIndex(_tokensId);
		TpEternalStorage.saveBurnGame(_gamesId, _tokensId);

		emit GameCopyRemoved(msg.sender, _gamesId, _tokensId, tokenIndex);
	}
}
