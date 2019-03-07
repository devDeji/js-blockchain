const EC = require('elliptic').ec;
const ec = new EC('secp256k1');
const uuidV1 = require('uuid/v1');
const createHash = require("crypto").createHash;

//secp256k1 is the algorithm to generate key pair
class ChainUtil{
	static genKeyPair(){
	let keyPair = ec.genKeyPair();
        console.log('ChainUt ec.genKeyPair'+keyPair); 
	return keyPair;
    }
// version 1 use timestamp to generate unique ids
	static id(){
	let uuid1 = uuidV1();
	console.log('ChainUtils id:'+ uuid1);
        return uuid1;
}
static hash(data){  	
        let dataString = JSON.stringify(data).toString();
	let sha256 = createHash("sha256").update(dataString).digest();
console.log('sha256'+sha256);
	return sha256;
}
 
}
module.exports = ChainUtil;

