const SocketActions = require('./constants');

const Transaction = require('./models/transaction');
const TransactionPool = require('./models/transactionPool');
const Blockchain = require('./models/chain');

const socketListeners = (socket, chain) => {
  socket.on(SocketActions.ADD_TRANSACTION, (sender, receiver, amount, senderWallet, transactionPl) => {
   console.log('Broadcasting new transaction to nodes sender pk: '+senderWallet.publicKey);
	  console.log('TransactionPool: '+transactionPl.id);
   const transaction = new Transaction(sender, receiver, amount);
     // TransactionPool.addTransaction(transaction);
	  //let txnPoolIns = transactionPl.getInstance();
	    
	  let  txnPoolIns = TransactionPool.addTransaction(transaction, transactionPl);
 let txnPoolTxn = txnPoolIns.transactions;
	  console.log('Tranpool: length'+ txnPoolTxn.length);
	  //Initial trans pool entry[0] is empty check server.js
	  for (let i = 1; i < txnPoolTxn.length; i++){
              console.log('Cycling thru trans pool: '+txnPoolTxn[i].id);
       let currTxn = txnPoolTxn[i];
		if(!currTxn.mined){
	      console.log('Found unmined txn: '+ currTxn.id);	 
   chain.newTransaction(senderWallet, currTxn, receiver, amount);
	      }
	  }	  
  });

	socket.on(SocketActions.TEST, (msg) => {
   console.log('Broadcasting mess to nodes: '+ msg);
   socket.emit('hello', 'can you hear me?', 1, 2, ' abc');
   socket.broadcast.emit('hello');
  });

  socket.on(SocketActions.END_MINING, (newChain) => {
    console.log('End Mining encountered');
    process.env.BREAK = true;
    const blockChain = new Blockchain();
    blockChain.parseChain(newChain);
    if (blockChain.checkValidity() && blockChain.getLength() >= chain.getLength()) {
      chain.blocks = blockChain.blocks;
    }
  });

  return socket;
};

module.exports = socketListeners;
