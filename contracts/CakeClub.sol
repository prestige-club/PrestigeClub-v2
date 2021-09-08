pragma solidity >=0.6.0 <0.8.0;

// SPDX-License-Identifier: MIT

import "./IERC20.sol";
import "./Ownable.sol";
import "./libraries/SafeMath.sol";

interface CakeVault{
    // function deposit(uint256 _amount) external;
    // function withdraw(uint256 _shares) external;
    // function userInfo(address addr) external returns (uint256, uint256, uint256, uint256);
    // function getPricePerFullShare() external returns (uint256);
    // function token() external returns (address);
    function cake() external view returns (address);
    function enterStaking(uint256 amount) external;
    function leaveStaking(uint256 amount) external;
    function pendingCake(uint256 _pid, address _user) external view returns (uint256);
    function userInfo(uint256 _pid, address _user) external view returns (uint256, uint256);
}

interface CakeVault2{ //TODO Remove, only used in tests
    function deposit(uint256 _amount) external;
    function withdraw(uint256 _shares) external;
    function userInfo(address addr) external returns (uint256, uint256, uint256, uint256);
    function getPricePerFullShare() external returns (uint256);
    function token() external view returns (address);
}

interface IPrestigeClub{
    function depositSum() external view returns (uint128);
    function totalWithdrawn() external view returns (uint128);
}

contract CakeClub is Ownable(){

    using SafeMath for uint256;

    IERC20 public cake;
    CakeVault vault;
    IPrestigeClub prestigeclub;

    constructor(address _vault) public {
        vault = CakeVault(_vault);
        cake = IERC20(vault.cake());
        cake.approve(_vault, ~uint256(0));
    }

    uint256 alreadyWithdrawn;
    uint256 depositedCake;
    uint256 public estimatedPeth;

    uint256 last_payout_calculation = block.timestamp;
    uint256 payout_interval = 1 days;
    uint256 daily_rate = 3000 * 1e12;//2706 * 1e12;  //1e18 == 100%
    uint256 dust = 100000;

    uint256 ownerShares = 15;

    event Log(string title, uint256 value);

    function invest() public onlyPrestige {
        uint256 balance = cake.balanceOf(address(this));

        uint256 pending = vault.pendingCake(0, address(this));

        //Invest into Masterchef
        vault.enterStaking(balance);

        // (uint256 amount, uint256 debt) = vault.userInfo(0, address(this));

        //Since enterStaking automatically compounds, add previous Pending to already Withdrawn
        alreadyWithdrawn += pending;

        depositedCake += balance;
    }


    function totalProfit() public view returns (uint256) {
        return vault.pendingCake(0, address(this)) + alreadyWithdrawn;
    }

    function output(uint256 peth) public view returns (uint256) {
        return 1 ether * peth / estimatedPeth * totalProfit() / 1 ether;
    }

    function withdraw(uint256 peth, address to) public onlyPrestige {

        updateEstimation();
        uint256 cakeAmount = output(peth);

        emit Log("Peth", peth);
        emit Log("EstimatedPeth", estimatedPeth);
        emit Log("Total Profit", totalProfit());
        emit Log("Cake Amount", cakeAmount);
        emit Log("Already Withdrawn", peth);
        emit Log("Pending Cake", vault.pendingCake(0, address(this)));

        uint256 pending = vault.pendingCake(0, address(this));
        uint256 withdrawAmount = 0;
        if(pending < cakeAmount){ //Since re-staking will occur, withdrawal of Stake is possible
            withdrawAmount = cakeAmount - pending;
        }

        (uint256 amount,) = vault.userInfo(0, address(this));
        require(withdrawAmount <= amount - depositedCake, "Cannot withdraw more than reward amount");

        vault.leaveStaking(withdrawAmount);

        alreadyWithdrawn += pending;

        uint256 ownerSharesC = cakeAmount * ownerShares / 100;
        cake.transfer(owner(), ownerSharesC);
        cake.transfer(to, cakeAmount - ownerSharesC);

        uint256 balanceLeft = cake.balanceOf(address(this));
        if(balanceLeft > 0){
            vault.enterStaking(balanceLeft);
        }

    }

    function updateEstimation() public {

        while(block.timestamp > last_payout_calculation + payout_interval){

            estimatedPeth = estimatedPeth + uint256(prestigeclub.depositSum()).mul(daily_rate).div(1e18) ;

            last_payout_calculation += payout_interval;
        }

    }

    function emergencyWithdraw(uint256 cakeAmount) external onlyOwner {
        vault.leaveStaking(cakeAmount);
        cake.transfer(owner(), cake.balanceOf(address(this)));
    }

    function setPrestigeClub(address prestige) external onlyOwner {
        prestigeclub = IPrestigeClub(prestige);
    }

    function setDailyRate(uint256 rate) external onlyOwner {
        daily_rate = rate;
    }

    function rebalance() external {
        uint256 pending = cake.balanceOf(address(this));
        alreadyWithdrawn += pending;
        vault.enterStaking(0);
    }

    modifier onlyPrestige() {
        require(msg.sender == address(prestigeclub), "Caller not PrestigeClub Contract");
        _;
    }

}