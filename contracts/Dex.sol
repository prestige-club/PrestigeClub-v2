// SPDX-License-Identifier: MIT

pragma solidity >=0.6.0 <0.8.0;

import "./libraries/SafeMath.sol";
import "./Peth.sol";
import "./IVault.sol";

interface IPrestigeClub{
    function depositSum() external view returns (uint128);
}

interface IFormula{
    function getAmountOut(uint256 amountIn) external view returns (uint256);
}

contract PEthDex is PEth("P-Ethereum", "PETH"), IVault {
    using SafeMath for uint256;

    event Bought(address indexed adr, uint256 amount);
    event Sold(address indexed adr, uint256 amount);

    // IERC20 usdc = IERC20(0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174);
    IERC20 weth; //Testnet

    IVault[] public vaults;

    address formula;

    IPrestigeClub prestigeclub;

    constructor(address _weth, address prestige) public {

        // weth = IERC20(0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa);
        require(_weth != address(0));
        weth = IERC20(_weth);
        
        _mint(_msgSender(), 4000 ether); //TODO Remove
        vaults.push(this);

        require(prestige != address(0));
        prestigeclub = IPrestigeClub(prestige);
        
    }

    function getAmountOut(uint256 amountIn) public view returns(uint256) {

        if(formula == address(0)){
            uint256 pethSupply = totalSupply().add(prestigeclub.depositSum());
            uint256 here = getTotalEthLocked();
            return amountIn.mul(here).div(pethSupply);
        }else{
            return IFormula(formula).getAmountOut(amountIn);
        }

    }

    function sellPeth(uint256 amount) public returns (uint256){

        uint256 out = getAmountOut(amount);
        _burn(msg.sender, amount);
        weth.transfer(msg.sender, out);

    }

    function buyPeth(uint256 amount) public returns (uint256){

        uint256 out = amount.mul(uint256(1e18)).div(getAmountOut(1e18));
        weth.transferFrom(msg.sender, address(this), amount);
        _mint(msg.sender, out);

    }

    function rescueErc20(address erc20, uint256 amount) external onlyOwner {
        IERC20(erc20).transfer(owner(), amount);
    }

    function rescueEth() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
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

    function getEthLocked() override public view returns (uint256){
        return weth.balanceOf(address(this));
    }

    function mintOwner(uint256 amount) public onlyOwner {
        _mint(owner(), amount);
    }

    function setFormula(address f) external onlyOwner {
        formula = f;
    }

    // bool stable = false;

    // function setStable(bool state) public onlyOwner {
    //     stable = state;
    // }

    // function set

    // function deposit() payable public { }

    // function buy() payable public {

    //     uint256 amountTobuy = msg.value;

    //     require(amountTobuy > 0, "You need to send some ether");
        
    //     payable(owner()).transfer(amountTobuy);

    //     _mint(msg.sender, amountTobuy);

    //     emit Bought(msg.sender, amountTobuy);

    // }

    // function sell(uint256 amount) public {
        
    //     require(amount > 0, "You need to sell at least some tokens");
    //     require(address(this).balance >= amount, "Not enough Ether to sell amount");

    //     uint256 balance = balanceOf(msg.sender);
    //     require(balance >= amount, "Not enough funds to sell");

    //     _burn(msg.sender, amount);

    //     bool success = payable(msg.sender).send(amount);
    //     require(success, "Transfer of ether not successful");

    //     emit Sold(msg.sender, amount);

    // }

}