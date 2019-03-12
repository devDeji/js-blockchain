const Block = require('./block');

const actions = require('../constants');
const transaction = require('./transaction');
const Miner = require('../utils/miner');

const { generateProof, isProofValid } = require('../utils/proof');
const  senderWall = require('../utils/wallet')
class Blockchain {
  constructor(blocks, io) {
    this.blocks = blocks || [new Block(0, 1, 0, [])];
    this.currentTransactions = [];
    this.nodes = [];
    this.io = io;
  }

  addNode(node) {
    this.nodes.push(node);
  }
  getNodes(){
  return this.nodes;
  }
getCurrTrans(){
 return this.currentTransactions;
}
  mineBlock(block, senderWallet) {
    this.blocks.push(block);
    console.log('Mined Successfully');
    this.io.emit(actions.END_MINING, this.toArray());
  }
withdrawAmt(amount, senderWallet){
	return senderWall.withdraw(amount, senderWallet);
}
  async newTransaction(senderWallet, trans, receiver, amount) {
   // this.currentTransactions.push(trans);
    console.log('New txn: '+trans.id);
    let verifyTransaction = transaction.newTransaction(senderWallet, trans, receiver, amount);
	  if(!verifyTransaction){
		  console.log('Transaction failed');
		  return verifyTransaction;
	  }
	  senderWallet = this.withdrawAmt(amount, senderWallet);
	  this.currentTransactions.push(verifyTransaction);
	  console.log('verifyTransaction: '+verifyTransaction.id);
    if (this.currentTransactions.length === 4 && verifyTransaction) {
      console.info(`Added transaction: ${JSON.stringify(trans.getDetails(), null, '\t')}`);
      console.info('Starting mining block...');
 // /nodes for prod version miner instance might already be created
      let minerr = new Miner();
      console.log('Created new miner ins: '+minerr.id);
      const previousBlock = this.lastBlock();
      process.env.BREAK = false;
      const block = new Block(previousBlock.getIndex() + 1, previousBlock.hashValue(), previousBlock.getProof(), this.currentTransactions, minerr.id, true, true);
      const { proof, dontMine } = await generateProof(previousBlock.getProof()).catch({
	     // console.log('catching');
      });
      block.setProof(proof);
      this.currentTransactions = [];
      if (dontMine !== 'true') {
	//Every mined block has a reward
        //for prod, test the rewardMiner variable
	let rewardMiner = Miner.rewardMiner(block, amount, minerr);
	block.mined = true;
	block.rewarded = true;
        this.mineBlock(block, senderWallet);
      }
    }
  }

  lastBlock() {
    return this.blocks[this.blocks.length - 1];
  }

  getLength() {
    return this.blocks.length;
  }

  checkValidity() {
    const { blocks } = this;
    let previousBlock = blocks[0];
    for (let index = 1; index < blocks.length; index++) {
      const currentBlock = blocks[index];
      if (currentBlock.getPreviousBlockHash() !== previousBlock.hashValue()) {
        return false;
      }
      if (!isProofValid(previousBlock.getProof(), currentBlock.getProof())) {
        return false;
      }
      previousBlock = currentBlock;
    }
    return true;
  }

  parseChain(blocks) {
    this.blocks = blocks.map(block => {
      const parsedBlock = new Block(0);
      parsedBlock.parseBlock(block);
      return parsedBlock;
    });
  }

  toArray() {
    return this.blocks.map(block => block.getDetails());
  }
  printBlocks() {
    this.blocks.forEach(block => console.log(block));
  }
}

module.exports = Blockchain;
