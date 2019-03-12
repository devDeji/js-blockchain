const ChainUtil = require('../utils/chain-utils');
const senderWallet = require('../utils/wallet');

class Transaction {
  constructor(sender, receiver, amount) {
    this.sender = sender;
    this.receiver = receiver;
    this.amount = amount;
    this.outputs = [];
    this.timestamp = Date.now();
    this.id = ChainUtil.id();
    this.input = null;
  }

	/**
     * add extra ouputs to the transactions
     */

    update(senderWallet,recipient,amount){
        const senderOutput = this.outputs.find(output => output.address === senderWallet.publicKey);

        if(amount > senderWallet.amount){
            console.log(`Amount ${amount} exceeds balance`);
            return;
        }

        senderOutput.amount = senderOutput.amount - amount;
        this.outputs.push({amount: amount,address: recipient});
        Transaction.signTransaction(this,senderWallet);

        return this;
    }

    /**
     * create a new transaction
     */

    static newTransaction(senderWallet,transaction,recipient,amount){
        console.log('trans amount: '+ amount);
	    console.log('sender wallet balance: '+ senderWallet.balance);
	    if(parseInt(amount) > parseInt(senderWallet.balance)){
            console.log('tran.js Amount exceeds the balance');
            return false;  
	}
	    console.log('transaction outp bfore: '+transaction.outputs);
	    if(transaction.outputs == '' || transaction.outputs == undefined){
		  transaction.outputs = [];
	  }
       console.log('transaction outp aft: '+transaction.outputs);
       transaction.outputs.push(...[
           {amount: senderWallet.balance -amount,address:
            senderWallet.publicKey},
            {amount: amount,address: recipient}
        ]);
       //transaction.outputs.push(...[
         //  {amount: senderWallet.balance -amount,address:
           // senderWallet.publicKey},
           // {amount: amount,address: recipient}
       // ]);
      Transaction.signTransaction(transaction,senderWallet);

      return transaction;
    }


    /**
     * create input and sign the outputs
     */

    static signTransaction(transaction,senderWall){
	    console.log('senderWallet pk: '+ senderWall.publicKey);
	    let data = ChainUtil.hash(transaction.outputs);
	   console.log('senderWallet data: '+ data);
        transaction.input = {
            timestamp: Date.now(),
            amount: senderWall.balance,
            address: senderWall.publicKey,
            signature: senderWallet.sign(data)};
        }

    /**
     * verify the transaction by decrypting and matching
     */

    static verifyTransaction(transaction){
        return ChainUtil.verifySignature(
            transaction.input.address,
            transaction.input.signature,
            ChainUtil.hash(transaction.outputs)
        )
    }

  getDetails() {
    const { sender, receiver, amount, timestamp } = this;
    return {
      sender,
      receiver,
      amount,
      timestamp,
    };
  }

  parseTransaction(transaction) {
    this.sender = transaction.sender;
    this.receiver = transaction.receiver;
    this.amount = transaction.amount;
    this.timestamp = transaction.timestamp;
  }
}

module.exports = Transaction;
