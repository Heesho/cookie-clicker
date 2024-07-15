// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

contract Key is ERC721Enumerable {

    uint256 public currentTokenId;

    constructor() ERC721("KeyNFT", "KEY") {}

    function mint() external returns (uint256) {
        uint256 newTokenId = ++currentTokenId;
        _mint(msg.sender, newTokenId);
        return newTokenId;
    }
}