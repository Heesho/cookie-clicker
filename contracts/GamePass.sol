// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";


contract GamePass is ERC721, ERC721Enumerable, ERC721URIStorage, ReentrancyGuard, Ownable {

    /*----------  CONSTANTS  --------------------------------------------*/

    string public constant NAME = "Bull Ish Game";
    string public constant SYMBOL = "BULL ISH";
    
    /*----------  STATE VARIABLES  --------------------------------------*/

    string public baseTokenURI;
    uint256 public currentTokenId;
    uint256 public price = 6.9 ether;
    address public treasury;
    address public developer;

    /*----------  ERRORS ------------------------------------------------*/

    error GamePass__InsufficientFunds();
    error GamePass__NotAuthorized();

    /*----------  EVENTS ------------------------------------------------*/

    event GamePass__Minted(address indexed _to, uint256 _tokenId);
    event GamePass__PriceSet(uint256 _price);
    event GamePass__BaseTokenURIUpdated(string _newBaseTokenURI);
    event GamePass__TreasurySet(address _treasury);
    event GamePass__DeveloperSet(address _developer);

    /*----------  FUNCTIONS  --------------------------------------------*/

    constructor(address _treasury, address _developer) ERC721(NAME, SYMBOL) {
        treasury = _treasury;
        developer = _developer;
    }

    function mint() external payable nonReentrant {
        if (msg.value != price) revert GamePass__InsufficientFunds();
        _mintGamePass(msg.sender);
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
            _mintGamePass(_to);
        }
    }

    function setBaseTokenURI(string memory _baseTokenURI) external onlyOwner {
        baseTokenURI = _baseTokenURI;
        emit GamePass__BaseTokenURIUpdated(_baseTokenURI);
    }

    function setPrice(uint256 _price) external onlyOwner {
        price = _price;
        emit GamePass__PriceSet(_price);
    }

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
        emit GamePass__TreasurySet(_treasury);
    }

    function setDeveloper(address _developer) external {
        if (msg.sender != developer) revert GamePass__NotAuthorized();
        developer = _developer;
        emit GamePass__DeveloperSet(_developer);
    }

    function _mintGamePass(address _to) internal {
        uint256 newTokenId = ++currentTokenId;
        _safeMint(_to, newTokenId);
        emit GamePass__Minted(_to, newTokenId);
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