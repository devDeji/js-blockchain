const ChainUtil = require('../utils/chain-utils');

class TransactionPool {
   
  constructor(transaction) {
    this.id = ChainUtil.id();
     if(transaction){
       this.transactions = [];
       this.transactions.push(transaction);
     }else {
        this.transactions = [];
     }
    console.log('transactionPool new trans: '+ transaction);
    this.timestamp = Date.now();
  }
static getInstance(){
	if(!this.txnPoolIns){
           var txnPoolIns = new TransactionPool([]);
		return txnPoolIns;
	}
	else {
		return this.txnPoolIns;
	}
}
 static getRewarded(transaction){
	 let txnPoolTxn = this.transactionPool.transactions;
	 for (let i = 0;i < txnPoolTxn.length;i++){
 if(transaction.id == txnPoolTxn[i].id){
	      return txnPoolTxn[i].rewarded;
	 }
     }
 }

 static addTransaction(transaction, txnPoolIns){   
	console.log('Adding txn: '+ transaction.id);
	console.log('In txnPool: '+ txnPoolIns.id);
	txnPoolIns.transactions.push(transaction);       
	return txnPoolIns;
 }

static setRewarded(transaction){
let txnPoolTxn = this.transactionPool.transactions;
for (let i = 0;i < txnPoolTxn.length; i++){
if(transaction.id == txnPoolTxn[i].id){
	      txnPoolTxn.rewarded = true;
              return transaction;
         }
      }
 }

static getMined(transaction){    
let txnPoolTxn = this.transactionPool.transactions;
	for (let i = 0;i < txnPoolTxn.length;i++){
if(transaction.id == txnPoolTxn.id){
              return txnPoolTxn.mined;
         }
     }                                                      }

static  setMined(transaction){    
let txnPoolTxn = this.transactionPool.transactions;
	for (let i = 0;i < txnPoolTxn.length;i++){
if(transaction.id == txnPoolTxn[i].id){
              txnPoolTxn[i].mined
= true;
              return transaction;                                               }                                           }
}

static getMiner(transaction){     
let txnPoolTxn = this.transactionPool.transactions;
	for (let i = 0;i < txnPoolTxn.length;i++){       if(transaction.id == txnPoolTxn[i].id){                                                                      return txnPoolTxn.minerId;              }                                                      } 
}

static getTransactionPool(){
	return this.transactionPool;
}

}
module.exports = TransactionPool;


