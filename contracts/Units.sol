// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Units is ERC20, Ownable {

    mapping(address => bool) public minters;

    error Units__NotAuthorized();

    event MinterSet(address minter, bool flag);

    modifier onlyMinter() {
        if (!minters[msg.sender]) revert Units__NotAuthorized();
        _;
    }

    constructor() ERC20("Units", "UNITS") {}

    function mint(address account, uint256 amount) external onlyMinter {
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) external onlyMinter {
        _burn(account, amount);
    }

    function setMinter(address minter, bool flag) external onlyOwner {
        minters[minter] = flag;
        emit MinterSet(minter, flag);
    }
}