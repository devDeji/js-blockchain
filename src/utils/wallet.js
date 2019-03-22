const { INITIAL_BALANCE } = require('../constants.js');
const ChainUtil = require('./chain-utils.js');
const ac_utils = require('./ac_utils.js');
const acui_main = require('./acui_main.js');
const fs = require('fs');

class Wallet{
    /**
     * the wallet will hold the public key
     * and the private key pair
     * and the balance
     */
    constructor(params){
	this.name = params || 'test';
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
 static toString(wallet){
      //return data;
      // return 'Wallet - publicKey: '+ wallet.publicKey.toString() +
      //  'balance  : ' + wallet.balance;
      return JSON.stringify(wallet);
    }
static finalizeWalletCreate(wallet){
	return new Promise((resolve, reject) => {
	console.log('wallet: '+ wallet.name);
	this.toFile(wallet).then((res) => {
	 console.log('Adding wallet to add book with public key: '+ res);
          this.toAddressBook(res).then((resp) => {
	     console.log('Added wallet to address book: '+ resp.name);
		  return resolve(wallet.name);
	  }).catch((err) => {
	      return reject(err);
	  });
	}).catch((err) => {
	   return reject(err);
	});
    });
}
static toFile(wallet){
	return new Promise((resolve, reject) => {
	let fileDat = this.toString(wallet);
	let filePath = './utils/wallets/'+ wallet.name+'.twl';
	console.log('filePath: '+filePath);
	fs.writeFileSync(filePath, fileDat,
		(err) => {
            if (err){
		    console.log('err: '+ err);
		    throw err;
	    }
	   console.log('Wallet saved to file'+ fileDat);
	});
        console.log('Added wallet to file: '+ wallet.name);
	return resolve(wallet.publicKey);
	});
}
static toAddressBook(address){
	return new Promise((resolve, reject) => {
	let walPayId = acui_main.genPaymentId(true);
	console.log('walPayId: '+walPayId);
	acui_main.addAddressBookEntry('devj',address,walPayId, 0).then((res) => {
          console.log('Wallet added to addbook: '+ res.data);
		return resolve(res);
	}).catch((err) => {
		console.log(err);
		return reject(err);
	});
	});
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
