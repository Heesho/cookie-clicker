// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IGauge {
    function _deposit(address account, uint256 amount) external;
    function _withdraw(address account, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
}

interface IBribe {
    function notifyRewardAmount(address token, uint amount) external;
    function DURATION() external view returns (uint);
}

interface IVoter {
    function OTOKEN() external view returns (address);
}

interface IWBERA {
    function deposit() external payable;
}

contract ClickerPlugin is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /*----------  CONSTANTS  --------------------------------------------*/

    address public constant WBERA = 0x7507c1dc16935B82698e4C63f2746A2fCf994dF8;
    uint256 public constant QUEUE_SIZE = 100;
    string public constant SYMBOL = "CLICKER";
    string public constant PROTOCOL = "ClickerPlugin";

    /*----------  STATE VARIABLES  --------------------------------------*/

    IERC20Metadata private immutable underlying;
    address private immutable OTOKEN;
    address private immutable voter;
    address private gauge;
    address private bribe;
    address[] private tokensInUnderlying;
    address[] private bribeTokens;

    address public treasury;
    uint256 public fee = 0.01 ether;

    struct Post {
        uint256 tokenId;
        uint256 power;
        address account;
        string message;
    }

    mapping(uint256 => Post) public queue;
    uint256 public head = 0;
    uint256 public tail = 0;
    uint256 public count = 0;

    /*----------  ERRORS ------------------------------------------------*/

    error Plugin__InvalidInput();
    error Plugin__InvalidZeroInput();
    error Plugin__NotAuthorizedVoter();
    error Plugin__InsufficientFunds();

    /*----------  EVENTS ------------------------------------------------*/

    event Plugin__PostAdded(uint256 tokenId, address author, uint256 power, string message);
    event Plugin__PostRemoved(uint256 tokenId, address author, uint256 power, string message);
    event Plugin__ClaimedAnDistributed();

    /*----------  MODIFIERS  --------------------------------------------*/

    modifier nonZeroInput(uint256 _amount) {
        if (_amount == 0) revert Plugin__InvalidZeroInput();
        _;
    }

    modifier onlyVoter() {
        if (msg.sender != voter) revert Plugin__NotAuthorizedVoter();
        _;
    }

    /*----------  FUNCTIONS  --------------------------------------------*/

    constructor(
        address _underlying,                    // WBERA
        address _voter, 
        address[] memory _tokensInUnderlying,   // [WBERA]
        address[] memory _bribeTokens,          // [WBERA]
        address _treasury
    ) {
        underlying = IERC20Metadata(_underlying);
        voter = _voter;
        tokensInUnderlying = _tokensInUnderlying;
        bribeTokens = _bribeTokens;
        treasury = _treasury;
        OTOKEN = IVoter(_voter).OTOKEN();
    }

    function claimAndDistribute() 
        external 
        nonReentrant
    {
        uint256 duration = IBribe(bribe).DURATION();
        uint256 balance = address(this).balance;
        if (balance > duration) {
            uint256 treasuryFee = balance / 10;
            IWBERA(WBERA).deposit{value: balance}();
            IERC20(WBERA).safeTransfer(treasury, treasuryFee);
            IERC20(WBERA).safeApprove(bribe, 0);
            IERC20(WBERA).safeApprove(bribe, balance - treasuryFee);
            IBribe(bribe).notifyRewardAmount(WBERA, balance - treasuryFee);
        }
    }

    function post(uint256 tokenId, string memory message)         
        external
        payable
        nonReentrant 
    {
        uint256 currentIndex = tail % QUEUE_SIZE;

        if (count == QUEUE_SIZE) {
            IGauge(gauge)._withdraw(queue[head].account, queue[head].power);
            emit Plugin__PostRemoved(queue[head].tokenId, queue[head].account, queue[head].power, queue[head].message);
            head++;
        }

        queue[currentIndex] = Post(tokenId, msg.value, msg.sender, message);
        tail++;
        count = count < QUEUE_SIZE ? count + 1 : count;
        emit Plugin__PostAdded(tokenId, msg.sender, queue[currentIndex].power, queue[currentIndex].message);

        payable(address(this)).transfer(fee * 9 / 10);
        payable(treasury).transfer(fee / 10);
        IGauge(gauge)._deposit(msg.sender, msg.value);
    }

    // Function to receive Ether. msg.data must be empty
    receive() external payable {}

    // Fallback function is called when msg.data is not empty
    fallback() external payable {}

    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }

    function setFee(uint256 _fee) external onlyOwner {
        fee = _fee;
    }

    function setGauge(address _gauge) external onlyVoter {
        gauge = _gauge;
    }

    function setBribe(address _bribe) external onlyVoter {
        bribe = _bribe;
    }

    /*----------  VIEW FUNCTIONS  ---------------------------------------*/

    function balanceOf(address account) public view returns (uint256) {
        return IGauge(gauge).balanceOf(account);
    }

    function totalSupply() public view returns (uint256) {
        return IGauge(gauge).totalSupply();
    }

    function getUnderlyingName() public view virtual returns (string memory) {
        return SYMBOL;
    }

    function getUnderlyingSymbol() public view virtual returns (string memory) {
        return SYMBOL;
    }

    function getUnderlyingAddress() public view virtual returns (address) {
        return address(underlying);
    }

    function getUnderlyingDecimals() public view virtual returns (uint8) {
        return underlying.decimals();
    }

    function getProtocol() public view virtual returns (string memory) {
        return PROTOCOL;
    }

    function getVoter() public view returns (address) {
        return voter;
    }

    function getGauge() public view returns (address) {
        return gauge;
    }

    function getBribe() public view returns (address) {
        return bribe;
    }

    function getTokensInUnderlying() public view virtual returns (address[] memory) {
        return tokensInUnderlying;
    }

    function getBribeTokens() public view returns (address[] memory) {
        return bribeTokens;
    }

}