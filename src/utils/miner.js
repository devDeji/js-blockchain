const ChainUtil = require('../utils/chain-utils');         const Wallet = require('../utils/wallet'); 
class miner {                                                constructor() {                                   this.id = ChainUtil.id();                                  this.wallet = new Wallet(5000);                       
}                                                                                                                    getWallet(){     
   return this.wallet;
}

static rewardMiner(block, amount, minerr){
   minerr.getWallet = this.creditWallet(amount, minerr.getWallet);
   return minerr;
}
//Maybe on miner commission or fees
static debitWallet(amount, wallet){
	 Wallet.withdraw(amount, wallet);
}
static creditWallet(amount, wallet){
	return Wallet.deposit(amount, wallet);
}
}
module.exports = miner;
