// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

interface ICookie {
    function mint(address account, uint256 amount) external;
    function burn(address account, uint256 amount) external;
}

contract Factory is ReentrancyGuard, Ownable {
    uint256 constant PRECISION = 1 ether;
    uint256 constant DURATION = 28800;

    address public immutable cookie;

    uint256 public lvlIndex;
    mapping(uint256 => uint256) public lvl_Unlock; // level => amount required to unlock
    mapping(uint256 => uint256) public lvl_CostMultiplier; // level => cost multiplier

    uint256 public toolIndex;
    uint256 public amountIndex;
    mapping(uint256 => uint256) public toolId_BaseCost; // tool id => base cost
    mapping(uint256 => uint256) public toolId_BaseCps; // tool id => base cookies per second
    mapping(uint256 => uint256) public amount_CostMultiplier; // tool amount => cost multiplier
    mapping(address => uint256) public account_Cps; // account => cookies per second
    mapping(address => uint256) public account_Last; // account => last time claimed

    mapping(address => mapping(uint256 => uint256)) public account_toolId_Amount; // account => tool id => amount
    mapping(address => mapping(uint256 => uint256)) public account_toolId_Lvl; // account => tool id => level

    error Factory__AmountMaxed();
    error Factory__LevelMaxed();
    error Factory__InvalidInput();
    error Factory__NotAuthorized();
    error Factory__UpgradeLocked();
    error Factory__ToolDoesNotExist();

    event Factory__ToolPurchased(address indexed account, uint256 toolId, uint256 newAmount, uint256 cost, uint256 cps);
    event Factory__ToolUpgraded(address indexed account, uint256 toolId, uint256 newLevel, uint256 cost, uint256 cps);
    event Factory__Claimed(address indexed account, uint256 amount);
    event Factory__LvlSet(uint256 lvl, uint256 cost, uint256 unlock);
    event Factory__ToolSet(uint256 toolId, uint256 baseCps, uint256 baseCost);
    event Factory__ToolMultiplierSet(uint256 index, uint256 multiplier);

    modifier onlyAccount(address account) {
        if (msg.sender != account) revert Factory__NotAuthorized();
        _;
    }

    constructor(address _cookie) {
        cookie = _cookie;
    }

    function claim(address account) public {
        uint256 amount = account_Cps[account] * (block.timestamp - account_Last[account]);
        uint256 maxAmount = account_Cps[account] * DURATION;
        if (amount > maxAmount) amount = maxAmount;
        account_Last[account] = block.timestamp;
        emit Factory__Claimed(account, amount);
        ICookie(cookie).mint(account, amount);
    }

    function purchaseTool(address account, uint256 toolId, uint256 toolAmount)
        external
        nonReentrant
        onlyAccount(account)
    {
        if (toolAmount == 0) revert Factory__InvalidInput();
        claim(account);
        uint256 cost = 0;
        for (uint256 i = 0; i < toolAmount; i++) {
            uint256 currentAmount = account_toolId_Amount[account][toolId];
            if (currentAmount == amountIndex) revert Factory__AmountMaxed();
            uint256 unitCost = getToolCost(toolId, currentAmount);
            cost += unitCost;
            if (unitCost == 0) revert Factory__ToolDoesNotExist();
            account_toolId_Amount[account][toolId]++;
            account_Cps[account] += getToolCps(toolId, account_toolId_Lvl[account][toolId]);
            emit Factory__ToolPurchased(
                account, toolId, account_toolId_Amount[account][toolId], unitCost, account_Cps[account]
            );
        }
        ICookie(cookie).burn(account, cost);
    }

    function upgradeTool(address account, uint256 toolId) external nonReentrant onlyAccount(account) {
        uint256 currentLvl = account_toolId_Lvl[account][toolId];
        uint256 cost = toolId_BaseCost[toolId] * lvl_CostMultiplier[currentLvl + 1];
        if (cost == 0) revert Factory__LevelMaxed();
        if (account_toolId_Amount[account][toolId] < lvl_Unlock[currentLvl + 1]) revert Factory__UpgradeLocked();
        claim(account);
        account_toolId_Lvl[account][toolId]++;
        account_Cps[account] += (getToolCps(toolId, currentLvl + 1) - getToolCps(toolId, currentLvl))
            * account_toolId_Amount[account][toolId];
        emit Factory__ToolUpgraded(account, toolId, account_toolId_Lvl[account][toolId], cost, account_Cps[account]);
        ICookie(cookie).burn(account, cost);
    }

    function setLvl(uint256[] calldata cost, uint256[] calldata unlock) external onlyOwner {
        if (cost.length != unlock.length) revert Factory__InvalidInput();
        for (uint256 i = lvlIndex; i < lvlIndex + cost.length; i++) {
            uint256 arrayIndex = i - lvlIndex;
            lvl_CostMultiplier[i] = cost[arrayIndex];
            lvl_Unlock[i] = unlock[arrayIndex];
            emit Factory__LvlSet(i, cost[arrayIndex], unlock[arrayIndex]);
        }
        lvlIndex += cost.length;
    }

    function setTool(uint256[] calldata baseCps, uint256[] calldata baseCost) external onlyOwner {
        if (baseCps.length != baseCost.length) revert Factory__InvalidInput();
        for (uint256 i = toolIndex; i < toolIndex + baseCps.length; i++) {
            uint256 arrayIndex = i - toolIndex;
            toolId_BaseCps[i] = baseCps[arrayIndex];
            toolId_BaseCost[i] = baseCost[arrayIndex];
            emit Factory__ToolSet(i, baseCps[arrayIndex], baseCost[arrayIndex]);
        }
        toolIndex += baseCps.length;
    }

    function setToolMultipliers(uint256[] calldata multipliers) external onlyOwner {
        for (uint256 i = amountIndex; i < amountIndex + multipliers.length; i++) {
            uint256 arrayIndex = i - amountIndex;
            amount_CostMultiplier[i] = multipliers[arrayIndex];
            emit Factory__ToolMultiplierSet(i, multipliers[arrayIndex]);
        }
        amountIndex += multipliers.length;
    }

    function getToolCps(uint256 toolId, uint256 lvl) public view returns (uint256) {
        return toolId_BaseCps[toolId] * 2 ** lvl;
    }

    function getToolCost(uint256 toolId, uint256 amount) public view returns (uint256) {
        if (amount >= amountIndex) revert Factory__AmountMaxed();
        return toolId_BaseCost[toolId] * amount_CostMultiplier[amount] / PRECISION;
    }

    function getMultipleToolCost(uint256 toolId, uint256 initialAmount, uint256 finalAmount)
        external
        view
        returns (uint256)
    {
        uint256 cost = 0;
        for (uint256 i = initialAmount; i < finalAmount; i++) {
            cost += getToolCost(toolId, i);
        }
        return cost;
    }
}
