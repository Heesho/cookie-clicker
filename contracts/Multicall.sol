// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IWBERA {
    function deposit() external payable;
}

interface IFactory {
    function tokenId_Ups(uint256 tokenId) external view returns (uint256);
    function tokenId_Last(uint256 tokenId) external view returns (uint256);
    function tokenId_toolId_Amount(uint256 tokenId, uint256 toolId) external view returns (uint256);
    function tokenId_toolId_Lvl(uint256 tokenId, uint256 toolId) external view returns (uint256);

    function toolId_BaseCost(uint256 toolId) external view returns (uint256);
    function lvl_CostMultiplier(uint256 lvl) external view returns (uint256);
    function lvl_Unlock(uint256 lvl) external view returns (uint256);
    function toolIndex() external view returns (uint256);
    function amountIndex() external view returns (uint256);

    function getToolCost(uint256 toolId, uint256 amount) external view returns (uint256);
    function getMultipleToolCost(uint256 toolId, uint256 initialAmount, uint256 finalAmount) external view returns (uint256);
    function getToolUps(uint256 toolId, uint256 lvl) external view returns (uint256);
}

interface IQueuePlugin {
    function click(uint256 tokenId, string calldata message) external returns (uint256 mintAmount);
    function getPrice() external view returns (uint256);
    function getPower(uint256 tokenId) external view returns (uint256);
    function getGauge() external view returns (address);
}

interface IGauge {
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function getRewardForDuration(address reward) external view returns (uint256);
    function earned(address account, address reward) external view returns (uint256);
}

contract Multicall {
    using SafeERC20 for IERC20;

    uint256 constant DURATION = 28800; // 8 hours

    address public immutable base;
    address public immutable units;
    address public immutable factory;
    address public immutable key;
    address public immutable plugin;
    address public immutable oBERO;

    struct GaugeState {
        uint256 rewardPerToken;
        uint256 totalSupply;
        uint256 balance;
        uint256 earned;
        uint256 oBeroBalance;
    }

    struct FactoryState {
        uint256 unitsBalance;
        uint256 ups;
        uint256 upc;
        uint256 capacity;
        uint256 claimable;
        bool full;
    }

    struct ToolUpgradeState {
        uint256 id;
        uint256 cost;
        bool upgradeable;
    }

    struct ToolState {
        uint256 id;
        uint256 amount;
        uint256 cost;
        uint256 ups;
        uint256 upsTotal;
        uint256 percentOfProduction;
        bool maxed;
    }

    constructor(address _base, address _units, address _factory, address _key, address _plugin, address _oBERO) {
        base = _base;
        units = _units;
        factory = _factory;
        key = _key;
        plugin = _plugin;
        oBERO = _oBERO;
    }

    function click(uint256 tokenId, uint256 amount, string calldata message) external payable returns (uint256 mintAmount) {
        uint256 price = IQueuePlugin(plugin).getPrice() * amount;
        IWBERA(base).deposit{value: price}();
        IERC20(base).safeApprove(plugin, 0);
        IERC20(base).safeApprove(plugin, price);

        for (uint256 i = 0; i < amount; i++) {
            mintAmount += IQueuePlugin(plugin).click(tokenId, message);
        }
    }

    function getMultipleToolCost(uint256 tokenId, uint256 toolId, uint256 purchaseAmount) external view returns (uint256) {
        uint256 currentAmount = IFactory(factory).tokenId_toolId_Amount(tokenId, toolId);
        return IFactory(factory).getMultipleToolCost(toolId, currentAmount, currentAmount + purchaseAmount);
    }

    function getGauge(address account) external view returns (GaugeState memory gaugeState) {
        address gauge = IQueuePlugin(plugin).getGauge();
        if (gauge != address(0)) {
            gaugeState.rewardPerToken = IGauge(gauge).totalSupply() == 0 ? 0 : (IGauge(gauge).getRewardForDuration(oBERO) * 1e18 / IGauge(gauge).totalSupply());
            gaugeState.totalSupply = IGauge(gauge).totalSupply();
            gaugeState.balance = IGauge(gauge).balanceOf(account);
            gaugeState.earned = IGauge(gauge).earned(account, oBERO);
            gaugeState.oBeroBalance = IERC20(oBERO).balanceOf(account);
        }
    }

    function getFactory(uint256 tokenId) external view returns (FactoryState memory factoryState) {
        factoryState.unitsBalance = IERC20(units).balanceOf(IERC721(key).ownerOf(tokenId));
        factoryState.ups = IFactory(factory).tokenId_Ups(tokenId);
        factoryState.upc = IQueuePlugin(plugin).getPower(tokenId);
        uint256 amount = factoryState.ups * (block.timestamp - IFactory(factory).tokenId_Last(tokenId));
        factoryState.capacity = factoryState.ups * DURATION;
        factoryState.claimable = amount >= factoryState.capacity ? factoryState.capacity : amount;
        factoryState.full = amount >= factoryState.capacity;
    }

    function getUpgrades(uint256 tokenId) external view returns (ToolUpgradeState[] memory toolUpgradeState) {
        uint256 toolCount = IFactory(factory).toolIndex();
        toolUpgradeState = new ToolUpgradeState[](toolCount);
        for (uint256 i = 0; i < toolCount; i++) {
            uint256 lvl = IFactory(factory).tokenId_toolId_Lvl(tokenId, i);
            uint256 amount = IFactory(factory).tokenId_toolId_Amount(tokenId, i);
            uint256 amountRequired = IFactory(factory).lvl_Unlock(lvl + 1);
            toolUpgradeState[i].id = i;
            toolUpgradeState[i].cost = IFactory(factory).toolId_BaseCost(i) * IFactory(factory).lvl_CostMultiplier(lvl + 1);
            toolUpgradeState[i].upgradeable = amount < amountRequired || toolUpgradeState[i].cost == 0 ? false : true;
        }
    }

    function getTools(uint256 tokenId) external view returns (ToolState[] memory toolState) {
        uint256 toolCount = IFactory(factory).toolIndex();
        toolState = new ToolState[](toolCount);
        for (uint256 i = 0; i < toolCount; i++) {
            toolState[i].id = i;
            toolState[i].amount = IFactory(factory).tokenId_toolId_Amount(tokenId, i);
            toolState[i].maxed = IFactory(factory).tokenId_toolId_Amount(tokenId, i) == IFactory(factory).amountIndex();
            toolState[i].cost = toolState[i].maxed ? 0 : IFactory(factory).getToolCost(i, toolState[i].amount);
            uint256 lvl = IFactory(factory).tokenId_toolId_Lvl(tokenId, i);
            toolState[i].ups = IFactory(factory).getToolUps(i, lvl);
            toolState[i].upsTotal = toolState[i].ups * toolState[i].amount;
            toolState[i].percentOfProduction = IFactory(factory).tokenId_Ups(tokenId) == 0 ? 0 : toolState[i].upsTotal * 1e18 * 100 / IFactory(factory).tokenId_Ups(tokenId);
        }
    }

}