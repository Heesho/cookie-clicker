// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface ICookie {
    function mint(address account, uint256 amount) external;
    function burn(address account, uint256 amount) external;
}

contract Clicker is ERC721, Ownable {

    /*----------  CONSTANTS  --------------------------------------------*/

    uint256 constant PRECISION = 1e18;

    /*----------  STATE VARIABLES  --------------------------------------*/

    address immutable public cookie;

    uint256 public clickerCost = 1000000000000000000; // 1 eth
    uint256 public nextClickerId = 1;

    uint256 public clickerIndex = 0;
    uint256 public baseCpc = 15 * PRECISION;    // 15 cookies per click
    mapping(uint256 => uint256) public clickerLvl_Cost;     // clicker level => cost to upgrade

    uint256 public buildingIndex = 0;
    mapping(uint256 => uint256) public buildingId_BaseCost; // building id => base cost
    mapping(uint256 => uint256) public buildingId_BaseCps;  // building id => base cookies per second
    mapping(uint256 => uint256) public buildingId_MaxAmount;   // building id => max amount

    mapping(uint256 => uint256) public buildingId_LvlIndex; // building id => level index
    mapping(uint256 => mapping(uint256 => uint256)) public buildingId_Lvl_Cost; // building id => level => cost
    
    mapping(uint256 => string) public clickerId_Name;   // clicker id => name
    mapping(uint256 => uint256) public clickerId_Cps;   // clicker id => cookies per second
    mapping(uint256 => uint256) public clickerId_Cpc;   // clicker id => cookies per click
    mapping(uint256 => uint256) public clickerId_Last;  // clicker id => last time claimed
    mapping(uint256 => uint256) public clickerId_Lvl;   // clicker id => level
    mapping(uint256 => mapping(uint256 => uint256)) public clickerId_buildingId_Amount; // clicker id => building id => amount
    mapping(uint256 => mapping(uint256 => uint256)) public clickerId_buildingId_Lvl;    // clicker id => building id => level

    /*----------  ERRORS ------------------------------------------------*/

    error Clicker__InvalidPayment();
    error Clicker__AmountMaxed();
    error Clicker__LevelMaxed();
    error Clicker__InvalidInput();

    /*----------  EVENTS ------------------------------------------------*/

    event Clicker__ClickerMinted(address indexed owner, uint256 indexed clickerId);
    event Clicker__ClickerUpgraded(uint256 indexed clickerId, uint256 newLevel, uint256 cost, uint256 cpc);
    event Clicker__BuildingPurchased(uint256 indexed clickerId, uint256 buildingId, uint256 newAmount, uint256 cost, uint256 cps);
    event Clicker__BuildingUpgraded(uint256 indexed clickerId, uint256 buildingId, uint256 newLevel, uint256 cost, uint256 cps);
    event Clicker__Clicked(uint256 indexed clickerId, uint256 amount);
    event Clicker__Claimed(uint256 indexed clickerId, uint256 amount);
    event Clicker__ClickerLvlSet(uint256 clickerLvl, uint256 cost);
    event Clicker__BuildingSet(uint256 buildingId, uint256 baseCps, uint256 baseCost, uint256 maxAmount);
    event Clicker__BuildingMaxAmountSet(uint256 buildingId, uint256 maxAmount);
    event Clicker__BuildingLvlSet(uint256 buildingId, uint256 lvl, uint256 cost);

    /*----------  MODIFIERS  --------------------------------------------*/

    /*----------  FUNCTIONS  --------------------------------------------*/

    constructor(address _cookie) ERC721("Clicker", "CLICKER") {
        cookie = _cookie;
    }

    function mint() external payable {
        if (msg.value != clickerCost) revert Clicker__InvalidPayment();
        payable(owner()).transfer(clickerCost);
        _safeMint(msg.sender, nextClickerId);
        clickerId_Name[nextClickerId] = "Clicker";
        clickerId_Lvl[nextClickerId] = 0;
        clickerId_Last[nextClickerId] = block.timestamp;
        clickerId_Cpc[nextClickerId] = getClickerCpc(nextClickerId);
        emit Clicker__ClickerMinted(msg.sender, nextClickerId);
        nextClickerId++;
    }

    function click(uint256 clickerId) external {
        uint256 amount = clickerId_Cpc[clickerId];
        emit Clicker__Clicked(clickerId, amount);
        ICookie(cookie).mint(ownerOf(clickerId), amount);
    }

    function claim(uint256 clickerId) public {
        uint256 amount = clickerId_Cps[clickerId] * (block.timestamp - clickerId_Last[clickerId]);
        clickerId_Last[clickerId] = block.timestamp;
        emit Clicker__Claimed(clickerId, amount);
        ICookie(cookie).mint(ownerOf(clickerId), amount);
    }

    function upgradeClicker(uint256 clickerId) external {
        uint256 cost = clickerLvl_Cost[clickerId_Lvl[clickerId] + 1];
        if (cost == 0) revert Clicker__LevelMaxed();
        clickerId_Lvl[clickerId]++;
        clickerId_Cpc[clickerId] = getClickerCpc(clickerId);
        emit Clicker__ClickerUpgraded(clickerId, clickerId_Lvl[clickerId], cost, clickerId_Cps[clickerId]);
        ICookie(cookie).burn(msg.sender, cost);
    }

    function purchaseBuilding(uint256 clickerId, uint256 buildingId) external {
        uint256 currentAmount = clickerId_buildingId_Amount[clickerId][buildingId];
        if (currentAmount == buildingId_MaxAmount[buildingId]) revert Clicker__AmountMaxed();
        claim(clickerId);
        uint256 cost = getBuildingCost(buildingId, currentAmount);
        clickerId_buildingId_Amount[clickerId][buildingId]++;
        clickerId_Cps[clickerId] += getBuildingCps(buildingId, clickerId_buildingId_Lvl[clickerId][buildingId]);
        emit Clicker__BuildingPurchased(clickerId, buildingId, clickerId_buildingId_Amount[clickerId][buildingId], cost, clickerId_Cps[clickerId]);
        ICookie(cookie).burn(msg.sender, cost);
    }

    function upgradeBuilding(uint256 clickerId, uint256 buildingId) external {
        uint256 currentLvl = clickerId_buildingId_Lvl[clickerId][buildingId];
        uint256 cost = buildingId_Lvl_Cost[buildingId][currentLvl + 1];
        if (cost == 0) revert Clicker__LevelMaxed();
        claim(clickerId); 
        clickerId_buildingId_Lvl[clickerId][buildingId]++;
        clickerId_Cps[clickerId] += (getBuildingCps(buildingId, currentLvl + 1) - getBuildingCps(buildingId, currentLvl)) * clickerId_buildingId_Amount[clickerId][buildingId];
        emit Clicker__BuildingUpgraded(clickerId, buildingId, clickerId_buildingId_Lvl[clickerId][buildingId], cost, clickerId_Cps[clickerId]);
        ICookie(cookie).burn(msg.sender, cost);
    }

    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/

    function setClickerLvl(uint256[] calldata cost) external onlyOwner {
        for (uint256 i = clickerIndex; i < clickerIndex + cost.length; i++) {
            clickerLvl_Cost[i] = cost[i];
            emit Clicker__ClickerLvlSet(i, cost[i]);
        }
        clickerIndex += cost.length;
    }

    function setBuilding(uint256[] calldata baseCps, uint256[] calldata baseCost, uint256[] calldata maxAmount) external onlyOwner {
        if (baseCps.length != baseCost.length || baseCps.length != maxAmount.length) revert Clicker__InvalidInput();
        for (uint256 i = buildingIndex; i < buildingIndex + baseCps.length; i++) {
            buildingId_BaseCps[i] = baseCps[i];
            buildingId_BaseCost[i] = baseCost[i];
            buildingId_MaxAmount[i] = maxAmount[i];
            emit Clicker__BuildingSet(i, baseCps[i], baseCost[i], maxAmount[i]);
        }
        buildingIndex += baseCps.length;
    }

    function setBuildingMaxAmount(uint256[] calldata buildingId, uint256[] calldata maxAmount) external onlyOwner {
        if (buildingId.length != maxAmount.length) revert Clicker__InvalidInput();
        for (uint256 i = 0; i < buildingId.length; i++) {
            if (maxAmount[i] < buildingId_MaxAmount[buildingId[i]]) revert Clicker__InvalidInput();
            buildingId_MaxAmount[buildingId[i]] = maxAmount[i];
            emit Clicker__BuildingMaxAmountSet(buildingId[i], maxAmount[i]);
        }
    }

    function setBuildingLvl(uint256 buildingId, uint256[] calldata cost) external onlyOwner {
        for (uint256 i = buildingId_LvlIndex[buildingId]; i < buildingId_LvlIndex[buildingId] + cost.length; i++) {
            buildingId_Lvl_Cost[buildingId][i] = cost[i];
            emit Clicker__BuildingLvlSet(buildingId, i, cost[i]);
        }
        buildingId_LvlIndex[buildingId] += cost.length;
    }

    /*----------  VIEW FUNCTIONS  ---------------------------------------*/

    function getClickerCpc(uint256 clickerId) public view returns (uint256) {
        return baseCpc * 2 ** clickerId_Lvl[clickerId];
    }
        
    function getBuildingCost(uint256 buildingId, uint256 amount) public view returns (uint256) {
        return amount == 0 ? buildingId_BaseCost[buildingId] : buildingId_BaseCost[buildingId] * (115 ** amount) / (100 ** amount);
    }

    function getBuildingCps(uint256 buildingId, uint256 lvl) public view returns (uint256) {
        return buildingId_BaseCps[buildingId] * 2 ** lvl;
    }

    function getClicker(uint256 clickerId) external view returns (string memory name, uint256 cps, uint256 cpc, uint256 last, uint256 lvl, uint256 cost, uint256 claimable) {
        name = clickerId_Name[clickerId];
        cps = clickerId_Cps[clickerId];
        cpc = getClickerCpc(clickerId);
        last = clickerId_Last[clickerId];
        lvl = clickerId_Lvl[clickerId];
        cost = clickerLvl_Cost[lvl + 1];
        claimable = clickerId_Cps[clickerId] * (block.timestamp - clickerId_Last[clickerId]);
    }

    function getBuilding(uint256 clickerId, uint256 buildingId) external view returns (uint256 amount, uint256 lvl, uint256 cpsPerUnit, uint256 totalCps, uint256 purchaseCost, uint256 upgradeCost) {
        amount = clickerId_buildingId_Amount[clickerId][buildingId];
        lvl = clickerId_buildingId_Lvl[clickerId][buildingId];
        cpsPerUnit = getBuildingCps(buildingId, lvl);
        totalCps = cpsPerUnit * amount;
        purchaseCost = getBuildingCost(buildingId, amount);
        upgradeCost = buildingId_Lvl_Cost[buildingId][lvl + 1];
    }

}