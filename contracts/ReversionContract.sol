pragma solidity >=0.6.0 <0.8.0;

// SPDX-License-Identifier: MIT

import "./Ownable.sol";
import "./CakeClub.sol";
import "./IERC20.sol";
import "./libraries/SafeMath.sol";

contract ReversionContract is Ownable {

    using SafeMath for uint256; //TODO Apply Safemath to all calculations

    CakeVault vault;
    IERC20 cake;

    // mapping(address => int8) public choice;
    struct UserInfo {
        uint256 deposit;
        uint256 withdrawn;
    }

    mapping(address => UserInfo) public users;
    uint256 public start;

    uint256 public totalRewards;
    uint256 public sumDeposits;

    uint256 public lastWithdraw;

    uint256 public ownerProvision;

    uint256 duration;
    uint256 DUST = 100000;

    event Withdraw(address indexed user, uint256 amount);

    constructor(address cakeVault, address _cake, uint32 _duration /*170 days or 365 days*/) public {
        start = block.timestamp;
        vault = CakeVault(cakeVault);
        cake = IERC20(_cake);

        duration = _duration;
        lastWithdraw = block.timestamp;
    }

    function _withdrawRewards() internal {
        uint256 balance = cake.balanceOf(address(this));
        vault.leaveStaking(0);
        uint256 diff = cake.balanceOf(address(this)).sub(balance);
        totalRewards += diff;
        lastWithdraw = block.timestamp;
    }

    function pendingRewards(address user) public view returns (uint256){
        uint256 alreadyWithdrawn = users[user].withdrawn;
        uint256 totalForUser = totalRewards * users[user].deposit / sumDeposits;
        uint256 eligible = totalForUser - alreadyWithdrawn;
        return eligible;
    }

    function pendingRewardsBO(address user) external view returns (uint256){
        uint256 alreadyWithdrawn = users[user].withdrawn;
        uint256 pending = vault.pendingCake(0, address(this));
        uint256 totalForUser = (totalRewards + pending) * users[user].deposit / sumDeposits;
        uint256 eligible = totalForUser - alreadyWithdrawn;
        return eligible * 85 / 100; //Provision
    }

    //Only external
    function estimateDailyRewards(address user) public view returns (uint256) {
        uint256 pending = vault.pendingCake(0, address(this));
        uint256 total = pending * (1 days * 1 ether / (block.timestamp - lastWithdraw)) / 1 ether;
        return (total * users[user].deposit / sumDeposits) * 85 / 100;
    }

    function withdrawRewards() public {

        if(block.timestamp < start + duration){
            _withdrawRewards();
        }
        uint256 eligible = pendingRewards(msg.sender);

        if(eligible > DUST){

            uint256 provision = eligible * 15 / 100;
            ownerProvision += provision;

            users[msg.sender].withdrawn = users[msg.sender].withdrawn + eligible;

            emit Withdraw(msg.sender, eligible - provision);
            cake.transfer(msg.sender, eligible - provision);
        }
    }

    function enterStaking(uint256 amount) external onlyOwner {
        
        cake.transferFrom(msg.sender, address(this), amount);
        cake.approve(address(vault), amount);
        _withdrawRewards();
        vault.enterStaking(amount);
        
    }

    function importUsers(address[] calldata _users, uint256[] calldata userCakes) external onlyOwner {
        for(uint32 i = 0 ; i < _users.length ; i++){
            users[_users[i]].deposit = userCakes[i];
            sumDeposits += userCakes[i];
        }
    }

    function updateUser(address user, uint256 userCakes) external onlyOwner {
        uint256 deposit = users[user].deposit;
        users[user].deposit = userCakes;
        if(deposit < userCakes){
            sumDeposits += (userCakes - deposit);
        }else if(deposit > userCakes){
            sumDeposits -= (deposit - userCakes);
        }
    }

    function payoutProvision() external onlyOwner {
        cake.transfer(owner(), ownerProvision);
    }

    function retrieve(uint256 amount) external onlyOwner {
        vault.leaveStaking(amount);
        cake.transfer(owner(), cake.balanceOf(address(this)));
    }

    function setDuration(uint256 _duration) external onlyOwner {
        duration = _duration;
    }

}