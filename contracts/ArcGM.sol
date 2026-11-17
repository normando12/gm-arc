// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ArcGM — daily GM check-in + directed GM+ on Arc (v2 fees)
/// @notice Basic `gm()` is free (gas only) with a 24h cooldown.
///         `gmPlusTo(address)` pays exact total = friend tip + owner fee (native USDC on Arc):
///         0.01 USDC → friend, 1.0 USDC → owner (ops / X API funding).
contract ArcGM {
    uint256 public constant COOLDOWN = 24 hours;
    /// @dev Native Arc USDC uses 18 decimals — `ether` unit == 1 USDC.
    uint256 public constant FRIEND_TIP = 0.01 ether;
    uint256 public constant OWNER_FEE = 1 ether;

    address public immutable owner;

    mapping(address => uint256) public lastGM;

    event GM(address indexed user, uint256 timestamp);
    event GMPlus(
        address indexed from,
        address indexed to,
        uint256 friendTip,
        uint256 ownerFee,
        uint256 timestamp
    );

    error CooldownActive(uint256 nextAllowed);
    error InvalidFee(uint256 expected, uint256 received);
    error ZeroAddress();
    error TransferFailed();

    constructor(address owner_) {
        if (owner_ == address(0)) revert ZeroAddress();
        owner = owner_;
    }

    /// @notice Total native USDC required for `gmPlusTo` (friend tip + owner fee).
    function gmPlusFee() public pure returns (uint256) {
        return FRIEND_TIP + OWNER_FEE;
    }

    /// @notice Free daily check-in. One send per address every 24 hours.
    function gm() external {
        uint256 next = nextGM(msg.sender);
        if (next != 0 && block.timestamp < next) revert CooldownActive(next);
        lastGM[msg.sender] = block.timestamp;
        emit GM(msg.sender, block.timestamp);
    }

    /// @notice Premium directed GM. Exact `gmPlusFee()` native USDC required. No cooldown.
    function gmPlusTo(address to) external payable {
        if (to == address(0)) revert ZeroAddress();
        uint256 expected = gmPlusFee();
        if (msg.value != expected) revert InvalidFee(expected, msg.value);

        (bool tipOk, ) = to.call{value: FRIEND_TIP}("");
        if (!tipOk) revert TransferFailed();

        (bool feeOk, ) = owner.call{value: OWNER_FEE}("");
        if (!feeOk) revert TransferFailed();

        emit GMPlus(msg.sender, to, FRIEND_TIP, OWNER_FEE, block.timestamp);
    }

    /// @notice Timestamp when `user` may GM again. `0` means ready.
    function nextGM(address user) public view returns (uint256) {
        uint256 last = lastGM[user];
        if (last == 0) return 0;
        uint256 readyAt = last + COOLDOWN;
        if (block.timestamp >= readyAt) return 0;
        return readyAt;
    }
}
