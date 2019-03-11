const ChainUtil = require('../utils/chain-utils');         const Wallet = require('../utils/wallet'); 
class miner {                                                constructor() {                                   this.id = ChainUtil.id();                                  this.wallet = new Wallet(5000);                       
}                                                                                                                    getWallet(){     
   return this.wallet;
}
creditWallet(amount){
  Wallet.deposit(amount);
}
//Maybe on miner commission or fees
debitWallet(amount){
	 Wallet.withdraw(amount);
}
}
module.exports = miner;
