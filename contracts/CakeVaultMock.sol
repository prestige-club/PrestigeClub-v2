pragma solidity >=0.6.0 <0.8.0;

// SPDX-License-Identifier: MIT

import "./IERC20.sol";
import "./CakeClub.sol";

contract CakeVaultMock is CakeVault {

    address cakeAddr;
    IERC20 token;
    mapping(address => uint256) stake;
    mapping(address => uint256) lastReward;
    uint256 rewardRate = 1000000000; // 10000 per Second

    constructor(address _cake) public {
        cakeAddr = _cake;
        token = IERC20(_cake);
    }

    function getReward(address user) internal view returns (uint256) {
        if(lastReward[user] != 0){
            return rewardRate * (block.timestamp - lastReward[user]);
        }else{
            return 0;
        }
    }

    function enterStaking(uint256 amount) external override {

        token.transferFrom(msg.sender, address(this), amount);
        stake[msg.sender] += amount;
        stake[msg.sender] += getReward(msg.sender);
        lastReward[msg.sender] = block.timestamp;

    }

    function leaveStaking(uint256 amount) external override {

        uint256 reward = getReward(msg.sender);
        require(stake[msg.sender] + reward >= amount, "Not enough");
        
        uint256 bal = token.balanceOf(address(this));
        if(reward + amount > bal){
            token.mint(reward + amount - bal);
        }

        token.transfer(msg.sender, reward);
        lastReward[msg.sender] = block.timestamp;
        stake[msg.sender] -= amount;
        token.transfer(msg.sender, amount);

    }

    function pendingCake(uint256 _pid, address _user) external view override returns (uint256){
        require(_pid == 0);
        return getReward(_user);
    }

    function userInfo(uint256 _pid, address _user) external view override returns (uint256, uint256){
        require(_pid == 0);
        return (stake[_user], 0);
    }

    function cake() external view override returns (address){
        return cakeAddr;
    }

}