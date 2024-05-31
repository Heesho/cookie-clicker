// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IClicker {
    function clickerId_Lvl(uint256 clickerId) external view returns (uint256);
    function clickerId_Cps(uint256 clickerId) external view returns (uint256);
    function clickerId_Last(uint256 clickerId) external view returns (uint256);
    function clickerId_Clicks(uint256 clickerId) external view returns (uint256);
    function clickerId_buildingId_Amount(uint256 clickerId, uint256 buildingId) external view returns (uint256);
    function clickerId_buildingId_Lvl(uint256 clickerId, uint256 buildingId) external view returns (uint256);

    function clickerBaseCost() external view returns (uint256);
    function buildingId_BaseCost(uint256 buildingId) external view returns (uint256);
    function lvl_CostMultiplier(uint256 lvl) external view returns (uint256);
    function lvl_Unlock(uint256 lvl) external view returns (uint256);
    function buildingIndex() external view returns (uint256);

    function getBuildingCost(uint256 buildingId, uint256 amount) external view returns (uint256);
    function getBuildingCps(uint256 buildingId, uint256 lvl) external view returns (uint256);
}

contract Multicall {

    uint256 constant DURATION = 28800; // 8 hours

    address public immutable cookie;
    address public immutable clicker;

    struct BakeryState {
        uint256 cookies;
        uint256 cps;
        uint256 capacity;
        uint256 claimable;
        bool full;
    }

    struct ClickerUpgradeState {
        uint256 cost;
        bool upgradeable;
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
    }

    constructor(address _cookie, address _clicker) {
        cookie = _cookie;
        clicker = _clicker;
    }

    function getBakery(uint256 clickerId) external view returns (BakeryState memory bakeryState) {
        bakeryState.cookies = IERC20(cookie).balanceOf(IERC721(clicker).ownerOf(clickerId));
        bakeryState.cps = IClicker(clicker).clickerId_Cps(clickerId);
        uint256 amount = bakeryState.cps * (block.timestamp - IClicker(clicker).clickerId_Last(clickerId));
        bakeryState.capacity = bakeryState.cps * DURATION;
        bakeryState.claimable = amount >= bakeryState.capacity ? bakeryState.capacity : amount;
        bakeryState.full = amount >= bakeryState.capacity;
    }

    function getUpgrades(uint256 clickerId) external view returns (ClickerUpgradeState memory clickerUpgradeState, BuildingUpgradeState[] memory buildingUpgradeState) {
        uint256 clickerLvl = IClicker(clicker).clickerId_Lvl(clickerId);
        uint256 clicks = IClicker(clicker).clickerId_Clicks(clickerId);
        uint256 clicksRequired = IClicker(clicker).lvl_Unlock(clickerLvl + 1);
        clickerUpgradeState.cost = IClicker(clicker).clickerBaseCost() * IClicker(clicker).lvl_CostMultiplier(clickerLvl + 1);
        clickerUpgradeState.upgradeable = clicks < clicksRequired || clickerUpgradeState.cost == 0 ? false : true;
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
            buildingState[i].cost = IClicker(clicker).getBuildingCost(i, buildingState[i].amount);
            uint256 lvl = IClicker(clicker).clickerId_buildingId_Lvl(clickerId, i);
            buildingState[i].cpsPerUnit = IClicker(clicker).getBuildingCps(i, lvl);
            buildingState[i].cpsTotal = buildingState[i].cpsPerUnit * buildingState[i].amount;
            buildingState[i].percentOfProduction = buildingState[i].cpsTotal * 100 / IClicker(clicker).clickerId_Cps(clickerId);
        }
    }

}