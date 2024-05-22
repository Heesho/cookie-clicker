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

    uint256 public baseCpc = 15 * PRECISION;    // 15 cookies per click
    mapping(uint256 => uint256) public clickerLvl_Cost;     // clicker level => cost to upgrade
    mapping(uint256 => uint256) public buildingId_BaseCost; // building id => base cost
    mapping(uint256 => uint256) public buildingId_BaseCps;  // building id => base cookies per second
    mapping(uint256 => uint256) public buildingId_MaxAmount;   // building id => max amount
    mapping(uint256 => mapping(uint256 => uint256)) public buildingId_Lvl_Cost; // building id => level => cost
    
    mapping(uint256 => uint256) public clickerId_Cps;   // clicker id => cookies per second
    mapping(uint256 => uint256) public clickerId_Last;  // clicker id => last time claimed
    mapping(uint256 => uint256) public clickerId_Lvl;   // clicker id => level
    mapping(uint256 => mapping(uint256 => uint256)) public clickerId_buildingId_Amount; // clicker id => building id => amount
    mapping(uint256 => mapping(uint256 => uint256)) public clickerId_buildingId_Lvl;    // clicker id => building id => level

    /*----------  ERRORS ------------------------------------------------*/

    error Clicker__AmountMaxed();
    error Clicker__LevelMaxed();
    error Clicker__InvalidInput();

    /*----------  EVENTS ------------------------------------------------*/

    event Clicker__ClickerPurchased(address indexed owner, address indexed clickerId);
    event Clicker__ClickerUpgraded(uint256 indexed clickerId, uint256 newLevel, uint256 cost, uint256 cpc);
    event Clicker__BuildingPurchased(uint256 indexed clickerId, uint256 buildingId, uint256 newAmount, uint256 cost, uint256 cps);
    event Clicker__BuildingUpgraded(uint256 indexed clickerId, uint256 buildingId, uint256 newLevel, uint256 cost, uint256 cps);
    event Clicker__Claimed(uint256 indexed clickerId, uint256 amount);
    event Clicker__ClickerLvlSet(uint256 clickerLvl, uint256 cost);
    event Clicker__BuildingSet(uint256 buildingId, uint256 baseCps, uint256 baseCost, uint256 maxAmount);
    event Clicker__BuildingMaxAmountSet(uint256 buildingId, uint256 maxAmount);
    event Clicker__BuildingLvlSet(uint256 buildingId, uint256 lvl, uint256 cost);

    /*----------  MODIFIERS  --------------------------------------------*/

    /*----------  FUNCTIONS  --------------------------------------------*/

    constructor(address _cookie) ERC721("Clicker", "CLICKER") Ownable(msg.sender) {
        cookie = _cookie;
    }

    function mintClicker() external {
        ICookie(cookie).burn(msg.sender, clickerCost);
        _safeMint(msg.sender, nextClickerId);
        emit Clicker__ClickerPurchased(msg.sender, nextClickerId);
        nextClickerId++;
    }

    function click(uint256 clickerId) external {
        uint256 amount = baseCpc * 2 ** (clickerId_Lvl[clickerId] - 1);
        emit Clicker__Claimed(clickerId, amount);
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
        emit Clicker__ClickerUpgraded(clickerId, clickerId_Lvl[clickerId], cost, clickerId_Cps[clickerId]);
        ICookie(cookie).burn(msg.sender, cost);
    }

    function purchaseBuilding(uint256 clickerId, uint256 buildingId) external {
        uint256 currentAmount = clickerId_buildingId_Amount[clickerId][buildingId];
        if (currentAmount == buildingId_MaxAmount[buildingId]) revert Clicker__AmountMaxed();
        claim(clickerId);
        uint256 cost = buildingId_BaseCost[buildingId] * 2 ** (currentAmount + 1);
        clickerId_buildingId_Amount[clickerId][buildingId]++;
        clickerId_Cps[clickerId] += buildingId_BaseCps[buildingId] * 2 ** (clickerId_buildingId_Lvl[clickerId][buildingId] - 1);
        emit Clicker__BuildingPurchased(clickerId, buildingId, clickerId_buildingId_Amount[clickerId][buildingId], cost, clickerId_Cps[clickerId]);
        ICookie(cookie).burn(msg.sender, cost);
    }

    function upgradeBuilding(uint256 clickerId, uint256 buildingId) external {
        uint256 currentLvl = clickerId_buildingId_Lvl[clickerId][buildingId];
        uint256 cost = buildingId_Lvl_Cost[buildingId][currentLvl + 1];
        if (cost == 0) revert Clicker__LevelMaxed();
        claim(clickerId); 
        clickerId_buildingId_Lvl[clickerId][buildingId]++;
        clickerId_Cps[clickerId] += (buildingId_BaseCps[buildingId] * 2 ** (clickerId_buildingId_Lvl[clickerId][buildingId] - 1) - buildingId_BaseCps[buildingId] * 2 ** (currentLvl - 1)) * clickerId_buildingId_Amount[clickerId][buildingId];
        emit Clicker__BuildingUpgraded(clickerId, buildingId, clickerId_buildingId_Lvl[clickerId][buildingId], cost, clickerId_Cps[clickerId]);
        ICookie(cookie).burn(msg.sender, cost);
    }

    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/

    function setClickerLvl(uint256[] calldata clickerLvl, uint256[] calldata cost) external onlyOwner {
        if (clickerLvl.length != cost.length) revert Clicker__InvalidInput();
        for (uint256 i = 0; i < clickerLvl.length; i++) {
            if (clickerLvl_Cost[clickerLvl[i]] != 0) revert Clicker__InvalidInput();
            clickerLvl_Cost[clickerLvl[i]] = cost[i];
            emit Clicker__ClickerLvlSet(clickerLvl[i], cost[i]);
        }
    }

    function setBuilding(uint256[] calldata buildingId, uint256[] calldata baseCps, uint256[] calldata baseCost, uint256[] calldata maxAmount) external onlyOwner {
        if (buildingId.length != baseCps.length || buildingId.length != baseCost.length || buildingId.length != maxAmount.length) revert Clicker__InvalidInput();
        for (uint256 i = 0; i < buildingId.length; i++) {
            if (buildingId_BaseCps[buildingId[i]] != 0) revert Clicker__InvalidInput();
            buildingId_BaseCps[buildingId[i]] = baseCps[i];
            buildingId_BaseCost[buildingId[i]] = baseCost[i];
            buildingId_MaxAmount[buildingId[i]] = maxAmount[i];
            emit Clicker__BuildingSet(buildingId[i], baseCps[i], baseCost[i], maxAmount[i]);
        }
    }

    function setBuildingMaxAmount(uint256[] calldata buildingId, uint256[] calldata maxAmount) external onlyOwner {
        if (buildingId.length != maxAmount.length) revert Clicker__InvalidInput();
        for (uint256 i = 0; i < buildingId.length; i++) {
            if (maxAmount[i] < buildingId_MaxAmount[buildingId[i]]) revert Clicker__InvalidInput();
            buildingId_MaxAmount[buildingId[i]] = maxAmount[i];
            emit Clicker__BuildingMaxAmountSet(buildingId[i], maxAmount[i]);
        }
    }

    function setBuildingLvl(uint256 buildingId, uint256[] calldata lvl, uint256[] calldata cost) external onlyOwner {
        if (lvl.length != cost.length) revert Clicker__InvalidInput();
        for (uint256 i = 0; i < lvl.length; i++) {
            if (buildingId_Lvl_Cost[buildingId][lvl[i]] != 0) revert Clicker__InvalidInput();
            buildingId_Lvl_Cost[buildingId][lvl[i]] = cost[i];
            emit Clicker__BuildingLvlSet(buildingId, lvl[i], cost[i]);
        }
    }

    /*----------  VIEW FUNCTIONS  ---------------------------------------*/
}