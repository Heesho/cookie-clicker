// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

interface IUnits {
    function mint(address account, uint256 amount) external;
    function burn(address account, uint256 amount) external;
}

contract Factory is Ownable {

    /*----------  CONSTANTS  --------------------------------------------*/

    uint256 constant PRECISION = 1e18;   
    uint256 constant DURATION = 28800;  // 8 hours
    uint256 constant MAX_NAME_LENGTH = 9;

    /*----------  STATE VARIABLES  --------------------------------------*/

    address immutable public units;
    address immutable public key;

    uint256 public evolutionIndex;
    mapping(uint256 => uint256) public evolution_Cost;  // evolution => cost to evolve

    uint256 public lvlIndex;
    mapping(uint256 => uint256) public lvl_Unlock;          // level => amount required to unlock
    mapping(uint256 => uint256) public lvl_CostMultiplier;  // level => cost multiplier

    uint256 public toolIndex;
    uint256 public amountIndex;
    mapping(uint256 => uint256) public toolId_BaseCost;         // tool id => base cost
    mapping(uint256 => uint256) public toolId_BaseUps;          // tool id => base units per second
    mapping(uint256 => uint256) public amount_CostMultiplier;   // tool amount => cost multiplier
    
    mapping(uint256 => string) public tokenId_Name;       // token id => name
    mapping(uint256 => uint256) public tokenId_Ups;       // token id => units per second
    mapping(uint256 => uint256) public tokenId_Last;      // token id => last time claimed
    mapping(uint256 => uint256) public tokenId_Evolution; // token id => evolution

    mapping(uint256 => mapping(uint256 => uint256)) public tokenId_toolId_Amount; // token id => tool id => amount
    mapping(uint256 => mapping(uint256 => uint256)) public tokenId_toolId_Lvl;    // token id => tool id => level

    /*----------  ERRORS ------------------------------------------------*/

    error Factory__EvolutionMaxed();
    error Factory__AmountMaxed();
    error Factory__LevelMaxed();
    error Factory__InvalidInput();
    error Factory__NotAuthorized();
    error Factory__UpgradeLocked();
    error Factory__InvalidTokenId();
    error Factory__InvalidLength();

    /*----------  EVENTS ------------------------------------------------*/

    event Factory__Evolved(uint256 indexed tokenId, uint256 evolution, uint256 cost);
    event Factory__ToolPurchased(uint256 indexed tokenId, uint256 toolId, uint256 newAmount, uint256 cost, uint256 ups);
    event Factory__ToolUpgraded(uint256 indexed tokenId, uint256 toolId, uint256 newLevel, uint256 cost, uint256 ups);
    event Factory__Claimed(uint256 indexed tokenId, uint256 amount);
    event Factory__EvolutionSet(uint256 evolution, uint256 cost);
    event Factory__LvlSet(uint256 lvl, uint256 cost, uint256 unlock);
    event Factory__ToolSet(uint256 toolId, uint256 baseUps, uint256 baseCost);
    event Factory__ToolMultiplierSet(uint256 index, uint256 multiplier);

    /*----------  MODIFIERS  --------------------------------------------*/

    modifier tokenExists(uint256 tokenId) {
        if (IERC721(key).ownerOf(tokenId) == address(0)) revert Factory__InvalidTokenId();
        _;
    }

    /*----------  FUNCTIONS  --------------------------------------------*/

    constructor(address _units, address _key) {
        units = _units;
        key = _key;
    }

    function claim(uint256 tokenId) public tokenExists(tokenId) {
        uint256 amount = tokenId_Ups[tokenId] * (block.timestamp - tokenId_Last[tokenId]);
        uint256 maxAmount = tokenId_Ups[tokenId] * DURATION;
        if (amount > maxAmount) amount = maxAmount;
        tokenId_Last[tokenId] = block.timestamp;
        emit Factory__Claimed(tokenId, amount);
        IUnits(units).mint(IERC721(key).ownerOf(tokenId), amount);
    }

    function evolve(uint256 tokenId) external tokenExists(tokenId) {
        uint256 evolution = tokenId_Evolution[tokenId];
        if (evolution == evolutionIndex) revert Factory__EvolutionMaxed();
        uint256 cost = evolution_Cost[evolution + 1];
        claim(tokenId);
        tokenId_Evolution[tokenId]++;
        tokenId_Ups[tokenId] = 0;
        for (uint256 i = 0; i < toolIndex; i++) {
            tokenId_toolId_Amount[tokenId][i] = 0;
            tokenId_toolId_Lvl[tokenId][i] = 0;
        }
        emit Factory__Evolved(tokenId, evolution, cost);
        IUnits(units).burn(msg.sender, cost);
    }

    function purchaseTool(uint256 tokenId, uint256 toolId, uint256 toolAmount) external tokenExists(tokenId) {
        if (toolAmount == 0) revert Factory__InvalidInput();
        claim(tokenId);
        for (uint256 i = 0; i < toolAmount; i++) {
            uint256 currentAmount = tokenId_toolId_Amount[tokenId][toolId];
            if (currentAmount == amountIndex) revert Factory__AmountMaxed();
            uint256 cost = getToolCost(toolId, currentAmount);
            tokenId_toolId_Amount[tokenId][toolId]++;
            tokenId_Ups[tokenId] += getToolUps(toolId, tokenId_toolId_Lvl[tokenId][toolId]);
            emit Factory__ToolPurchased(tokenId, toolId, tokenId_toolId_Amount[tokenId][toolId], cost, tokenId_Ups[tokenId]);
            IUnits(units).burn(msg.sender, cost);
        }
    }

    function upgradeTool(uint256 tokenId, uint256 toolId) external tokenExists(tokenId) {
        uint256 currentLvl = tokenId_toolId_Lvl[tokenId][toolId];
        uint256 cost = toolId_BaseCost[toolId] * lvl_CostMultiplier[currentLvl + 1];
        if (cost == 0) revert Factory__LevelMaxed();
        if (tokenId_toolId_Amount[tokenId][toolId] < lvl_Unlock[currentLvl + 1]) revert Factory__UpgradeLocked();
        claim(tokenId); 
        tokenId_toolId_Lvl[tokenId][toolId]++;
        tokenId_Ups[tokenId] += (getToolUps(toolId, currentLvl + 1) - getToolUps(toolId, currentLvl)) * tokenId_toolId_Amount[tokenId][toolId];
        emit Factory__ToolUpgraded(tokenId, toolId, tokenId_toolId_Lvl[tokenId][toolId], cost, tokenId_Ups[tokenId]);
        IUnits(units).burn(msg.sender, cost);
    }

    function setName(uint256 tokenId, string calldata name) external tokenExists(tokenId) {
        if (msg.sender != IERC721(key).ownerOf(tokenId)) revert Factory__NotAuthorized();
        if (bytes(name).length == 0) revert Factory__InvalidLength();
        if (bytes(name).length > MAX_NAME_LENGTH) revert Factory__InvalidLength();
        tokenId_Name[tokenId] = name;
    }

    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/

    function setEvolution(uint256[] calldata cost) external onlyOwner {
        for (uint256 i = evolutionIndex; i < evolutionIndex + cost.length; i++) {
            uint256 arrayIndex = i - evolutionIndex;
            evolution_Cost[i] = cost[arrayIndex];
            emit Factory__EvolutionSet(i, cost[i]);
        }
        evolutionIndex += cost.length;
    }

    function setLvl(uint256[] calldata cost, uint256[] calldata unlock) external onlyOwner {
        if (cost.length != unlock.length) revert Factory__InvalidInput();
        for (uint256 i = lvlIndex; i < lvlIndex + cost.length; i++) {
            uint256 arrayIndex = i - lvlIndex;
            lvl_CostMultiplier[i] = cost[arrayIndex];
            lvl_Unlock[i] = unlock[arrayIndex];
            emit Factory__LvlSet(i, cost[i], unlock[i]);
        }
        lvlIndex += cost.length;
    }

    function setTool(uint256[] calldata baseUps, uint256[] calldata baseCost) external onlyOwner {
        if (baseUps.length != baseCost.length) revert Factory__InvalidInput();
        for (uint256 i = toolIndex; i < toolIndex + baseUps.length; i++) {
            uint256 arrayIndex = i - toolIndex;
            toolId_BaseUps[i] = baseUps[arrayIndex];
            toolId_BaseCost[i] = baseCost[arrayIndex];
            emit Factory__ToolSet(i, baseUps[arrayIndex], baseCost[arrayIndex]);
        }
        toolIndex += baseUps.length;
    }

    function setToolMultipliers(uint256[] calldata multipliers) external onlyOwner {
        for (uint256 i = amountIndex; i < amountIndex + multipliers.length; i++) {
            uint256 arrayIndex = i - amountIndex;
            amount_CostMultiplier[i] = multipliers[arrayIndex];
            emit Factory__ToolMultiplierSet(i, multipliers[arrayIndex]);
        }
        amountIndex += multipliers.length;
    }

    /*----------  VIEW FUNCTIONS  ---------------------------------------*/

    function getToolUps(uint256 toolId, uint256 lvl) public view returns (uint256) {
        return toolId_BaseUps[toolId] * 2 ** lvl;
    }
 
    function getToolCost(uint256 toolId, uint256 amount) public view returns (uint256) {
        if (amount >= amountIndex) revert Factory__AmountMaxed();
        return toolId_BaseCost[toolId] * amount_CostMultiplier[amount] / PRECISION;
    }

    function getMultipleToolCost(uint256 toolId, uint256 initialAmount, uint256 finalAmount) external view returns (uint256){
        uint256 cost = 0;
        for (uint256 i = initialAmount; i < finalAmount; i++) {
            cost += getToolCost(toolId, i);
        }
        return cost;
    }

}