// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

interface ICookie {
    function mint(address account, uint256 amount) external;
    function burn(address account, uint256 amount) external;
}

interface IRewarder {
    function duration() external view returns (uint256);
    function left(address token) external view returns (uint256);
    function deposit(address account, uint256 amount) external;
    function withdraw(address account, uint256 amount) external;
    function getReward(address account) external view returns (uint256);
    function notifyRewardAmount(address token, uint256 amount) external;
}

contract Factory is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    uint256 constant PRECISION = 1 ether;

    address public immutable cookie;
    address public immutable rewarder;

    uint256 public lvlIndex;
    mapping(uint256 => uint256) public lvl_Unlock;
    mapping(uint256 => uint256) public lvl_CostMultiplier;

    uint256 public toolIndex;
    uint256 public amountIndex;
    mapping(uint256 => uint256) public toolId_BaseCost;
    mapping(uint256 => uint256) public toolId_BasePower;
    mapping(uint256 => uint256) public amount_CostMultiplier;

    mapping(address => mapping(uint256 => uint256)) public account_toolId_Amount;
    mapping(address => mapping(uint256 => uint256)) public account_toolId_Lvl;

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

    constructor(address _cookie, address _rewarder) {
        cookie = _cookie;
        rewarder = _rewarder;
    }

    function purchaseTool(address account, uint256 toolId, uint256 toolAmount) external nonReentrant {
        if (toolAmount == 0) revert Factory__InvalidInput();
        IRewarder(rewarder).getReward(account);
        uint256 cost = 0;
        uint256 power = 0;
        for (uint256 i = 0; i < toolAmount; i++) {
            uint256 currentAmount = account_toolId_Amount[account][toolId];
            if (currentAmount == amountIndex) revert Factory__AmountMaxed();
            uint256 unitCost = getToolCost(toolId, currentAmount);
            cost += unitCost;
            if (unitCost == 0) revert Factory__ToolDoesNotExist();
            uint256 unitPower = getToolPower(toolId, account_toolId_Lvl[account][toolId]);
            account_toolId_Amount[account][toolId]++;
            power += unitPower;
            emit Factory__ToolPurchased(account, toolId, account_toolId_Amount[account][toolId], unitCost, unitPower);
        }
        ICookie(cookie).burn(account, cost);
        IRewarder(rewarder).deposit(account, power);
    }

    function upgradeTool(address account, uint256 toolId) external nonReentrant {
        uint256 currentLvl = account_toolId_Lvl[account][toolId];
        uint256 cost = toolId_BaseCost[toolId] * lvl_CostMultiplier[currentLvl + 1];
        if (cost == 0) revert Factory__LevelMaxed();
        if (account_toolId_Amount[account][toolId] < lvl_Unlock[currentLvl + 1]) revert Factory__UpgradeLocked();
        IRewarder(rewarder).getReward(account);
        account_toolId_Lvl[account][toolId]++;
        uint256 power = (getToolPower(toolId, currentLvl + 1) - getToolPower(toolId, currentLvl))
            * account_toolId_Amount[account][toolId];
        emit Factory__ToolUpgraded(account, toolId, account_toolId_Lvl[account][toolId], cost, power);
        ICookie(cookie).burn(account, cost);
        IRewarder(rewarder).deposit(account, power);
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
            toolId_BasePower[i] = baseCps[arrayIndex];
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

    function getToolPower(uint256 toolId, uint256 lvl) public view returns (uint256) {
        return toolId_BasePower[toolId] * 2 ** lvl;
    }

    function getToolCost(uint256 toolId, uint256 amount) public view returns (uint256) {
        if (amount >= amountIndex) revert Factory__AmountMaxed();
        return toolId_BaseCost[toolId] * amount_CostMultiplier[amount] / PRECISION;
    }

    function distribute() external {
        uint256 duration = IRewarder(rewarder).duration();
        uint256 balance = IERC20(cookie).balanceOf(address(this));
        uint256 left = IRewarder(rewarder).left(cookie);
        if (balance > left && balance > duration) {
            IERC20(cookie).safeApprove(rewarder, 0);
            IERC20(cookie).safeApprove(rewarder, balance);
            IRewarder(rewarder).notifyRewardAmount(cookie, balance);
        }
    }
}
