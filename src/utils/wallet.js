const { INITIAL_BALANCE } = require('../constants.js');
const ChainUtil = require('./chain-utils.js');

class Wallet{
    /**
     * the wallet will hold the public key
     * and the private key pair
     * and the balance
     */
    constructor(){
        this.balance = INITIAL_BALANCE;
        this.keyPair = ChainUtil.genKeyPair();
	    //usually the address
        this.publicKey = this.keyPair.getPublic().encode('hex');
    }
    toSign(data){
	let signed = data;


	console.log('signed:'+signed);
	return signed;
}
 static toString(data){
       return data;
       return `Wallet - 
        publicKey: ${this.publicKey.toString()}
        balance  : ${this.balance}`
    }
    static sign(data){
	   let dat = JSON.stringify(data).toString();
	    console.log('sign data: '+dat);
	    return ChainUtil.genKeyPair().sign(dat);
   }
  static deposit(amount, wallet){
          wallet.balance = wallet.balance + amount;
	  return wallet;
  }
 static  withdraw(amount, senderWallet){
	 console.log('senderWallet addr '+ senderWallet.publicKey);
	  if(senderWallet.balance < amount){
		  return false
	  } else{
                  senderWallet.balance = senderWallet.balance - amount;
		  console.log('SenderWallet bal: '+senderWallet.balance);
		  return senderWallet;
	  }
  }
}
module.exports = Wallet;
