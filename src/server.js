const app = require('express')();
const bodyParser = require('body-parser');
const httpServer = require('http').Server(app);
const axios = require('axios');
const io = require('socket.io')(httpServer);
const sockets = require('socket.io');
const client = require('socket.io-client');
const wallet = require('./utils/wallet');
const chainUtils = require('./utils/chain-utils');
const BlockChain = require('./models/chain');
const transactionPl = require('./models/transactionPool');
const Block = require('./models/block');
const SocketActions  = require('./constants');
const acui_main = require('./utils/acui_main');
const socketListeners = require('./socketListeners');

//const  PORT = 3000;

const PORT = process.env.PORT || 3001;
const senderWallet = new wallet();
const transactionPool = transactionPl.getInstance();
const blockChain = new BlockChain(null, io);
const block = new Block(0, 1, 0, []);
app.use(bodyParser.json());

app.post('/nodes', (req, res) => {
  const { host, port } = req.body;
  const { callback } = req.query;
  const node = host+':'+port;
	console.log('node: '+node);
  const socketNode = socketListeners(client(node), blockChain);
	console.log('socketNode /nodes'+socketNode);
  blockChain.addNode(socketNode, blockChain);
  if (callback === 'true') {
    console.info(`Added node ${node} back`);
    res.json({ status: 'Added node Back' }).end();
  } else {
	  console.log('axios post on:'+'${node}/nodes?callback=true');
    axios.post(`${node}/nodes?callback=true`, {
      host: req.hostname,
      port: PORT,
    });
    console.info(`Added node ${node}`);
    res.json({ status: 'Added node' }).end();
  }
});

app.post('/testnodes', (req, res) => {
  const {  msg }  = req.body;
  io.emit('broadcast without broad...');
  io.emit(SocketActions.TEST, msg);
 // socket.broadcast.emit('broadcasting mess: ');
  res.json({ message: 'Sent test broadcast: '+ msg }).end();
});

app.post('/transaction', (req, res) => {                     const { sender, receiver, amount } = req.body;  
	console.log('Using txn pool: '+ transactionPool.id);
	io.emit(SocketActions.ADD_TRANSACTION, sender, receiver, amount, senderWallet, transactionPool );                                                                                  res.json({ message: 'transaction added' }).end();
});
//called after the post /transaction call to newTransaction 
app.get('/chain', (req, res) => {
  res.json(blockChain.toArray()).end();
});

app.post('/addressbook', (req, res) => {  
        const {  params }  = req.body;
	acui_main.loadAddressBook(params).then((result) => {
		console.log('result: '+ result);
                res.json(result).end();
            }).catch((err) => {
		console.log('err: '+ err);
                return reject(err);
            });
});

app.get('/', (req, res) => {
  console.log('req hostname: '+req.hostname);
 console.log('client: '+ client);
  res.json('req: '+req.body).end();
});

app.get('/hash', (req, res) => {
	let { yoHash }  = req.query;
  console.log('yoHash: '+ yoHash);
  res.json('hasd val: '+ chainUtils.hash(yoHash)).end();
});

app.get('/nodes', (req, res) => {
	//console.log(blockChain.getNodes()[0].uri
	//)
	let nodesUri = [];
   for(let i = 0; i < blockChain.getNodes().length; i++){
        nodesUri.push(blockChain.getNodes()[i].io.uri);
        //let nodes = blockChain.getNodes()[i].io.uri;
	console.log(nodesUri);
	}
	res.json(nodesUri).end();
});

app.get('/currentTransactions', (req, res) => {
  res.json(blockChain.getCurrTrans()).end();
});

//get public key
app.get('/address', (req, res)=> {
	res.json({
		publicKey: senderWallet.publicKey
	});
});

//get wallet balance
app.get('/balance', (req, res)=> {
	let { addr }= req.query;
        res.json({
               Wallet_balance: senderWallet.balance                  });
});

io.on('connection', (socket) => {
  console.info(`Socket connected, ID: ${socket}`);
  socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) {
    console.log(data);});
  socket.on('disconnect', () => {
    console.log(`Socket disconnected, ID: ${socket.id}`);
  });
});

blockChain.addNode(socketListeners(client(`http://localhost:${PORT}`), blockChain));

httpServer.listen(PORT, () => console.info(`Express server running on ${PORT}...`));
