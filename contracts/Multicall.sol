// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IClicker {
    function buildingIndex() external view returns (uint256);
    function getClicker(uint256 clickerId) external view returns (string memory name, uint256 cps, uint256 cpc, uint256 last, uint256 lvl, uint256 cost, uint256 claimable);
    function getBuilding(uint256 clickerId, uint256 buildingId) external view returns (uint256 amount, uint256 lvl, uint256 cpsPerUnit, uint256 totalCps, uint256 purchaseCost, uint256 upgradeCost);
}

contract Multicall {

    address public immutable cookie;
    address public immutable clicker;

    struct ClickerState {
        string name;
        uint256 id;
        uint256 cookies;
        uint256 claimable;
        uint256 cpc;
        uint256 cps;
        uint256 lvl;
        uint256 upgradeCost;
    }

    struct BuildingState {
        uint256 id;
        uint256 amount;
        uint256 lvl;
        uint256 cpsPerUnit;
        uint256 totalCps;
        uint256 purchaseCost;
        uint256 upgradeCost;
    }

    constructor(address _cookie, address _clicker) {
        cookie = _cookie;
        clicker = _clicker;
    }

    function getClickerState(uint256 clickerId) external view returns (ClickerState memory clickerState) {
        (string memory name, uint256 cps, uint256 cpc, , uint256 lvl, uint256 cost, uint256 claimable) = IClicker(clicker).getClicker(clickerId);
        clickerState.id = clickerId;
        clickerState.name = name;
        clickerState.cookies = IERC20(cookie).balanceOf(IERC721(clicker).ownerOf(clickerId));
        clickerState.claimable = claimable;
        clickerState.cpc = cpc;
        clickerState.cps = cps;
        clickerState.lvl = lvl;
        clickerState.upgradeCost = cost;
    }

    function getBuildingState(uint256 clickerId) external view returns (BuildingState[] memory buildingState) {
        uint256 buildingCount = IClicker(clicker).buildingIndex();
        buildingState = new BuildingState[](buildingCount);
        for (uint256 i = 0; i < buildingCount; i++) {
            (uint256 amount, uint256 lvl, uint256 cpsPerUnit, uint256 totalCps, uint256 purchaseCost, uint256 upgradeCost) = IClicker(clicker).getBuilding(clickerId, i);
            buildingState[i].id = i;
            buildingState[i].amount = amount;
            buildingState[i].lvl = lvl;
            buildingState[i].cpsPerUnit = cpsPerUnit;
            buildingState[i].totalCps = totalCps;
            buildingState[i].purchaseCost = purchaseCost;
            buildingState[i].upgradeCost = upgradeCost;
        }
    }

}