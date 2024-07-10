// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

interface ICookie {
    function mint(address account, uint256 amount) external;
    function burn(address account, uint256 amount) external;
}

contract Clicker is ERC721Enumerable, Ownable {

    /*----------  CONSTANTS  --------------------------------------------*/

    uint256 constant PRECISION = 1e18;   
    uint256 constant DURATION = 28800;  // 8 hours

    /*----------  STATE VARIABLES  --------------------------------------*/

    address immutable public cookie;

    uint256 public gameCost = 10000000000000000; // 0.01 ether
    uint256 public nextClickerId = 1;
    uint256 public maxPower = 1000000000 * PRECISION;

    uint256 public lvlIndex;
    mapping(uint256 => uint256) public lvl_Unlock;          // level => amount required to unlock
    mapping(uint256 => uint256) public lvl_CostMultiplier;  // level => cost multiplier

    uint256 public buildingIndex = 0;
    uint256 public amountIndex = 0;
    mapping(uint256 => uint256) public buildingId_BaseCost;     // building id => base cost
    mapping(uint256 => uint256) public buildingId_BaseCps;      // building id => base cookies per second
    mapping(uint256 => uint256) public amount_CostMultiplier;   // building amount => cost multiplier
    
    mapping(uint256 => string) public clickerId_Name;       // clicker id => name
    mapping(uint256 => uint256) public clickerId_Cps;       // clicker id => cookies per second
    mapping(uint256 => uint256) public clickerId_Last;      // clicker id => last time claimed
    mapping(uint256 => uint256) public clickerId_Power;     // clicker id => power

    mapping(uint256 => mapping(uint256 => uint256)) public clickerId_buildingId_Amount; // clicker id => building id => amount
    mapping(uint256 => mapping(uint256 => uint256)) public clickerId_buildingId_Lvl;    // clicker id => building id => level

    /*----------  ERRORS ------------------------------------------------*/

    error Clicker__InvalidPayment();
    error Clicker__AmountMaxed();
    error Clicker__LevelMaxed();
    error Clicker__InvalidInput();
    error Clicker__NotAuthorized();
    error Clicker__UpgradeLocked();
    error Clicker__PowerMaxed();

    /*----------  EVENTS ------------------------------------------------*/

    event Clicker__GameCostSet(uint256 cost);
    event Clicker__ClickerMinted(address indexed owner, uint256 indexed clickerId, uint256 cost);
    event Clicker__ClickerUpgraded(uint256 indexed clickerId, uint256 newLevel, uint256 cost, uint256 cpc);
    event Clicker__BuildingPurchased(uint256 indexed clickerId, uint256 buildingId, uint256 newAmount, uint256 cost, uint256 cps);
    event Clicker__BuildingUpgraded(uint256 indexed clickerId, uint256 buildingId, uint256 newLevel, uint256 cost, uint256 cps);
    event Clicker__Clicked(uint256 indexed clickerId, uint256 amount);
    event Clicker__Claimed(uint256 indexed clickerId, uint256 amount);
    event Clicker__LvlSet(uint256 lvl, uint256 cost, uint256 unlock);
    event Clicker__BuildingSet(uint256 buildingId, uint256 baseCps, uint256 baseCost);
    event Clicker__BuildingMultiplierSet(uint256 index, uint256 multiplier);
    event Clicker__MaxPowerSet(uint256 power);
    event Clicker__BurnedForPower(uint256 clickerId, uint256 amount);

    /*----------  FUNCTIONS  --------------------------------------------*/

    constructor(address _cookie) ERC721("Clicker", "CLICKER") {
        cookie = _cookie;
    }

    function mint() external payable {
        if (msg.value != gameCost) revert Clicker__InvalidPayment();
        payable(owner()).transfer(gameCost);
        _safeMint(msg.sender, nextClickerId);
        string memory tokenIdStr = Strings.toString(nextClickerId);
        clickerId_Name[nextClickerId] = string(abi.encodePacked("Bakery ", tokenIdStr));
        clickerId_Last[nextClickerId] = block.timestamp;
        emit Clicker__ClickerMinted(msg.sender, nextClickerId, gameCost);
        nextClickerId++;
    }

    function burnForPower(uint256 clickerId, uint256 amount) external {
        if (amount == 0) revert Clicker__InvalidInput();
        clickerId_Power[clickerId] += amount;
        if (clickerId_Power[clickerId] > maxPower) revert Clicker__PowerMaxed();
        ICookie(cookie).burn(msg.sender, amount);
        emit Clicker__BurnedForPower(clickerId, amount);
    }

    function claim(uint256 clickerId) public {
        uint256 amount = clickerId_Cps[clickerId] * (block.timestamp - clickerId_Last[clickerId]);
        uint256 maxAmount = clickerId_Cps[clickerId] * DURATION;
        if (amount > maxAmount) amount = maxAmount;
        clickerId_Last[clickerId] = block.timestamp;
        emit Clicker__Claimed(clickerId, amount);
        ICookie(cookie).mint(ownerOf(clickerId), amount);
    }

    function purchaseBuilding(uint256 clickerId, uint256 buildingId, uint256 buildingAmount) external {
        if (buildingAmount == 0) revert Clicker__InvalidInput();
        claim(clickerId);
        for (uint256 i = 0; i < buildingAmount; i++) {
            uint256 currentAmount = clickerId_buildingId_Amount[clickerId][buildingId];
            if (currentAmount == amountIndex) revert Clicker__AmountMaxed();
            uint256 cost = getBuildingCost(buildingId, currentAmount);
            clickerId_buildingId_Amount[clickerId][buildingId]++;
            clickerId_Cps[clickerId] += getBuildingCps(buildingId, clickerId_buildingId_Lvl[clickerId][buildingId]);
            emit Clicker__BuildingPurchased(clickerId, buildingId, clickerId_buildingId_Amount[clickerId][buildingId], cost, clickerId_Cps[clickerId]);
            ICookie(cookie).burn(msg.sender, cost);
        }
    }

    function upgradeBuilding(uint256 clickerId, uint256 buildingId) external {
        uint256 currentLvl = clickerId_buildingId_Lvl[clickerId][buildingId];
        uint256 cost = buildingId_BaseCost[buildingId] * lvl_CostMultiplier[currentLvl + 1];
        if (cost == 0) revert Clicker__LevelMaxed();
        if (clickerId_buildingId_Amount[clickerId][buildingId] < lvl_Unlock[currentLvl + 1]) revert Clicker__UpgradeLocked();
        claim(clickerId); 
        clickerId_buildingId_Lvl[clickerId][buildingId]++;
        clickerId_Cps[clickerId] += (getBuildingCps(buildingId, currentLvl + 1) - getBuildingCps(buildingId, currentLvl)) * clickerId_buildingId_Amount[clickerId][buildingId];
        emit Clicker__BuildingUpgraded(clickerId, buildingId, clickerId_buildingId_Lvl[clickerId][buildingId], cost, clickerId_Cps[clickerId]);
        ICookie(cookie).burn(msg.sender, cost);
    }

    function setName(uint256 clickerId, string calldata name) external {
        if (msg.sender != ownerOf(clickerId)) revert Clicker__NotAuthorized();
        clickerId_Name[clickerId] = name;
    }

    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/

    function setGameCost(uint256 cost) external onlyOwner {
        gameCost = cost;
        emit Clicker__GameCostSet(cost);
    }

    function setLvl(uint256[] calldata cost, uint256[] calldata unlock) external onlyOwner {
        if (cost.length != unlock.length) revert Clicker__InvalidInput();
        for (uint256 i = lvlIndex; i < lvlIndex + cost.length; i++) {
            uint256 arrayIndex = i - lvlIndex;
            lvl_CostMultiplier[i] = cost[arrayIndex];
            lvl_Unlock[i] = unlock[arrayIndex];
            emit Clicker__LvlSet(i, cost[i], unlock[i]);
        }
        lvlIndex += cost.length;
    }

    function setBuilding(uint256[] calldata baseCps, uint256[] calldata baseCost) external onlyOwner {
        if (baseCps.length != baseCost.length) revert Clicker__InvalidInput();
        for (uint256 i = buildingIndex; i < buildingIndex + baseCps.length; i++) {
            uint256 arrayIndex = i - buildingIndex;
            buildingId_BaseCps[i] = baseCps[arrayIndex];
            buildingId_BaseCost[i] = baseCost[arrayIndex];
            emit Clicker__BuildingSet(i, baseCps[arrayIndex], baseCost[arrayIndex]);
        }
        buildingIndex += baseCps.length;
    }

    function setBuildingMultipliers(uint256[] calldata multipliers) external onlyOwner {
        for (uint256 i = amountIndex; i < amountIndex + multipliers.length; i++) {
            uint256 arrayIndex = i - amountIndex;
            amount_CostMultiplier[i] = multipliers[arrayIndex];
            emit Clicker__BuildingMultiplierSet(i, multipliers[arrayIndex]);
        }
        amountIndex += multipliers.length;
    }

    function setMaxPower(uint256 power) external onlyOwner {
        if (power < maxPower) revert Clicker__InvalidInput();
        maxPower = power;
        emit Clicker__MaxPowerSet(power);
    }

    /*----------  VIEW FUNCTIONS  ---------------------------------------*/

    function getBuildingCps(uint256 buildingId, uint256 lvl) public view returns (uint256) {
        return buildingId_BaseCps[buildingId] * 2 ** lvl;
    }
        
    function getBuildingCost(uint256 buildingId, uint256 amount) public view returns (uint256) {
        if (amount >= amountIndex) revert Clicker__AmountMaxed();
        return buildingId_BaseCost[buildingId] * amount_CostMultiplier[amount] / PRECISION;
    }

    function getMultipleBuildingCost(uint256 buildingId, uint256 initialAmount, uint256 finalAmount) external view returns (uint256){
        uint256 cost = 0;
        for (uint256 i = initialAmount; i < finalAmount; i++) {
            cost += getBuildingCost(buildingId, i);
        }
        return cost;
    }
                  
}