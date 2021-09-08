pragma solidity ^0.6.3;

// SPDX-License-Identifier: MIT

import "./Dex.sol";
import "./Ownable.sol";
import "./libraries/SafeMath.sol";
import "./IERC20.sol";

interface IPrestigeClub{
    function depositSum() external view returns (uint128);
    function totalWithdrawn() external view returns (uint128);
}

contract APYFormula is IFormula, Ownable{

    using SafeMath for uint256;

    IPrestigeClub prestigeclub;
    IERC20 peth;

    IVault[] public vaults;
    // IVault public returnVault;

    constructor(address prestige, address _peth) public {
        require(prestige != address(0));
        prestigeclub = IPrestigeClub(prestige);

        require(_peth != address(0));
        peth = IERC20(_peth);
    }

    function getAmountOut(uint256 amountIn) public view returns (uint256){

        uint256 pethSupply = 
            peth.totalSupply()
            .sub(peth.balanceOf(address(prestigeclub)))
            .add( payoutSum.sub(prestigeclub.totalWithdrawn()) );
        uint256 here = getTotalEthLocked(); //Here only profits
        return amountIn.mul(here).div(pethSupply);

    }
    
    function getAmountSell(uint256 amountIn) external override view returns (uint256){
        return getAmountOut(amountIn);
    }
    
    function getAmountBuy(uint256 amountIn) external override view returns (uint256){
        return getAmountOut(amountIn);
    }

    function addVault(address vault) public onlyOwner {
        vaults.push(IVault(vault));
    }

    function removeVault(address vault) public onlyOwner {
        for(uint8 i = 0 ; i < vaults.length ; i++){
            if(address(vaults[i]) == vault){
                vaults[i] = vaults[vaults.length - 1];
                vaults.pop();
                break;
            }
        }
    }
    
    function getTotalEthLocked() public view returns (uint256){
        uint256 sum = 0;
        for(uint8 i = 0 ; i < vaults.length ; i++){
            sum = sum.add(vaults[i].getEthLocked());
        }
        return sum;
    }

    uint256 public daily_rate = 2706 * 1e12;  //1e18 == 100%

    uint256 public payoutSum;

    uint64 payout_interval = 1 days;

    uint64 public last_payout_calculation = uint64(block.timestamp - (block.timestamp % payout_interval)) - payout_interval;


    function update() override external {

        if(block.timestamp > last_payout_calculation + payout_interval){

            payoutSum = payoutSum.add( uint256(prestigeclub.depositSum()).mul(daily_rate).div(1e18) );

            last_payout_calculation += payout_interval;
        }

    }

    function setRate(uint256 rate) external onlyOwner {
        require(rate > 1e12, "Rate too low");
        daily_rate = rate;
    }

}