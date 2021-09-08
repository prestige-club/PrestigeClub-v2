pragma solidity >=0.6.0 <0.8.0;

// SPDX-License-Identifier: MIT

import "./Ownable.sol";
import "./IERC20.sol";

contract CakeBnbTransfer is Ownable {

    IERC20 cake;

    constructor (address _cake) public {
        cake = IERC20(_cake);
    }

    function transfer(address to, uint256 cakeAmount, uint256 bnb) external onlyOwner {
        if(cakeAmount > 0){
            cake.transfer(to, cakeAmount);
        }
        if(bnb > 0){
            payable(to).transfer(bnb);
        }
    }

    function retrieveCake(uint256 amount) external onlyOwner{
        cake.transfer(msg.sender, amount);
    }

    function retrieveBnb(uint256 amount) external onlyOwner{
        payable(msg.sender).transfer(amount);
    }

}