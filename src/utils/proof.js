const crypto = require('crypto');


const generateProof = (previousProof) => new Promise((resolve) => {
  setImmediate(async () => {
    let proof = Math.random() * 1000;
    const dontMine = process.env.BREAK;
    if (isProofValid(previousProof, proof) || dontMine === 'true') {
      resolve({ proof, dontMine });
    } else  {
      resolve(await generateProof(previousProof));
    }
  });
});

const isProofValid = (previousProof, currentProof) => {
	console.log('previousproof: '+ previousProof);
        console.log('currentproof: '+ currentProof);
  const difference = previousProof + currentProof;
  console.log('difference: '+ difference);
  const proofString = `difference-${difference}`;
  console.log('proofString: '+ proofString);
  const hashFunction = crypto.createHash('sha256');
  hashFunction.update(proofString);
  const hexString = hashFunction.digest('hex');
	console.log('hexString: '+ hexString);
  if (hexString.includes('0000')) {
	  console.log('proof: true');;
    return true;
  }
	console.log('proof: false');
  return false;
};

exports.generateProof = generateProof;
exports.isProofValid = isProofValid;
