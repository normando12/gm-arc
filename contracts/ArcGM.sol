// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ArcGM — daily GM check-in + directed GM+ on Arc
/// @notice Basic `gm()` is free (gas only) with a 24h cooldown.
///         `gmPlusTo(address)` sends a premium GM to a friend for an exact native fee (USDC on Arc).
contract ArcGM {
    uint256 public constant COOLDOWN = 24 hours;

    uint256 public immutable gmPlusFee;
    address public immutable treasury;

    mapping(address => uint256) public lastGM;

    event GM(address indexed user, uint256 timestamp);
    event GMPlus(
        address indexed from,
        address indexed to,
        uint256 fee,
        uint256 timestamp
    );

    error CooldownActive(uint256 nextAllowed);
    error InvalidFee(uint256 expected, uint256 received);
    error ZeroAddress();
    error TransferFailed();

    constructor(uint256 gmPlusFee_, address treasury_) {
        if (treasury_ == address(0)) revert ZeroAddress();
        gmPlusFee = gmPlusFee_;
        treasury = treasury_;
    }

    /// @notice Free daily check-in. One ranked send per address every 24 hours.
    function gm() external {
        uint256 next = nextGM(msg.sender);
        if (next != 0 && block.timestamp < next) revert CooldownActive(next);
        lastGM[msg.sender] = block.timestamp;
        emit GM(msg.sender, block.timestamp);
    }

    /// @notice Premium directed GM. Exact `gmPlusFee` native USDC required. No cooldown.
    function gmPlusTo(address to) external payable {
        if (to == address(0)) revert ZeroAddress();
        if (msg.value != gmPlusFee) revert InvalidFee(gmPlusFee, msg.value);

        (bool ok, ) = treasury.call{value: msg.value}("");
        if (!ok) revert TransferFailed();

        emit GMPlus(msg.sender, to, msg.value, block.timestamp);
    }

    /// @notice Timestamp when `user` may GM again. `0` means ready (never GM'd or cooldown elapsed).
    function nextGM(address user) public view returns (uint256) {
        uint256 last = lastGM[user];
        if (last == 0) return 0;
        uint256 readyAt = last + COOLDOWN;
        if (block.timestamp >= readyAt) return 0;
        return readyAt;
    }
}
