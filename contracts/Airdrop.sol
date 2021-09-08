
pragma solidity ^0.6.3;

// SPDX-License-Identifier: MIT

import "./Ownable.sol";
import "./IERC20.sol";

contract Airdrop is Ownable {

  function drop(IERC20 token, address[] memory recipients, uint256[] memory values) public onlyOwner {
    for (uint256 i = 0; i < recipients.length; i++) {
      token.transfer(recipients[i], values[i]);
    }
  }
  
  function dropETH(address[] memory recipients, uint256[] memory values) public onlyOwner {
    for (uint256 i = 0; i < recipients.length; i++) {
      payable(recipients[i]).transfer(values[i]);
    }
  }

  function rescueErc20(address erc20, uint256 amount) external onlyOwner {
      IERC20(erc20).transfer(owner(), amount);
  }

  function rescueEth() external onlyOwner {
      payable(owner()).transfer(address(this).balance);
  }

  function kill() external onlyOwner {
    selfdestruct(payable(owner()));
  }
}