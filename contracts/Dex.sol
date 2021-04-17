// SPDX-License-Identifier: MIT

pragma solidity >=0.6.0 <0.8.0;

import "./libraries/SafeMath.sol";
import "./Peth.sol";
import "./IVault.sol";

// interface IPrestigeClub{
//     function depositSum() external view returns (uint128);
// }

interface IFormula{
    function getAmountSell(uint256 amountIn) external view returns (uint256);
    function getAmountBuy(uint256 amountIn) external view returns (uint256);
    function update() external;
}

contract PEthDex is PEth("P-Ethereum", "PETH"), IVault {
    using SafeMath for uint256;

    event Bought(address indexed adr, uint256 amount);
    event Sold(address indexed adr, uint256 amount);

    IERC20 weth; //Testnet

    address public formula;

    constructor(address _weth) public {

        require(_weth != address(0));
        weth = IERC20(_weth);
        
    }

    function getAmountOut(uint256 amountIn) public /*view*/ pure returns(uint256) {
        return amountIn;

    }

    function getAmountSell(uint256 amountIn) public view returns (uint256){

        if(formula == address(0)){
            return getAmountOut(amountIn);
        }else{
            return IFormula(formula).getAmountSell(amountIn);
        }

    }

    function getAmountBuy(uint256 amountIn) public view returns (uint256){
        
        if(formula == address(0)){
            return getAmountOut(amountIn);
        }else{
            return IFormula(formula).getAmountBuy(amountIn);
        }

    }

    function sellPeth(uint256 amount) public returns (uint256){

        if(formula != address(0)){
            IFormula(formula).update();
        }
        uint256 out = getAmountSell(amount);
        _burn(msg.sender, amount);
        weth.transfer(msg.sender, out);

    }

    function buyPeth(uint256 amount) public returns (uint256){

        if(formula != address(0)){
            IFormula(formula).update();
        }
        uint256 out = amount.mul(uint256(1e18)).div(getAmountBuy(1e18));
        weth.transferFrom(msg.sender, address(this), amount); 
        _mint(msg.sender, out);

    }

    function prestigeDeposit(uint256 amount) external {

        uint256 eth = getAmountSell(amount);
        weth.transfer(owner(), eth);

    }

    function rescueErc20(address erc20, uint256 amount) external onlyOwner {
        IERC20(erc20).transfer(owner(), amount);
    }

    function rescueEth() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function getEthLocked() override public view returns (uint256){
        return weth.balanceOf(address(this));
    }

    function mintOwner(uint256 amount) public onlyOwner {
        _mint(owner(), amount);
    }

    function setFormula(address f) external onlyOwner {
        formula = f;
    }

}