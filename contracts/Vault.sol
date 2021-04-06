// SPDX-License-Identifier: MIT

pragma solidity >=0.6.0 <0.8.0;

import "./IVault.sol";
import "./Ownable.sol";
import "./IUniswapV2Router02.sol";

contract SimpleVault is IVault, Ownable {

    uint256 private ethLocked = 0;
    uint256 private usdLocked = 0;

    IUniswapV2Router02 router = IUniswapV2Router02(0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff);

    address weth;
    address usdc;

    constructor(address _weth, address _usdc) public {
        weth = _weth;
        usdc = _usdc;
    }

    function getEthLocked() override external view returns (uint256){
        uint256 usdEth = 0;

        if(usdLocked > 0){
            address[] memory path = new address[](2);
            path[0] = usdc;
            path[1] = weth;

            usdEth = router.getAmountsOut(usdLocked, path)[1];
        }

        return ethLocked + usdEth;
    }

    function setEthLocked(uint256 _ethLocked) external onlyOwner {
        ethLocked = _ethLocked;
    }

    function addEthLocked(uint256 addition) external onlyOwner {
        ethLocked = ethLocked + addition;
    }

    function setUSDLocked(uint256 _usdLocked) external onlyOwner {
        usdLocked = _usdLocked;
    }

    function addUSDLocked(uint256 addition) external onlyOwner {
        usdLocked = usdLocked + addition;
    }

    function destroy() external onlyOwner {
        selfdestruct(msg.sender);
    }

}