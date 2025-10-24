// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IWETH {
    function deposit() external payable;
}

interface IBakery {
    struct Slot0 {
        uint8 locked;
        uint16 epochId;
        uint192 initPrice;
        uint40 startTime;
        address baker;
    }

    function getSlot0() external view returns (Slot0 memory);
    function getPrice() external view returns (uint256);
    function cps() external view returns (uint256);
    function click(address baker, uint256 epochId, uint256 deadline, uint256 maxPaymentAmount)
        external
        returns (uint256 paymentAmount);
}

interface IFactory {
    function amountIndex() external view returns (uint256);
    function toolIndex() external view returns (uint256);
    function toolId_BaseCost(uint256 toolId) external view returns (uint256);
    function lvl_Unlock(uint256 lvl) external view returns (uint256);
    function lvl_CostMultiplier(uint256 lvl) external view returns (uint256);
    function account_toolId_Amount(address account, uint256 toolId) external view returns (uint256);
    function account_toolId_Lvl(address account, uint256 toolId) external view returns (uint256);
    function getToolCost(uint256 toolId, uint256 amount) external view returns (uint256);
    function getToolPower(uint256 toolId, uint256 lvl) external view returns (uint256);
}

interface IRewarder {
    function duration() external view returns (uint256);
    function account_Balance(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function earned(address account, address token) external view returns (uint256);
    function getRewardForDuration(address token) external view returns (uint256);
}

contract Multicall {
    using SafeERC20 for IERC20;

    address public immutable cookie;
    address public immutable quote;
    address public immutable bakery;
    address public immutable factory;
    address public immutable rewarder;

    struct BakeryState {
        uint256 epochId;
        uint256 initPrice;
        uint256 startTime;
        uint256 price;
        uint256 cps;
        uint256 baked;
        address baker;
    }

    struct FactoryState {
        uint256 cookieBalance;
        uint256 power;
        uint256 totalPower;
        uint256 cps;
        uint256 claimable;
    }

    struct ToolState {
        uint256 id;
        uint256 amount;
        uint256 cost;
        uint256 power;
        uint256 powerTotal;
        uint256 contribution;
        bool maxed;
    }

    struct UpgradeState {
        uint256 id;
        uint256 cost;
        bool upgradeable;
    }

    constructor(address _cookie, address _quote, address _bakery, address _factory, address _rewarder) {
        cookie = _cookie;
        quote = _quote;
        bakery = _bakery;
        factory = _factory;
        rewarder = _rewarder;
    }

    function click(uint256 epochId, uint256 deadline, uint256 maxPaymentAmount) external payable {
        uint256 price = IBakery(bakery).getPrice();
        IWETH(quote).deposit{value: price}();
        IERC20(quote).safeApprove(bakery, 0);
        IERC20(quote).safeApprove(bakery, price);
        IBakery(bakery).click(msg.sender, epochId, deadline, maxPaymentAmount);
    }

    function getToolCost(uint256 toolId, uint256 initialAmount, uint256 finalAmount) external view returns (uint256) {
        uint256 cost = 0;
        for (uint256 i = initialAmount; i < finalAmount; i++) {
            cost += IFactory(factory).getToolCost(toolId, i);
        }
        return cost;
    }

    function getBakery() external view returns (BakeryState memory state) {
        IBakery.Slot0 memory slot0 = IBakery(bakery).getSlot0();
        state.epochId = slot0.epochId;
        state.initPrice = slot0.initPrice;
        state.startTime = slot0.startTime;
        state.price = IBakery(bakery).getPrice();
        state.cps = IBakery(bakery).cps();
        state.baked = state.cps * (block.timestamp - slot0.startTime);
        state.baker = slot0.baker;
        return state;
    }

    function getFactory(address account) external view returns (FactoryState memory state) {
        state.cookieBalance = IERC20(cookie).balanceOf(account);
        state.power = IRewarder(rewarder).account_Balance(account);
        state.totalPower = IRewarder(rewarder).totalSupply();
        state.cps = state.totalPower == 0
            ? 0
            : IRewarder(rewarder).getRewardForDuration(cookie) * state.power / state.totalPower
                / IRewarder(rewarder).duration();
        state.claimable = IRewarder(rewarder).earned(account, cookie);
        return state;
    }

    function getTools(address account) external view returns (ToolState[] memory state) {
        uint256 toolCount = IFactory(factory).toolIndex();
        state = new ToolState[](toolCount);
        for (uint256 i = 0; i < toolCount; i++) {
            state[i].id = i;
            state[i].amount = IFactory(factory).account_toolId_Amount(account, i);
            state[i].maxed = IFactory(factory).account_toolId_Amount(account, i) == IFactory(factory).amountIndex();
            state[i].cost = state[i].maxed ? 0 : IFactory(factory).getToolCost(i, state[i].amount);
            uint256 lvl = IFactory(factory).account_toolId_Lvl(account, i);
            state[i].power = IFactory(factory).getToolPower(i, lvl);
            state[i].powerTotal = state[i].power * state[i].amount;
            state[i].contribution = IRewarder(rewarder).account_Balance(account) == 0
                ? 0
                : state[i].powerTotal * 1e18 * 100 / IRewarder(rewarder).account_Balance(account);
        }
    }

    function getUpgrades(address account) external view returns (UpgradeState[] memory state) {
        uint256 toolCount = IFactory(factory).toolIndex();
        state = new UpgradeState[](toolCount);
        for (uint256 i = 0; i < toolCount; i++) {
            uint256 lvl = IFactory(factory).account_toolId_Lvl(account, i);
            uint256 amount = IFactory(factory).account_toolId_Amount(account, i);
            uint256 amountRequired = IFactory(factory).lvl_Unlock(lvl + 1);
            state[i].id = i;
            state[i].cost = IFactory(factory).toolId_BaseCost(i) * IFactory(factory).lvl_CostMultiplier(lvl + 1);
            state[i].upgradeable = amount < amountRequired || state[i].cost == 0 ? false : true;
        }
    }
}
