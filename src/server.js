const app = require('express')();
const bodyParser = require('body-parser');
const httpServer = require('http').Server(app);
const axios = require('axios');
const io = require('socket.io')(httpServer);
const client = require('socket.io-client');

const BlockChain = require('./models/chain');
const Block = require('./models/block');
const SocketActions  = require('./constants');

const socketListeners = require('./socketListeners');

//const  PORT = 3000;

const PORT = process.env.PORT || 3001;

const blockChain = new BlockChain(null, io);
const block = new Block(0, 1, 0, []);
app.use(bodyParser.json());

app.post('/nodes', (req, res) => {
  const { host, port } = req.body;
  const { callback } = req.query;
  const node = `http://${host}:${port}`;
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

app.post('/transaction', (req, res) => {
  const { sender, receiver, amount } = req.body;
  io.emit(SocketActions.ADD_TRANSACTION, sender, receiver, amount);
  res.json({ message: 'transaction success' }).end();
});

//called after the post /transaction call to newTransaction 
app.get('/chain', (req, res) => {
  res.json(blockChain.toArray()).end();
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

io.on('connection', (socket) => {
  console.info(`Socket connected, ID: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`Socket disconnected, ID: ${socket.id}`);
  });
});

blockChain.addNode(socketListeners(client(`http://localhost:${PORT}`), blockChain));

httpServer.listen(PORT, () => console.info(`Express server running on ${PORT}...`));
