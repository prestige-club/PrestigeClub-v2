pragma solidity 0.6.8;

import "./libraries/PrestigeClubCalculations.sol";
import "./libraries/SafeMath112.sol";
import "./IERC20.sol";
import "./Ownable.sol";

// SPDX-License-Identifier: MIT

//Restrictions:
//only 2^32 Users
//Maximum of (2^104 / 10^18 Ether) investment. Theoretically 20 Trl Ether, practically 100000000000 Ether compiles
contract PrestigeClub is Ownable() {

    using SafeMath112 for uint112;

    //User Object which stores all data associated with a specific address
    struct User {
        uint112 deposit; //amount a User has paid in. Note: Deposits can not removed, since withdrawals are only possible on payout
        uint112 payout; //Generated revenue
        uint32 position; //The position (a incrementing int value). Used for calculation of the streamline
        uint8 qualifiedPools;  //Number of Pools and DownlineBonuses, which the User has qualified for respectively
        uint8 downlineBonus;
        address referer;
        address[] referrals;

        uint112 directSum;   //Sum of deposits of all direct referrals
        uint40 lastPayout;  //Timestamp of the last calculated Payout

        uint40 lastPayedOut; //Point in time, when the last Payout was made

        uint112[5] downlineVolumes;  //Used for downline bonus calculation, correspondings to logical mapping  downlineBonusStage (+ 0) => sum of deposits of users directly or indirectly referred in given downlineBonusStage
    }
    
    event NewDeposit(address indexed addr, uint112 amount);
    event PoolReached(address indexed addr, uint8 pool);
    // event DownlineBonusStageReached(address indexed adr, uint8 stage);
    // event Referral(address indexed addr, address indexed referral);
    
    event Payout(address indexed addr, uint112 interest, uint112 direct, uint112 pool, uint112 downline, uint40 dayz); 
    
    event Withdraw(address indexed addr, uint112 amount);
    
    mapping (address => User) public users;
    //userList is basically a mapping position(int) => address
    address[] public userList;

    uint32 public lastPosition; //= 0
    
    uint128 public depositSum; //= 0
    
    Pool[8] public pools;
    
    struct Pool {
        uint112 minOwnInvestment;
        uint8 minDirects;
        uint112 minSumDirects;
        uint8 payoutQuote; //ppm
        uint32 numUsers;
    }

    //Poolstates are importing for calculating the pool payout for every seperate day.
    //Since the number of Deposits and Users in every pool change every day, but payouts are only calculated if they need to be calculated, their history has to be stored
    PoolState[] public states;

    struct PoolState {
        uint128 totalDeposits;
        uint32 totalUsers;
        uint32[8] numUsers;
    }

    //Downline bonus is a bonus, which users get when they reach a certain pool. The Bonus is calculated based on the sum of the deposits of all Users delow them in the structure
    DownlineBonusStage[4] downlineBonuses;
    
    struct DownlineBonusStage {
        uint32 minPool;
        uint64 payoutQuote; //ppm
    }
    
    uint40 public pool_last_draw;

    IERC20 peth;
    
    constructor(address erc20Adr) public {
 
        uint40 timestamp = uint40(block.timestamp);
        pool_last_draw = timestamp - (timestamp % payout_interval) - (1 * payout_interval);

        peth = IERC20(erc20Adr);

        //Definition of the Pools and DownlineBonuses with their respective conditions and percentages. 
        //Note, values are not final, adapted for testing purposes

        //Prod values
        // pools[0] = Pool(3 ether, 1, 3 ether, 130, 0);
        // pools[1] = Pool(15 ether, 3, 5 ether, 130, 0);
        // pools[2] = Pool(15 ether, 4, 44 ether, 130, 0);
        // pools[3] = Pool(30 ether, 10, 105 ether, 130, 0);
        // pools[4] = Pool(45 ether, 15, 280 ether, 130, 0);
        // pools[5] = Pool(60 ether, 20, 530 ether, 130, 0);
        // pools[6] = Pool(150 ether, 20, 1470 ether, 80, 0);
        // pools[7] = Pool(300 ether, 20, 2950 ether, 80, 0);

        // downlineBonuses[0] = DownlineBonusStage(3, 50);
        // downlineBonuses[1] = DownlineBonusStage(4, 100);
        // downlineBonuses[2] = DownlineBonusStage(5, 160);
        // downlineBonuses[3] = DownlineBonusStage(6, 210);
        
        //Testing Pools
        pools[0] = Pool(1000 wei, 1, 1000 wei, 130, 0); 
        pools[1] = Pool(1000 wei, 1, 1000 wei, 130, 0);
        pools[2] = Pool(1000 wei, 1, 10000 wei, 130, 0);
        pools[3] = Pool(2 ether, 1, 10000 wei, 130, 0);
        pools[4] = Pool(2 ether, 1, 10000 wei, 130, 0);
        pools[5] = Pool(2 ether, 1, 10000 wei, 130, 0);
        pools[6] = Pool(2 ether, 1, 10000 wei, 130, 0);
        pools[7] = Pool(5 ether, 5, 10 ether, 80, 0);
        
        //Test Values
        downlineBonuses[0] = DownlineBonusStage(3, 100);
        downlineBonuses[1] = DownlineBonusStage(4, 160);
        downlineBonuses[2] = DownlineBonusStage(5, 210);
        downlineBonuses[3] = DownlineBonusStage(6, 260);

        userList.push(address(0));
        
    }
    
    uint112 internal minDeposit = 1 wei; //Prod: 1 ether;
    
    uint40 constant internal payout_interval = 10 minutes; //Prod: 1 days;
    
    //Investment function for new deposits
    function recieve(uint112 amount) public {
        require((users[msg.sender].deposit * 20 / 19) >= minDeposit || amount >= minDeposit, "Mininum deposit value not reached");
        
        address sender = msg.sender;

        uint112 value = amount.mul(19).div(20);

        //Transfer peth
        peth.transferFrom(sender, address(this), amount);

        bool userExists = users[sender].position != 0;
        
        //Trigger calculation of next Pool State, if 1 day has passed
        triggerCalculation();

        // Create a position for new accounts
        if(!userExists){
            lastPosition++;
            users[sender].position = lastPosition;
            users[sender].lastPayout = (pool_last_draw + 1);
            userList.push(sender);
        }

        address referer = users[sender].referer; //can put outside because referer is always set since setReferral() gets called before recieve() in recieve(address)

        if(referer != address(0)){
            updateUpline(sender, referer, value);
        }

        //Update Payouts
        if(userExists){
            updatePayout(sender);
        }

        users[sender].deposit = users[sender].deposit.add(value);
        
        //Transfer fee
        peth.transfer(owner(), (amount - value));
        
        emit NewDeposit(sender, value);
        
        updateUserPool(sender);
        updateDownlineBonusStage(sender);
        if(referer != address(0)){
            users[referer].directSum = users[referer].directSum.add(value);

            updateUserPool(referer);
            updateDownlineBonusStage(referer);
        }
        
        depositSum = depositSum + value; //Won´t do an overflow since value is uint112 and depositSum 128

    }
    
    
    //New deposits with referral address
    function recieve(uint112 amount, address referer) public {
        
        _setReferral(referer);
        recieve(amount);
        
    }

    // uint8 public downlineLimit = 31;

    //Updating the payouts and stats for the direct and every User which indirectly referred User reciever
    //adr = Address of the first referer , addition = new deposit value
    function updateUpline(address reciever, address adr, uint112 addition) private {
        
        address current = adr;
        uint8 bonusStage = users[reciever].downlineBonus;
        
        uint8 downlineLimitCounter = 30;//downlineLimit - 1;
        
        while(current != address(0) && downlineLimitCounter > 0){

            updatePayout(current);

            users[current].downlineVolumes[bonusStage] = users[current].downlineVolumes[bonusStage].add(addition);
            uint8 currentBonus = users[current].downlineBonus;
            if(currentBonus > bonusStage){
                bonusStage = currentBonus;
            }

            current = users[current].referer;
            downlineLimitCounter--;
        }
        
    }
    
    //Updates the payout amount for given user
    function updatePayout(address adr) private {
        
        uint40 dayz = (uint40(block.timestamp) - users[adr].lastPayout) / (payout_interval);  //TODO Maybe SafeMath? Because of Attack where block.timestamp could be manipulated? How probably is it?
        if(dayz >= 1){
            
            //Interest Payout
            uint112 deposit = users[adr].deposit;
            //Calculate Base Payouts
            uint8 quote;
            if(deposit >= 30 ether){
                quote = 15;
            }else{
                quote = 10;
            }
            
            uint112 interestPayout = deposit.mul(quote) / 10000;
            // uint112 interestPayout = getInterestPayout(adr);

            uint112 poolpayout = getPoolPayout(adr, dayz);

            uint112 directsPayout = users[adr].directSum.mul(5) / 10000;//getDirectsPayout(adr);

            uint112 downlineBonusAmount = getDownlinePayout(adr);
            
            uint112 sum = interestPayout.add(directsPayout).add(downlineBonusAmount); 
            sum = (sum.mul(dayz)).add(poolpayout);
            
            users[adr].payout = users[adr].payout.add(sum);
            users[adr].lastPayout += (payout_interval * dayz);
            
            emit Payout(adr, interestPayout, directsPayout, poolpayout, downlineBonusAmount, dayz);
            
        }
    }
    
    // function getInterestPayout(address adr) public view returns (uint112){
    //     // return PrestigeClubCalculations.getInterestPayout(users[adr].deposit);

    //     uint112 deposit = users[adr].deposit;
    //     //Calculate Base Payouts
    //     uint8 quote;
    //     if(deposit >= 30 ether){
    //         quote = 15;
    //     }else{
    //         quote = 10;
    //     }
        
    //     return deposit.mul(quote) / 10000;
    // }
    
    function getPoolPayout(address adr, uint40 dayz) public view returns (uint112){
        return PrestigeClubCalculations.getPoolPayout(users[adr], dayz, pools, states);
    }

    //Pool Payout does not get calculated per day but for the amount of days passed as arguments
    // function getPoolPayout(address adr, uint40 dayz) public view returns (uint112){

    //     uint40 length = (uint40)(states.length);

    //     uint112 poolpayout = 0;

    //     if(users[adr].qualifiedPools > 0){
    //         for(uint40 day = length - dayz ; day < length ; day++){


    //             uint112 numUsers = states[day].totalUsers;
    //             uint112 streamline = uint112(uint112(states[day].totalDeposits).mul(numUsers.sub(users[adr].position))).div(numUsers);

    //             uint112 payout_day = 0; //TODO Merge into poolpayout, only for debugging
    //             uint32 stateNumUsers = 0;
    //             for(uint8 j = 0 ; j < users[adr].qualifiedPools ; j++){
    //                 uint112 pool_base = streamline.mul(pools[j].payoutQuote) / 1000000;

    //                 stateNumUsers = states[day].numUsers[j];

    //                 if(stateNumUsers != 0){
    //                     payout_day += pool_base.div(stateNumUsers);
    //                 }
    //             }

    //             poolpayout = poolpayout.add(payout_day);

    //         }
    //     }
        
    //     return poolpayout;
    // }

    function getDownlinePayout(address adr) public view returns (uint112){
        return PrestigeClubCalculations.getDownlinePayout(users[adr], downlineBonuses);
    }
    // function getDownlinePayout(address adr) public view returns (uint112){

    //     //Calculate Downline Bonus
    //     uint112 downlinePayout = 0;
        
    //     uint8 downlineBonus = users[adr].downlineBonus;
        
    //     if(downlineBonus > 0){
            
    //         uint64 ownPercentage = downlineBonuses[downlineBonus - 1].payoutQuote;

    //         for(uint8 i = 0 ; i < downlineBonus; i++){

    //             uint64 quote = 0;
    //             if(i > 0){
    //                 quote = downlineBonuses[i - 1].payoutQuote;
    //             }

    //             uint64 percentage = ownPercentage - quote;
    //             if(percentage > 0){ //Requiring positivity and saving gas for 0, since that returns 0

    //                 downlinePayout = downlinePayout.add(users[adr].downlineVolumes[i].mul(percentage) / 1000000); //TODO If the error occures here, this will prevent fixes (?)

    //             }

    //         }

    //         if(downlineBonus == 4){
    //             downlinePayout = downlinePayout.add(users[adr].downlineVolumes[4].mul(50) / 1000000);
    //         }

    //     }
    //     return downlinePayout;
    // }

    //TODO If possible, reactivate
    // function getDirectsPayout(address adr) public view returns (uint112) {
        
        //Calculate Directs Payouts
        // return PrestigeClubCalculations.getDirectsPayout(users[adr].directSum);

    //    return users[adr].directSum.mul(5) / 10000;
        
    // }
    
    function triggerCalculation() public {  //TODO Remove and add if to pushPoolState 
        if(block.timestamp > pool_last_draw + payout_interval){
            pushPoolState();
        }
    }

    //Gets called every 24 hours to push new PoolState
    function pushPoolState() private {
        uint32[8] memory temp;
        for(uint8 i = 0 ; i < 8 ; i++){
            temp[i] = pools[i].numUsers;
        }
        states.push(PoolState(depositSum, lastPosition, temp));
        pool_last_draw += payout_interval;
    }

    //updateUserPool and updateDownlineBonusStage check if the requirements for the next pool or stage are reached, and if so, increment the counter in his User struct 
    function updateUserPool(address adr) private {
        
        if(users[adr].qualifiedPools < pools.length){
            
            uint8 poolnum = users[adr].qualifiedPools;
            
            uint112 sumDirects = users[adr].directSum;
            
            //Check if requirements for next pool are met
            if(users[adr].deposit >= pools[poolnum].minOwnInvestment && users[adr].referrals.length >= pools[poolnum].minDirects && sumDirects >= pools[poolnum].minSumDirects){
                users[adr].qualifiedPools = poolnum + 1;
                pools[poolnum].numUsers++;
                
                emit PoolReached(adr, poolnum + 1);
                
                updateUserPool(adr);
            }
            
        }
        
    }
    
    function updateDownlineBonusStage(address adr) private {

        uint8 bonusstage = users[adr].downlineBonus;

        if(bonusstage < downlineBonuses.length){

            //Check if requirements for next stage are met
            if(users[adr].qualifiedPools >= downlineBonuses[bonusstage].minPool){
                users[adr].downlineBonus += 1;
                
                //Update data in upline
                uint112 value = users[adr].deposit;  //Value without current stage, since that must not be subtracted

                for(uint8 i = 0 ; i <= bonusstage ; i++){
                    value = value.add(users[adr].downlineVolumes[i]);
                }

                // uint8 previousBonusStage = bonusstage;
                uint8 currentBonusStage = bonusstage + 1;
                uint8 lastBonusStage = bonusstage;

                address current = users[adr].referer;
                while(current != address(0)){

                    
                    users[current].downlineVolumes[lastBonusStage] = users[current].downlineVolumes[lastBonusStage].sub(value);
                    users[current].downlineVolumes[currentBonusStage] = users[current].downlineVolumes[currentBonusStage].add(value);

                    uint8 currentDB = users[current].downlineBonus;
                    if(currentDB > currentBonusStage){
                        currentBonusStage = currentDB;
                    }
                    if(currentDB > lastBonusStage){
                        lastBonusStage = currentDB;
                    }

                    if(lastBonusStage == currentBonusStage){
                        break;
                    }

                    current = users[current].referer;
                }

                //emit DownlineBonusStageReached(adr, users[adr].downlineBonus);
                
                updateDownlineBonusStage(adr);
            }
        }
        
    }
    
   // function calculateDirects(address adr) external view returns (/*uint112, */uint32) {
        
        // address[] memory referrals = referrals;
        
        // uint112 sum = 0;
        // for(uint32 i = 0 ; i < referrals.length ; i++){
        //     sum = sum.add(users[referrals[i]].deposit);
        // }
        
        // return (sum, (uint32)(referrals.length));
      //  return (/*users[adr].directSum, */(uint32)(users[adr].referrals.length));
    //}
    
    //Endpoint to withdraw payouts
    function withdraw(uint112 amount) public {

        require(users[msg.sender].lastPayedOut + 12 hours < block.timestamp, "10");
        require(amount < users[msg.sender].deposit.mul(3), "11");  //TODO TODO TODO AUSKOMMENTIEREN

        triggerCalculation();
        updatePayout(msg.sender);

        // require(amount > minWithdraw, "Minimum Withdrawal amount not met");
        require(users[msg.sender].payout >= amount, "Not enough payout available");
        
        uint112 transfer = amount * 19 / 20;
        
        users[msg.sender].payout -= amount;

        users[msg.sender].lastPayedOut = uint40(block.timestamp);

        //Mint if necessary
        if(peth.balanceOf(address(this)) < amount){
            peth.mint(uint256(amount));
        }
        
        peth.transfer(msg.sender, transfer);
        
        peth.transfer(owner(), (amount - transfer));
        
        emit Withdraw(msg.sender, amount);
        
    }

    function _setReferral(address referer) private {
        
        if(users[msg.sender].referer == referer){
            return;
        }
        
        if(users[msg.sender].position != 0 && users[msg.sender].position < users[referer].position) {
            return;
        }
        
        require(users[msg.sender].referer == address(0), "Referer already set");
        require(users[referer].position > 0, "Referer doesnt exist");
        require(msg.sender != referer, "Referer is self");
        
        users[referer].referrals.push(msg.sender);
        users[msg.sender].referer = referer;

        if(users[msg.sender].deposit > 0){
            users[referer].directSum = users[referer].directSum.add(users[msg.sender].deposit);
        }
        
    }
    
    function setLimits(uint112 _minDeposit) public onlyOwner {
        minDeposit = _minDeposit;
    }

    //Data Import Logic
    function reCalculateImported(uint64 from, uint64 to, uint32 _lastPosition, uint112 _depositSum) public onlyOwner {
        uint40 time = pool_last_draw - payout_interval;
        for(uint64 i = from ; i < to + 1 ; i++){
            address adr = userList[i];
            users[adr].payout = 0;
            users[adr].lastPayout = time;
            updatePayout(adr);
        }
        lastPosition = _lastPosition;
        depositSum = _depositSum;
    }
    
    function _import(address[] memory sender, uint112[] memory deposit, address[] memory referer, uint32[] memory positions) public onlyOwner {
        for(uint64 i = 0 ; i < sender.length ; i++){
            importUser(sender[i], deposit[i], referer[i], positions[i]);
        }
    }
    
    function importUser(address sender, uint112 value, address referer, uint32 position) internal onlyOwner {

        require(users[sender].deposit == 0, "Account exists already");

        // Create a position for new accounts
        // lastPosition++;
        users[sender].position = position;
        users[sender].lastPayout = pool_last_draw;
        userList.push(sender);

        if(referer != address(0)){

            users[referer].referrals.push(sender);
            users[sender].referer = referer;

            updateUpline(sender, referer, value);
        }

        users[sender].deposit = value;
        
        emit NewDeposit(sender, value);
        
        updateUserPool(sender);
        updateDownlineBonusStage(sender);
        
        if(referer != address(0)){
            users[referer].directSum += value;
    
            updateUserPool(referer);
            updateDownlineBonusStage(referer);
        }
        
        // depositSum +_depositSum= value;
        
    }

    // function getPoolUsers(uint32 index, uint32 index2) external view returns (uint112){
    //     return states[index].numUsers[index2];
    // }

    // PrestigeClub oldContract;

    // function setOldContracts(address adr) external{
    //     oldContract = PrestigeClub(adr);
    // }

    /*function _import2(address[] memory senders) public onlyOwner {
        for(uint64 i = 0 ; i < senders.length ; i++){

            address sender = senders[i];

            (uint112 deposit, uint112 payout, uint32 position, uint8 qualifiedPools, uint8 downlineBonus, address referer, uint112 directSum, uint40 lastPayout, )
             = oldContract.users(sender);

            if(referer != address(0)){
                users[referer].referrals.push(sender);
                users[sender].referer = referer;
            }

            //Copy fields
            users[sender].deposit = deposit;
            users[sender].payout = payout;
            users[sender].qualifiedPools = qualifiedPools;
            users[sender].downlineBonus = downlineBonus;
            //users[sender].referer = referer;
            users[sender].directSum = directSum;
            //users[sender].lastPayedOut = uint40(block.timestamp);

            //users[sender].referrals = oldContract.getUserReferrals(sender);

            // Create a position for new accounts
            users[sender].position = position;
            users[sender].lastPayout = lastPayout;
            userList.push(sender);

            if(referer != address(0)){
                // updateUpline(sender, referer, deposit);
                updateUpline(sender, referer, deposit);  //Checken
            }

            emit NewDeposit(sender, deposit);
        }

        //Update Pools

        for(uint8 i = 0 ; i < 8 ; i++){
            (,,,, uint32 numUsers) = oldContract.pools(i);
            pools[i].numUsers = numUsers;
        }

        depositSum = oldContract.depositSum();

        lastPosition = oldContract.lastPosition();

        pushPoolState();
    }*/

    function getDetailedUserInfos(address adr) public view returns (address[] memory /*referrals */, uint112[5] memory /*volumes*/) {
        return (users[adr].referrals, users[adr].downlineVolumes);
    }

    function getDownline() public view returns (uint112, uint128){  //TODO Add address user
        return PrestigeClubCalculations.getDownline(users);
    }

    // function getVolumes(address user) external view returns (uint112[5] memory) {
    //     return users[user].downlineVolumes;
    // }

    // function getUserReferrals(address adr) public view returns (address[] memory referrals){
    //     return users[adr].referrals;
    // }
    
    //DEBUGGING
    //Used for extraction of User data in case of something bad happening and fund reversal needed.
    function getUserList() public view returns (address[] memory){  //TODO Probably not needed
        return userList;
    }

    function sellAccount(address from, address to) public { 

        require(msg.sender == owner() || msg.sender == _sellingContract, "Not authorized");

        require(users[from].deposit > 0, "User does not exist");

        userList[users[from].position] = to;

        address referer = users[from].referer;
        if(referer != address(0)){
            address[] memory arr = users[referer].referrals;
            for(uint16 i = 0 ; i < arr.length ; i++){
                if(arr[i] == from){
                    users[referer].referrals[i] = to;
                    break;
                }
            }
        }

        for(uint16 i = 0 ; i < users[from].referrals.length ; i++){
            users[users[from].referrals[i]].referer = to;
        }

        users[to] = users[from];
        delete users[from];

    }
}

/*  struct User {
        uint112 deposit; //amount a User has paid in. Note: Deposits can not removed, since withdrawals are only possible on payout
        uint112 payout; //Generated revenue
        uint32 position; //The position (a incrementing int value). Used for calculation of the streamline
        uint8 qualifiedPools;  //Number of Pools and DownlineBonuses, which the User has qualified for respectively
        uint8 downlineBonus;
        address referer;
        address[] referrals;

        uint112 directSum;   //Sum of deposits of all direct referrals
        uint40 lastPayout;  //Timestamp of the last calculated Payout

        uint40 lastPayedOut; //Point in time, when the last Payout was made

        uint112[5] downlineVolumes;  //Used for downline bonus calculation, correspondings to logical mapping  downlineBonusStage (+ 0) => sum of deposits of users directly or indirectly referred in given downlineBonusStage
    }*/

// contract SellablePrestigeClub is PrestigeClub {

//     constructor (address erc20Adr) PrestigeClub(erc20Adr) public {
//     }

//     function sellAccount(address from, address to) public onlyOwner {

//     }
    
//     function forceSetReferral(address adr, address referer) public onlyOwner {
//         users[referer].referrals.push(adr);
//         users[adr].referer = referer;
//     }

// }
