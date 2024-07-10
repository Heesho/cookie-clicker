// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IClicker {
    function gameCost() external view returns (uint256);

    function clickerId_Power(uint256 clickerId) external view returns (uint256);
    function clickerId_Cps(uint256 clickerId) external view returns (uint256);
    function clickerId_Last(uint256 clickerId) external view returns (uint256);
    function clickerId_buildingId_Amount(uint256 clickerId, uint256 buildingId) external view returns (uint256);
    function clickerId_buildingId_Lvl(uint256 clickerId, uint256 buildingId) external view returns (uint256);

    function buildingId_BaseCost(uint256 buildingId) external view returns (uint256);
    function lvl_CostMultiplier(uint256 lvl) external view returns (uint256);
    function lvl_Unlock(uint256 lvl) external view returns (uint256);
    function buildingIndex() external view returns (uint256);
    function amountIndex() external view returns (uint256);

    function getBuildingCost(uint256 buildingId, uint256 amount) external view returns (uint256);
    function getMultipleBuildingCost(uint256 buildingId, uint256 initialAmount, uint256 finalAmount) external view returns (uint256);
    function getBuildingCps(uint256 buildingId, uint256 lvl) external view returns (uint256);
}

interface IClickerPlugin {
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

    uint256 constant DURATION = 28800; // 8 hours

    address public immutable cookie;
    address public immutable clicker;
    address public immutable plugin;
    address public immutable oBERO;

    struct GaugeState {
        uint256 rewardPerToken;
        uint256 totalSupply;
        uint256 balance;
        uint256 reward;
    }

    struct BakeryState {
        uint256 cookies;
        uint256 cps;
        uint256 cpc;
        uint256 capacity;
        uint256 claimable;
        uint256 cursors;
        bool full;
    }

    struct BuildingUpgradeState {
        uint256 id;
        uint256 cost;
        bool upgradeable;
    }

    struct BuildingState {
        uint256 id;
        uint256 amount;
        uint256 cost;
        uint256 cpsPerUnit;
        uint256 cpsTotal;
        uint256 percentOfProduction;
        bool maxed;
    }

    constructor(address _cookie, address _clicker, address _plugin, address _oBERO) {
        cookie = _cookie;
        clicker = _clicker;
        plugin = _plugin;
        oBERO = _oBERO;
    }

    function getGameCost() external view returns (uint256) {
        return IClicker(clicker).gameCost();
    }

    function getMultipleBuildingCost(uint256 clickerId, uint256 buildingId, uint256 purchaseAmount) external view returns (uint256) {
        uint256 currentAmount = IClicker(clicker).clickerId_buildingId_Amount(clickerId, buildingId);
        return IClicker(clicker).getMultipleBuildingCost(buildingId, currentAmount, currentAmount + purchaseAmount);
    }

    function getGauge(address account) external view returns (GaugeState memory gaugeState) {
        address gauge = IClickerPlugin(plugin).getGauge();
        if (gauge != address(0)) {
            gaugeState.rewardPerToken = IGauge(gauge).totalSupply() == 0 ? 0 : (IGauge(gauge).getRewardForDuration(oBERO) * 1e18 / IGauge(gauge).totalSupply());
            gaugeState.totalSupply = IGauge(gauge).totalSupply();
            gaugeState.balance = IGauge(gauge).balanceOf(account);
            gaugeState.reward = IGauge(gauge).earned(account, oBERO);
        }
    }

    function getBakery(uint256 clickerId) external view returns (BakeryState memory bakeryState) {
        bakeryState.cookies = IERC20(cookie).balanceOf(IERC721(clicker).ownerOf(clickerId));
        bakeryState.cps = IClicker(clicker).clickerId_Cps(clickerId);
        bakeryState.cpc = IClickerPlugin(plugin).getPower(clickerId);
        uint256 amount = bakeryState.cps * (block.timestamp - IClicker(clicker).clickerId_Last(clickerId));
        bakeryState.capacity = bakeryState.cps * DURATION;
        bakeryState.claimable = amount >= bakeryState.capacity ? bakeryState.capacity : amount;
        bakeryState.cursors = IClicker(clicker).clickerId_buildingId_Amount(clickerId, 0);
        bakeryState.full = amount >= bakeryState.capacity;
    }

    function getUpgrades(uint256 clickerId) external view returns (BuildingUpgradeState[] memory buildingUpgradeState) {
        uint256 buildingCount = IClicker(clicker).buildingIndex();
        buildingUpgradeState = new BuildingUpgradeState[](buildingCount);
        for (uint256 i = 0; i < buildingCount; i++) {
            uint256 lvl = IClicker(clicker).clickerId_buildingId_Lvl(clickerId, i);
            uint256 amount = IClicker(clicker).clickerId_buildingId_Amount(clickerId, i);
            uint256 amountRequired = IClicker(clicker).lvl_Unlock(lvl + 1);
            buildingUpgradeState[i].id = i;
            buildingUpgradeState[i].cost = IClicker(clicker).buildingId_BaseCost(i) * IClicker(clicker).lvl_CostMultiplier(lvl + 1);
            buildingUpgradeState[i].upgradeable = amount < amountRequired || buildingUpgradeState[i].cost == 0 ? false : true;
        }
    }

    function getBuildings(uint256 clickerId) external view returns (BuildingState[] memory buildingState) {
        uint256 buildingCount = IClicker(clicker).buildingIndex();
        buildingState = new BuildingState[](buildingCount);
        for (uint256 i = 0; i < buildingCount; i++) {
            buildingState[i].id = i;
            buildingState[i].amount = IClicker(clicker).clickerId_buildingId_Amount(clickerId, i);
            buildingState[i].maxed = IClicker(clicker).amountIndex() == buildingState[i].amount;
            buildingState[i].cost = buildingState[i].maxed ? 0 : IClicker(clicker).getBuildingCost(i, buildingState[i].amount);
            uint256 lvl = IClicker(clicker).clickerId_buildingId_Lvl(clickerId, i);
            buildingState[i].cpsPerUnit = IClicker(clicker).getBuildingCps(i, lvl);
            buildingState[i].cpsTotal = buildingState[i].cpsPerUnit * buildingState[i].amount;
            buildingState[i].percentOfProduction = IClicker(clicker).clickerId_Cps(clickerId) == 0 ? 0 : buildingState[i].cpsTotal * 1e18 * 100 / IClicker(clicker).clickerId_Cps(clickerId);

        }
    }

}