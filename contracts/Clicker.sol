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

interface IBulla {
    function ownerOf(uint256 tokenId) external view returns (address);
    function exists(uint256 tokenId) external view returns (bool);
}


contract Clicker is Ownable {

    /*----------  CONSTANTS  --------------------------------------------*/

    uint256 constant PRECISION = 1e18;   
    uint256 constant DURATION = 28800;  // 8 hours

    /*----------  STATE VARIABLES  --------------------------------------*/

    address immutable public cookie;
    address immutable public bulla;

    uint256 public maxPower = 1000000000 * PRECISION;

    uint256 public lvlIndex;
    mapping(uint256 => uint256) public lvl_Unlock;          // level => amount required to unlock
    mapping(uint256 => uint256) public lvl_CostMultiplier;  // level => cost multiplier

    uint256 public buildingIndex = 0;
    uint256 public amountIndex = 0;
    mapping(uint256 => uint256) public buildingId_BaseCost;     // building id => base cost
    mapping(uint256 => uint256) public buildingId_BaseCps;      // building id => base cookies per second
    mapping(uint256 => uint256) public amount_CostMultiplier;   // building amount => cost multiplier
    
    mapping(uint256 => string) public tokenId_Name;       // token id => name
    mapping(uint256 => uint256) public tokenId_Cps;       // token id => cookies per second
    mapping(uint256 => uint256) public tokenId_Last;      // token id => last time claimed
    mapping(uint256 => uint256) public tokenId_Power;     // token id => power

    mapping(uint256 => mapping(uint256 => uint256)) public tokenId_buildingId_Amount; // token id => building id => amount
    mapping(uint256 => mapping(uint256 => uint256)) public tokenId_buildingId_Lvl;    // token id => building id => level

    /*----------  ERRORS ------------------------------------------------*/

    error Clicker__AmountMaxed();
    error Clicker__LevelMaxed();
    error Clicker__InvalidInput();
    error Clicker__NotAuthorized();
    error Clicker__UpgradeLocked();
    error Clicker__PowerMaxed();
    error Clicker__TokenDoesNotExist();

    /*----------  EVENTS ------------------------------------------------*/

    event Clicker__BuildingPurchased(uint256 indexed tokenId, uint256 buildingId, uint256 newAmount, uint256 cost, uint256 cps);
    event Clicker__BuildingUpgraded(uint256 indexed tokenId, uint256 buildingId, uint256 newLevel, uint256 cost, uint256 cps);
    event Clicker__Claimed(uint256 indexed tokenId, uint256 amount);
    event Clicker__LvlSet(uint256 lvl, uint256 cost, uint256 unlock);
    event Clicker__BuildingSet(uint256 buildingId, uint256 baseCps, uint256 baseCost);
    event Clicker__BuildingMultiplierSet(uint256 index, uint256 multiplier);
    event Clicker__MaxPowerSet(uint256 power);
    event Clicker__BurnedForPower(uint256 tokenId, uint256 amount);

    /*----------  MODIFIERS  --------------------------------------------*/

    modifier tokenExists(uint256 tokenId) {
        if (!IBulla(bulla).exists(tokenId)) revert Clicker__TokenDoesNotExist();
        _;
    }

    /*----------  FUNCTIONS  --------------------------------------------*/

    constructor(address _cookie, address _bulla) {
        cookie = _cookie;
        bulla = _bulla;
    }

    function burnForPower(uint256 tokenId, uint256 amount) external tokenExists(tokenId) {
        if (amount == 0) revert Clicker__InvalidInput();
        claim(tokenId);
        tokenId_Power[tokenId] += amount;
        if (tokenId_Power[tokenId] > maxPower) revert Clicker__PowerMaxed();
        ICookie(cookie).burn(msg.sender, amount);
        emit Clicker__BurnedForPower(tokenId, amount);
    }

    function claim(uint256 tokenId) public tokenExists(tokenId) {
        uint256 amount = tokenId_Cps[tokenId] * (block.timestamp - tokenId_Last[tokenId]);
        uint256 maxAmount = tokenId_Cps[tokenId] * DURATION;
        if (amount > maxAmount) amount = maxAmount;
        tokenId_Last[tokenId] = block.timestamp;
        emit Clicker__Claimed(tokenId, amount);
        ICookie(cookie).mint(IBulla(bulla).ownerOf(tokenId), amount);
    }

    function purchaseBuilding(uint256 tokenId, uint256 buildingId, uint256 buildingAmount) external tokenExists(tokenId) {
        if (buildingAmount == 0) revert Clicker__InvalidInput();
        claim(tokenId);
        for (uint256 i = 0; i < buildingAmount; i++) {
            uint256 currentAmount = tokenId_buildingId_Amount[tokenId][buildingId];
            if (currentAmount == amountIndex) revert Clicker__AmountMaxed();
            uint256 cost = getBuildingCost(buildingId, currentAmount);
            tokenId_buildingId_Amount[tokenId][buildingId]++;
            tokenId_Cps[tokenId] += getBuildingCps(buildingId, tokenId_buildingId_Lvl[tokenId][buildingId]);
            emit Clicker__BuildingPurchased(tokenId, buildingId, tokenId_buildingId_Amount[tokenId][buildingId], cost, tokenId_Cps[tokenId]);
            ICookie(cookie).burn(msg.sender, cost);
        }
    }

    function upgradeBuilding(uint256 tokenId, uint256 buildingId) external tokenExists(tokenId) {
        uint256 currentLvl = tokenId_buildingId_Lvl[tokenId][buildingId];
        uint256 cost = buildingId_BaseCost[buildingId] * lvl_CostMultiplier[currentLvl + 1];
        if (cost == 0) revert Clicker__LevelMaxed();
        if (tokenId_buildingId_Amount[tokenId][buildingId] < lvl_Unlock[currentLvl + 1]) revert Clicker__UpgradeLocked();
        claim(tokenId); 
        tokenId_buildingId_Lvl[tokenId][buildingId]++;
        tokenId_Cps[tokenId] += (getBuildingCps(buildingId, currentLvl + 1) - getBuildingCps(buildingId, currentLvl)) * tokenId_buildingId_Amount[tokenId][buildingId];
        emit Clicker__BuildingUpgraded(tokenId, buildingId, tokenId_buildingId_Lvl[tokenId][buildingId], cost, tokenId_Cps[tokenId]);
        ICookie(cookie).burn(msg.sender, cost);
    }

    function setName(uint256 tokenId, string calldata name) external tokenExists(tokenId) {
        if (msg.sender != IBulla(bulla).ownerOf(tokenId)) revert Clicker__NotAuthorized();
        tokenId_Name[tokenId] = name;
    }

    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/

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