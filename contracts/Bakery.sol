// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface ICookie {
    function mint(address account, uint256 amount) external;
    function burn(address account, uint256 amount) external;
}

contract Bakery is Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant FEE = 1_000;
    uint256 public constant DIVISOR = 10_000;
    uint256 public constant PRECISION = 1e18;
    uint256 public constant EPOCH_PERIOD = 1 hours;
    uint256 public constant PRICE_MULTIPLIER = 2e18;
    uint256 public constant MIN_INIT_PRICE = 0.0001 ether;
    uint256 public constant ABS_MAX_INIT_PRICE = type(uint192).max;

    address public immutable cookie;
    address public treasury;

    uint256 public cps;

    struct Slot0 {
        uint8 locked;
        uint16 epochId;
        uint192 initPrice;
        uint40 startTime;
        address owner;
    }

    Slot0 internal slot0;

    error Bakery__Reentrancy();
    error Bakery__Expired();
    error Bakery__EpochIdMismatch();
    error Bakery__MaxPaymentAmountExceeded();
    error Bakery__InvalidAddress();
    error Bakery__InvalidCps();

    event Bakery__Click(address indexed from, address indexed baker, uint256 paymentAmount);
    event Bakery__TreasuryPaid(address indexed treasury, uint256 amount);
    event Bakery__BakerPaid(address indexed baker, uint256 amount);
    event Bakery__Baked(address indexed baker, uint256 amount);
    event Bakery__TreasurySet(address indexed treasury);
    event Bakery__CpsSet(uint256 indexed cps);

    modifier nonReentrant() {
        if (slot0.locked == 2) revert Bakery__Reentrancy();
        slot0.locked = 2;
        _;
        slot0.locked = 1;
    }

    modifier nonReentrantView() {
        if (slot0.locked == 2) revert Bakery__Reentrancy();
        _;
    }

    constructor(address _cookie) {
        if (_cookie == address(0)) revert Bakery__InvalidAddress();

        cookie = _cookie;

        slot0.initPrice = uint192(MIN_INIT_PRICE);
        slot0.startTime = uint40(block.timestamp);
        slot0.owner = msg.sender;
    }

    function click(address baker, uint256 epochId, uint256 deadline, uint256 maxPaymentAmount) external payable nonReentrant returns (uint256 paymentAmount) {
        if (block.timestamp > deadline) revert Bakery__Expired();

        Slot0 memory slot0Cache = slot0;

        if (uint16(epochId) != slot0Cache.epochId) revert Bakery__EpochIdMismatch();

        paymentAmount = getPriceFromCache(slot0Cache);
        if (paymentAmount > maxPaymentAmount) revert Bakery__MaxPaymentAmountExceeded();

        if (paymentAmount > 0) {
            
            uint256 treasuryAmount = 0;
            if (treasury != address(0)) {
                treasuryAmount = paymentAmount * FEE / DIVISOR;
                (bool treasurySent, ) = payable(treasury).call{value: treasuryAmount}("");
                require(treasurySent, "ETH treasury transfer failed");
                emit Bakery__TreasuryPaid(treasury, treasuryAmount);
            }

            uint256 bakerAmount = paymentAmount - treasuryAmount;
            (bool bakerSent, ) = payable(slot0Cache.owner).call{value: bakerAmount}("");
            require(bakerSent, "ETH baker transfer failed");
            emit Bakery__BakerPaid(slot0Cache.owner, bakerAmount);
        }

        uint256 newInitPrice = paymentAmount * PRICE_MULTIPLIER / PRECISION;

        if (newInitPrice > ABS_MAX_INIT_PRICE) {
            newInitPrice = ABS_MAX_INIT_PRICE;
        } else if (newInitPrice < MIN_INIT_PRICE) {
            newInitPrice = MIN_INIT_PRICE;
        }

        uint256 bakeTime = block.timestamp - slot0Cache.startTime;
        uint256 bakedAmount = bakeTime * cps;
        if (bakeTime > 0) {
            ICookie(cookie).mint(slot0Cache.owner, bakedAmount);
            emit Bakery__Baked(slot0Cache.owner, bakedAmount);
        }

        unchecked {
            slot0Cache.epochId++;
        }
        slot0Cache.initPrice = uint192(newInitPrice);
        slot0Cache.startTime = uint40(block.timestamp);
        slot0Cache.owner = baker;

        slot0 = slot0Cache;

        emit Bakery__Click(msg.sender, baker, paymentAmount);

        return paymentAmount;
    }

    function getPriceFromCache(Slot0 memory slot0Cache) internal view returns (uint256) {
        uint256 timePassed = block.timestamp - slot0Cache.startTime;

        if (timePassed > EPOCH_PERIOD) {
            return 0;
        }

        return slot0Cache.initPrice - slot0Cache.initPrice * timePassed / EPOCH_PERIOD;
    }

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
        emit Bakery__TreasurySet(_treasury);
    }

    function setCps(uint256 _cps) external onlyOwner {
        if (_cps == 0) revert Bakery__InvalidCps();
        cps = _cps;
        emit Bakery__CpsSet(_cps);
    }

    receive() external payable {}

    function getPrice() external view nonReentrantView returns (uint256) {
        return getPriceFromCache(slot0);
    }

    function getSlot0() external view nonReentrantView returns (Slot0 memory) {
        return slot0;
    }
}
