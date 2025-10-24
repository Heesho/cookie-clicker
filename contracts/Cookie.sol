// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Cookie is ERC20, Ownable {
    uint256 public minted;
    mapping(address => bool) public minters;

    error Cookie__NotAuthorized();

    event Cookie__MinterSet(address minter, bool flag);
    event Cookie__Minted(address account, uint256 amount);
    event Cookie__Burned(address account, uint256 amount);

    modifier onlyMinter() {
        if (!minters[msg.sender]) revert Cookie__NotAuthorized();
        _;
    }

    constructor() ERC20("Cookie", "COOKIE") {}

    function mint(address account, uint256 amount) external onlyMinter {
        minted += amount;
        _mint(account, amount);
        emit Cookie__Minted(account, amount);
    }

    function burn(address account, uint256 amount) external onlyMinter {
        _burn(account, amount);
        emit Cookie__Burned(account, amount);
    }

    function setMinter(address minter, bool flag) external onlyOwner {
        minters[minter] = flag;
        emit Cookie__MinterSet(minter, flag);
    }
}
