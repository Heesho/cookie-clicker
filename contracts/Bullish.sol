// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Bullish is ERC721, ERC721Enumerable, ERC721URIStorage, ReentrancyGuard, Ownable {

    /*----------  CONSTANTS  --------------------------------------------*/

    string public constant NAME = "Bull Ish";

    /*----------  STATE VARIABLES  --------------------------------------*/

    string public baseTokenURI;
    uint256 public currentTokenId;
    uint256 public price = 6.9 ether;
    address public immutable bullas;
    address public treasury;
    address public developer;

    mapping(uint256 => bool) public bullas_Claimed;

    /*----------  ERRORS ------------------------------------------------*/

    error Bullish__InsufficientFunds();
    error Bullish__NotAuthorized();
    error Bullish__NotBullasOwner();
    error Bullish__AlreadyClaimed();

    /*----------  EVENTS ------------------------------------------------*/

    event Bullish__Minted(address indexed _to, uint256 _tokenId);
    event Bullish__PriceSet(uint256 _price);
    event Bullish__BaseTokenURIUpdated(string _newBaseTokenURI);
    event Bullish__TreasurySet(address _treasury);
    event Bullish__DeveloperSet(address _developer);

    /*----------  FUNCTIONS  --------------------------------------------*/

    constructor(address _bullas, address _treasury, address _developer) ERC721(NAME, NAME) {
        bullas = _bullas;
        treasury = _treasury;
        developer = _developer;
    }

    function mint() external payable nonReentrant returns (uint256) {
        if (msg.value != price) revert Bullish__InsufficientFunds();
        _mintBullish(msg.sender);
        return currentTokenId;
    }

    function claim(uint256 tokenId) external nonReentrant returns (uint256) {
        if (IERC721(bullas).ownerOf(tokenId) != msg.sender) revert Bullish__NotBullasOwner();
        if (bullas_Claimed[tokenId]) revert Bullish__AlreadyClaimed();
        bullas_Claimed[tokenId] = true;
        _mintBullish(msg.sender);
        return currentTokenId;
    }

    function withdraw() external nonReentrant {
        uint256 balance = address(this).balance;
        uint256 amountTreasury = balance * 92 / 100;
        uint256 amountDeveloper = balance - amountTreasury;

        payable(treasury).transfer(amountTreasury);
        payable(developer).transfer(amountDeveloper);
    }

    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/

    function mintBatch(address _to, uint256 _amount) external onlyOwner {
        for (uint256 i = 0; i < _amount; i++) {
            _mintBullish(_to);
        }
    }

    function setBaseTokenURI(string memory _baseTokenURI) external onlyOwner {
        baseTokenURI = _baseTokenURI;
        emit Bullish__BaseTokenURIUpdated(_baseTokenURI);
    }

    function setPrice(uint256 _price) external onlyOwner {
        price = _price;
        emit Bullish__PriceSet(_price);
    }

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
        emit Bullish__TreasurySet(_treasury);
    }

    function setDeveloper(address _developer) external {
        if (msg.sender != developer) revert Bullish__NotAuthorized();
        developer = _developer;
        emit Bullish__DeveloperSet(_developer);
    }

    function _mintBullish(address _to) internal {
        uint256 newTokenId = ++currentTokenId;
        _safeMint(_to, newTokenId);
        emit Bullish__Minted(_to, newTokenId);
    }

    /*----------  OVERRIDE FUNCTIONS  ------------------------------------*/

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal virtual override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    /*----------  VIEW FUNCTIONS  ---------------------------------------*/

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Enumerable, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return baseTokenURI;
    }

}