/*jshint bitwise: false*/
/* global AbortController */
const os = require('os');
const net = require('net');
const path = require('path');
const fs = require('fs');

const wsutil = require('./ac_utils');
const WalletShellSession = require('./ac_session');
const WalletShellManager = require('./ac_manager');
const config = require('./ac_config');
const syncStatus = require('./ac_constants').syncStatus;
const async = require('async');
//const settings = new Store({ name: 'Settings' });
const AgGrid = require('ag-grid-community');
//const { clipboard, remote, ipcRenderer, shell } = require('electron');
//const Store = require('electron-store');
const wsmanager = new WalletShellManager();
//const sessConfig = { debug: remote.app.debug, walletConfig: remote.app.walletConfig };
const wsession = new WalletShellSession();
const WalletShellAddressbook = require('./ac_addressbook');

//const ADDRESS_BOOK_DIR = remote.app.path('userData');
const ADDRESS_BOOK_DIR = __dirname + '/userData';
const WALLET_DIR = __dirname + '/wallets';
const ADDRESS_BOOK_DEFAULT_PATH = path.join(ADDRESS_BOOK_DIR, '/SharedAddressBook.json');
const WALLET_DEFAULT_PATH = path.join(WALLET_DIR, '/wallet.twl');
let addressBook = new WalletShellAddressbook(ADDRESS_BOOK_DEFAULT_PATH);

//const DEFAULT_WALLET_PATH = remote.app.getPath('documents');
//console.log(". = %s", path.resolve("."));
//console.log("__dirname = %s", path.resolve(__dirname));
const DEFAULT_WALLET_PATH = path.resolve( __dirname);
let WALLET_OPEN_IN_PROGRESS = false;
// crude/junk template :)
let jtfr = {
    tFind: [                                                                  "WalletShell",                                                        "https://github.com/devDeji/customcoin",                              "AntechnCoin",
        "TRTL",                                                               "turtle-service",                                                     "CFG_MIN_FEE",                                                        "CFG_MIN_SEND"
    ],
    tReplace: [
        config.appName,
        config.appGitRepo,
        config.assetName,
        config.assetTicker,                                                   config.walletServiceBinaryFilename,                                   config.minimumFee,                                                    config.mininumSend                                                ]
};

let junkTemplate = (text) => {                                            return jtfr.tFind.reduce((acc, item, i) => {                              const regex = new RegExp(item, "g");                                  let jacc = acc.replace(regex, jtfr.tReplace[i]);                      console.log('main junkTemplate: '+ jacc);                             return jacc;                                                      }, text);                                                         };
class acui_main{
 static genPaymentId(ret) {
    ret = ret || false;

    let payId = require('crypto').randomBytes(32).toString('hex');
    console.log('payId: '+payId);
    if (ret) return payId.toUpperCase();
}

static showIntegratedAddressForm() {
  let ownAddress = wsession.get('loadedWalletAddress');
}

// address book completions
static initAddressCompletion(data) {
    var addresses = [];
    if (data) {
        addresses = Object.entries(data).map(([k, v]) => `${v.name}###${v.address}###${v.paymentId ? v.paymentId : ''}`);
	console.log('main: '+ addresses);
    }
}

static handleAddressBook() {
    function migrateOldFormat(newBook) {
	console.log('newBook: '+newBook);
        let oldAddressBook = path.join(remote.app.getPath('userData'), 'AddressBook.json');
        fs.access(oldAddressBook, fs.constants.F_OK | fs.constants.W_OK, (err) => {
            if (err) {
                return newBook;
            } else {
                const oldBook = new Store({
                    name: 'AddressBook',
                    encryptionKey: config.addressBookObfuscateEntries ? config.addressBookObfuscationKey : null
                });
                let addressBookData = newBook.data;
		console.log('main addressBookData:'+addresdBookData);
                Object.keys(oldBook.get()).forEach((hash) => {
                    let item = oldBook.get(hash);
                    let entryHash = wsutil.fnvhash(item.address + item.paymentId);
		    //compute new address book from old address book
                    if (!addressBookData.hasOwnProperty(entryHash)) {
                        let newAddress = {
                            name: item.name,
                            address: item.address,
                            paymentId: item.paymentId,
                            qrCode: wsutil.genQrDataUrl(item.address)
                        };
                        newBook.data[entryHash] = newAddress;
                    }
                });
                setTimeout(() => {
                    addressBook.save(newBook);
                    fs.rename(oldAddressBook, oldAddressBook + '.deprecated.txt', (err) => {
                        if (err) console.error('Failed to rename old addressbook');
                    });
                }, 500);
                return newBook;
            }
        });
    }

}

static createNewAddress(name, pass){
	let addrBookNameEl = document.getElementById('pAddressbookName');
        let addrBookPassEl = document.getElementById('pAddressbookPass');
        let name = addrBookNameEl.value.trim() || null;
        let pass = addrBookPassEl.value.trim() || null;
        if (!name || !pass) {
            formMessageReset();
            formMessageSet('paddressbook', 'error', "Address book name & password can not be left blank!");
            return;
        }

        let addrFilename = `ab-${wsutil.fnvhash(name + pass)}.json`;
        let addrPath = path.join(ADDRESS_BOOK_DIR, addrFilename);
        if (wsutil.isFileExist(addrPath)) {
            formMessageReset();
            formMessageSet('paddressbook', 'error', "Same filename exists, please use different filename!");
            return;
        }
        let knownAb = settings.get('address_books', []);
        knownAb.push({
            name: name,
            filename: addrFilename,
        });
        settings.set('address_books', knownAb);

        // finally create & load new adddressbook
        loadAddressBook({ path: addrPath, name: name, pass: pass });
        }

static  addAddressBookEntry(name, address, paymentId, isUpdate){
    return new Promise((resolve, reject) => {
	// insert address book entry
        let nameValue = name;
        let addressValue = address;
        let paymentIdValue = paymentId;
       // let isUpd = isUpd;
        console.log('Started add book entry: '+ nameValue);
        if (!nameValue || !addressValue) {
            console.log('Name and wallet cannot be empty!');
            return;
        }
        console.log('Validating add: '+addressValue);
        if (!wsutil.validateAddress(addressValue)) {
            console.log('Invalid ${config.assetName} address');
            return;
        }
        if (paymentIdValue.length) {
            if (!wsutil.validatePaymentId(paymentIdValue)) {
                console.log("Invalid Payment ID");
                return;
            }
        }
        console.log('config addrlen: '+config.addressLength);
	console.log('addVal len: '+ addressValue.length);
        //if (addressValue.length > config.addressLength) paymentIdValue.value = '';
        let entryName = nameValue.trim();
        let entryAddr = addressValue.trim();
        let entryPaymentId = paymentIdValue.trim();
        let ahash = wsutil.fnvhash(entryAddr + entryPaymentId);
        console.log('new ahash: '+ ahash);
        //let abook = wsession.get('addressBook');
	addressBook.load().then((abook) => {
        console.log('Add book:'+abook.name);
        let walletExists = false;          
	abook.forEach((item) => {
	 let addressBookData = item[ahash];    
	 console.log('addBookData:'+addressBookData);
	 if (addressBookData == ahash && isUpdate) {             
		 let walletExists = true;                                            // abook.data[i].remove();                             
	          let item = {                                                        name: entryName,                                                      address: entryAddr,                                                   paymentId: entryPaymentId,                                            qrCode: wsutil.genQrDataUrl(entryAddr),           
		};                         
	let ahash = wsutil.fnvhash(item.address + item.paymentId);            let aqr = wsutil.genQrDataUrl(item.address);                          item.qrCode = aqr;                                                    abook[ahash] = item;                                  
	 } else {                                                                    let newAddress = {                                                        name: entryName,                                                      address: entryAddr,                                                   paymentId: entryPaymentId,                                            qrCode: wsutil.genQrDataUrl(entryAddr),               
	};                                                                    
	let ahash = wsutil.fnvhash(item.address + item.paymentId);            let aqr = wsutil.genQrDataUrl(item.address);                          item.qrCode = aqr;                                                    abook[ahash] = item;
	}                                                                    });                                                                   //wsession.set('addressBook', abook);      
       console.log('New addbook entry: '+ abk[ahash]);                         let abData = {                                                            name: this.name,                                                      data: abook,        
       };                                                                    this.save(abData).then(function () {                                      console.log('abData: '+ abData.data);                                 console.log('Add book data: '+abData.name);                           return resolve(abData);                                           }); 
	
        let rowData = Object.entries(abook.data).map(([key, value]) => ({ key, value }));
  console.log('Address book entry has been saved!' + rowData.name);
	}).catch((err) => {
	   console.log('err'+ err);
	   let abook = addressBook.create();
	   let newAddress = {                                                        name: entryName,                                                      address: entryAddr,                                                   paymentId: entryPaymentId,                                            qrCode: wsutil.genQrDataUrl(entryAddr),                               //entryHash: wsutil.fnvhash(entryAddr + entryPaymentId)
	   };                                                                    abook[ahash] = newAddress;
	  //wsession.set('addressBook', abook);    
	console.log('New addbook entry: '+ abook[ahash].name);    
	console.log('New addbook payId: '+ abook[ahash].paymentId);	
	let abData = {                                                            name: this.name,                                                      data: abook,
	};                                                                    addressBook.save(abData).then(function () {                                      console.log('abData: '+ abData.data);                                 console.log('Add book data: '+abData.name);                           return resolve(abData);                                           });
	});
        setTimeout(() => {
           // addressBook.save(abook);
        }, 500);
      });
    };

static  loadAddressBook(params) {
        return new Promise((resolve, reject) => {                               console.log('Path: '+ADDRESS_BOOK_DEFAULT_PATH);                            
        params = params || false;
       // wsession.set('addressBookErr', false);
        if (params) {
	   console.log('Addresz tho params: '+params);
            // new address book, reset ab object + session
          // wsession.set('addressBook', null);
            if (params.name === 'default') {
                addressBook = new WalletShellAddressbook(ADDRESS_BOOK_DEFAULT_PATH);
            } else {
                addressBook = new WalletShellAddressbook(params.path, params.name, params.pass);
            }
	return resolve(addressBook.create());
        } else {

        let currentAddressBook = wsession.get('addressBook');  
        if (!currentAddressBook) {
            // new session, load from file
            try {
                addressBook.load()
                    .then((addressData) => {
			console.log('addrData: '+addressData);
                       wsession.set('addressBook', addressData);
			    return resolve(addressData);
	});
    setTimeout(() => {
	    console.log('timeout');
    }
    );
           }catch(err){                       
	     console.log('err: '+err);
	   };
         }
      }
	}).catch((err) => {
                return reject(err);                                               });                                                      
}
static handleWalletOpen() {

        let walletFile = walletOpenInputPath.value;
        let walletPass = walletOpenInputPassword.value;

        fs.access(walletFile, fs.constants.R_OK, (err) => {
            if (err) {
                WALLET_OPEN_IN_PROGRESS = false;
                return false;
            }

            WALLET_OPEN_IN_PROGRESS = true;
            wsmanager.stopService().then(() => {
                formMessageSet('load', 'warning', "Starting wallet service...<br><progress></progress>");
                setTimeout(() => {
                    formMessageSet('load', 'warning', "Opening wallet, please be patient...<br><progress></progress>");
                    wsmanager.startService(walletFile, walletPass, onError, onSuccess, onDelay);
                }, 800);
            }).catch((err) => {
                console.log(err);
                formMessageSet('load', 'error', "Unable to start service");
                WALLET_OPEN_IN_PROGRESS = false;
                return false;
            });
        });
    };

static handleWalletRescan() {
        event.preventDefault();
        let walletOpened = wsession.get('serviceReady') || false;
        if (!walletOpened) return;
        wsmanager.rescanWallet(scanHeight).then(() => {
            resetTransactions();
        }).catch(() => {
            resetTransactions();
        });
}

static handleWalletClose() {
        // save + SIGTERMed wallet daemon
	// upon fn call close tnxs
        wsmanager.stopService().then(() => {
            setTimeout(function () {
                // send fake blockUpdated event
                let resetdata = {
                    type: 'blockUpdated',
                    data: {
                        blockCount: syncStatus.IDLE,
                        displayBlockCount: syncStatus.IDLE,
                        knownBlockCount: syncStatus.IDLE,
                        displayKnownBlockCount: syncStatus.IDLE,
                        syncPercent: syncStatus.IDLE
                    }
                };
                wsmanager.notifyUpdate(resetdata);
                wsmanager.resetState();
            }, 1200);
        }).catch((err) => {
            wsmanager.terminateService(true);
            console.log(err);
        });
}

static handleWalletCreate(params) {
	console.log('Creating ch pro for wallet: '+params);
	let pth = path.join(WALLET_DIR, '/'+params+'.twl');
	console.log('wallet at path: '+pth);
        let filePathValue = pth || WALLET_DEFAULT_PATH;
        let passwordValue = 'pass';

        // validate path
        wsutil.validateWalletPath(filePathValue, DEFAULT_WALLET_PATH).then((finalPath) => {
            // validate passwod
            if (!passwordValue.length) {
        console.log('create', 'error', `Please enter a password, creating wallet without a password will not be supported!`);
                return;
            }

            // user already confirm to overwrite
            if (wsutil.isRegularFileAndWritable(finalPath)) {
                try {
                    // for now, backup instead of delete
                    let ts = new Date().getTime();
                    let backfn = `${finalPath}.bak.${ts}`;
		    console.log('backfn: '+backfn);
                    //fs.renameSync(finalPath, backfn);
                    //fs.unlinkSync(finalPath);
                } catch (err) {
                    console.log('create error unable to overwrite existing file, please enter new wallet file path');
                    return;
                }
            }

            // create
            wsmanager.createWallet(
                finalPath,
                passwordValue
            ).then((walletFile) => {
                console.log('wallet created: '+ walletFile);
                //walletOpenInputPath.value = walletFile;
		return walletFile;
            }).catch((err) => {
                console.log('create 1', 'error', err.message);
                return;
            });
        }).catch((err) => {
            console.log('create 2', 'error', err.message);
            return;
        });
}

static handleWalletImportKeys() {
let filePathValue = importKeyInputPath.value ? importKeyInputPath.value.trim() : '';
        let passwordValue = importKeyInputPassword.value ? importKeyInputPassword.value.trim() : '';
        let viewKeyValue = importKeyInputViewKey.value ? importKeyInputViewKey.value.trim() : '';
        let spendKeyValue = importKeyInputSpendKey.value ? importKeyInputSpendKey.value.trim() : '';
        let scanHeightValue = importKeyInputScanHeight.value ? parseInt(importKeyInputScanHeight.value, 10) : 0;
        // validate path
        wsutil.validateWalletPath(filePathValue, DEFAULT_WALLET_PATH).then((finalPath) => {
 if (!passwordValue.length) {
                formMessageSet('import', 'error', `Please enter a password, creating wallet without a password will not be supported!`);
                return; }
            if (scanHeightValue < 0 || scanHeightValue.toPrecision().indexOf('.') !== -1) {
                formMessageSet('import', 'error', 'Invalid scan height!');
                return; }
            // validate viewKey
            if (!viewKeyValue.length || !spendKeyValue.length) {
 formMessageSet('import', 'error', 'View Key and Spend Key can not be left blank!');
                return; }
            if (!wsutil.validateSecretKey(viewKeyValue)) {
        formMessageSet('import', 'error', 'Invalid view key!');
                return;}
            // validate spendKey
            if (!wsutil.validateSecretKey(spendKeyValue)) {
        formMessageSet('import', 'error', 'Invalid spend key!');
                return;}
            //settings.set('recentWalletDir', path.dirname(finalPath));

            // user already confirm to overwrite
            if (wsutil.isRegularFileAndWritable(finalPath)) {
                try {
                    // for now, backup instead of delete, just to be safe
                    let ts = new Date().getTime();
                    let backfn = `${finalPath}.bak${ts}`;
                    fs.renameSync(finalPath, backfn);
                    //fs.unlinkSync(finalPath);
                } catch (err) {
                    formMessageSet('import', 'error', `Unable to overwrite existing file, please enter new wallet file path`);
                    return;
                }
            }
            wsmanager.importFromKeys(
                finalPath,// walletfile
                passwordValue,
                viewKeyValue,
                spendKeyValue,
                scanHeightValue
            ).then((walletFile) => {
                walletOpenInputPath.value = walletFilet;
            }).catch((err) => {
                formMessageSet('import', 'error', err);
                return;
            });
        }).catch((err) => {
            formMessageSet('import', 'error', err.message);
            return;
        });
    
}

static handleWalletImportSeed() {

        let filePathValue = importSeedInputPath.value ? importSeedInputPath.value.trim() : '';
        let passwordValue = importSeedInputPassword.value ? importSeedInputPassword.value.trim() : '';
        let seedValue = importSeedInputMnemonic.value ? importSeedInputMnemonic.value.trim() : '';
        let scanHeightValue = importSeedInputScanHeight.value ? parseInt(importSeedInputScanHeight.value, 10) : 0;
        // validate path
        wsutil.validateWalletPath(filePathValue, DEFAULT_WALLET_PATH).then((finalPath) => {
            // validate password
            if (!passwordValue.length) {
                formMessageSet('import-seed', 'error', `Please enter a password, creating wallet without a password will not be supported!`);
                return;
            }

            if (scanHeightValue < 0 || scanHeightValue.toPrecision().indexOf('.') !== -1) {
                formMessageSet('import-seed', 'error', 'Invalid scan height!');
                return;
            }

            if (!wsutil.validateMnemonic(seedValue)) {
                formMessageSet('import-seed', 'error', 'Invalid mnemonic seed value!');
                return;
            }

            settings.set('recentWalletDir', path.dirname(finalPath));

            // user already confirm to overwrite, but...
            if (wsutil.isRegularFileAndWritable(finalPath)) {
                try {
                    // backup instead of delete
                    let ts = new Date().getTime();
                    let backfn = `${finalPath}.bak${ts}`;
                    fs.renameSync(finalPath, backfn);
                    //fs.unlinkSync(finalPath);
                } catch (err) {
                    formMessageSet('import-seed', 'error', `Unable to overwrite existing file, please enter new wallet file path`);
                    return;
                }
            }

            wsmanager.importFromSeed(
                finalPath,
                passwordValue,
                seedValue,
                scanHeightValue
            ).then((walletFile) => {
                settings.set('recentWallet', walletFile);
                walletOpenInputPath.value = walletFile;
                changeSection('section-overview-load');
                wsutil.showToast('Wallet have been imported, you can now open your wallet!', 12000);
            }).catch((err) => {
                formMessageSet('import-seed', 'error', err);
                return;
            });

        }).catch((err) => {
            formMessageSet('import-seed', 'error', err.message);
            return;
        });
}

static handleWalletExport() {
	  overviewWalletAddress.value = wsession.get('loadedWalletAddress');

        wsmanager.getSecretKeys(overviewWalletAddress.value).then((keys) => {
            showkeyInputViewKey.value = keys.viewSecretKey;
            showkeyInputSpendKey.value = keys.spendSecretKey;
            if (keys.mnemonicSeed && keys.mnemonicSeed.length > 1) {
                showkeyInputSeed.value = keys.mnemonicSeed;
     
            } else {
                showkeyInputSeed.value = `- Mnemonic seed is not available for this wallet -${os.EOL}You still can restore your wallet using private keys shown above.`;
            }
        }).catch(() => {
            formMessageSet('secret', 'error', "Failed to get key, please try again in a few seconds");
        });

    let filename = remote.dialog.showSaveDialog({
            title: "Export keys to file...",
            filters: [
                { name: 'Text files', extensions: ['txt'] }
            ]
        });
        if (filename) {
            wsmanager.getSecretKeys(overviewWalletAddress.value).then((keys) => {
                let textContent = `Wallet Address:${os.EOL}${wsession.get('loadedWalletAddress')}${os.EOL}`;
                textContent += `${os.EOL}View Secret Key:${os.EOL}${keys.viewSecretKey}${os.EOL}`;
                textContent += `${os.EOL}Spend Secret Key:${os.EOL}${keys.spendSecretKey}${os.EOL}`;
                if (keys.mnemonicSeed && keys.mnemonicSeed.length > 1) {
                    textContent += `${os.EOL}Mnemonic Seed:${os.EOL}${keys.mnemonicSeed}${os.EOL}`;
                }
                try {
                    fs.writeFileSync(filename, textContent);
                    formMessageSet('secret', 'success', 'Your keys have been exported, please keep the file secret!');
                } catch (err) {
                    formMessageSet('secret', 'error', "Failed to save your keys, please check that you have write permission to the file");
                }
            }).catch(() => {
                formMessageSet('secret', 'error', "Failed to get keys, please try again in a few seconds");
            });
        }
}

static optimizeWallet(){
        if (!wsession.get('synchronized', false)) {
            wsutil.showToast('Synchronization is in progress, please wait.');
            return;
        }

        if (wsession.get('fusionProgress')) {
            wsutil.showToast('Wallet optimization in progress, please wait');
            return;
        }

        if (!confirm('You are about to perform wallet optimization. This process may take a while to complete, are you sure?')) return;
        wsutil.showToast('Optimization started, your balance may appear incorrect during the process', 3000);
        wsession.set('fusionProgress', true);
        wsmanager.optimizeWallet().then(() => {
            console.log('fusion started');
        }).catch(() => {
            console.log('fusion err');
        });
        return; // just return, it will notify when its done.
    };

    
    // export
    static exportAsCsv(mode) {
        if (wsession.get('txLen') <= 0) return;

        formMessageReset();
        mode = mode || 'all';
        let recentDir = settings.get('recentWalletDir', remote.app.getPath('documents'));
        let filename = remote.dialog.showSaveDialog({
            title: "Export transactions as scv...",
            defaultPath: recentDir,
            filters: [
                { name: 'CSV files', extensions: ['csv'] }
            ]
        });
        if (!filename) return;

        const createCsvWriter = require('csv-writer').createObjectCsvWriter;
        const csvWriter = createCsvWriter({
            path: filename,
            header: [
                { id: 'timeStr', title: 'Time' },
                { id: 'amount', title: 'Amount' },
                { id: 'paymentId', title: 'PaymentId' },
                { id: 'transactionHash', title: 'Transaction Hash' },
                { id: 'fee', title: 'Transaction Fee' },
                { id: 'extra', title: 'Extra Data' },
                { id: 'blockIndex', title: 'Block Height' }
            ]
        });
        let rawTxList = wsession.get('txList');
        let txlist = rawTxList.map((obj) => {
            return {
                timeStr: obj.timeStr,
                amount: obj.amount,
                paymentId: obj.paymentId,
                transactionHash: obj.transactionHash,
                fee: obj.fee,
                extra: obj.extra,
                blockIndex: obj.blockIndex,
                txType: obj.txType
            };
        });

        let dialog = document.getElementById('ab-dialog');
        let outData = [];
        let outType = '';
        switch (mode) {
            case 'in':
                outData = txlist.filter((obj) => obj.txType === "in");
                outType = "incoming";
                break;
            case 'out':
                outData = txlist.filter((obj) => { return obj.txType === "out"; });
                outType = "outgoing";
                break;
            default:
                outData = txlist;
                outType = 'all';
                break;
        }

        if (!outData.length) {
            wsutil.showToast(`Transaction export failed, ${outType} transactions is not available!`);
            if (dialog.hasAttribute('open')) dialog.close();
            return;
        }

        csvWriter.writeRecords(outData).then(() => {
            if (dialog.hasAttribute('open')) dialog.close();
            wsutil.showToast(`Transaction list exported to ${filename}`);
        }).catch((err) => {
            if (dialog.hasAttribute('open')) dialog.close();
            wsutil.showToast(`Transaction export failed, ${err.message}`);
        });
    }


static handleNetworkChange() {
    window.addEventListener('online', () => {
        let connectedNode = wsession.get('connectedNode');
        if (!connectedNode.length || connectedNode.startsWith('127.0.0.1')) return;
        wsmanager.networkStateUpdate(1);
    });
    window.addEventListener('offline', () => {
        let connectedNode = wsession.get('connectedNode');
        if (!connectedNode.length || connectedNode.startsWith('127.0.0.1')) return;
        wsmanager.networkStateUpdate(0);
    });
}
}
 module.exports = acui_main;
;   //handleNetworkChange();
    // open wallet
   // handleWalletOpen();
    // create wallet
   // handleWalletCreate();
    // import keys
    //handleWalletImportKeys();
    // import seed
    //handleWalletImportSeed();
    // delay some handlers
    //setTimeout(() => {
        // settings handlers
       // handleSettings();
        // addressbook handlers
       // handleAddressBook();
        // close wallet
       // handleWalletClose();
        // rescan/reset wallet
       // handleWalletRescan();
        // export keys/seed
// handleWalletExport();
        // send transfer
       // handleSendTransfer();
        // transactions
       // handleTransactions();
        // netstatus
        //handleNetworkChange();


/**function fetchNodeInfo(force) {
    force = force || false;

    function fetchWait(url, timeout) {
        let controller = new AbortController();
        let signal = controller.signal;
        timeout = timeout || 6800;
        return Promise.race([
            fetch(url, { signal }),
            new Promise((resolve) =>
                setTimeout(() => {
                    let fakeout = { "address": "", "amount": 0, "status": "KO" };
                    window.FETCHNODESIG = controller;
                    return resolve(fakeout);
                }, timeout)
            )
        ]);
    }

    // disable node selection during update
    walletOpenInputNode.options.length = 0;
    let opt = document.createElement('option');
    opt.text = "Updating node list, please wait...";
    opt.value = "-";
    opt.setAttribute('selected', true);
    walletOpenInputNode.add(opt, null);
    walletOpenInputNode.setAttribute('disabled', true);
    walletOpenInputNode.dataset.updating = 1;
    walletOpenNodeLabel.innerHTML = '<i class="fas fa-sync fa-spin"></i> Updating node list, please wait...';
    walletOpenSelectBox.dataset.loading = "1";

    window.ELECTRON_ENABLE_SECURITY_WARNINGS = false;
    let aliveNodes = settings.get('pubnodes_tested', []);
    if (aliveNodes.length && !force) {
        initNodeSelection(settings.get('node_address'));
        return aliveNodes;
    }

    // todo: also check block height?
    let nodes = settings.get('pubnodes_data');
        let url = `http://${h}/feeinfo`;
        reqs.push(function (callback) {
            return fetchWait(url)
                .then((response) => {
                    if (response.hasOwnProperty('status')) { // fake/timeout response
                        try { window.FETCHNODESIG.abort(); } catch (e) { }
                        return response;
                    } else {
                        return response.json();
                    }
                }).then(json => {
                    if (!json || !json.hasOwnProperty("address") || !json.hasOwnProperty("amount")) {
                        return callback(null, null);
                    }

                    let feeAmount = "";
                    if (json.status === "KO") {
                        feeAmount = 'Fee: unknown/timeout';
                    } else {
                        feeAmount = parseInt(json.amount, 10) > 0 ? `Fee: ${wsutil.amountForMortal(json.amount)} ${config.assetTicker}` : "FREE";
                    }
                    out.label = `${h.split(':')[0]} | ${feeAmount}`;
                    return callback(null, out);
                }).catch(() => {
                    callback(null, null);
                });
        });
    });
    const parLimit = 12;
    async.parallelLimit(reqs, parLimit, function (error, results) {
        if (results) {
            let res = results.filter(val => val);
            if (res.length) {
                settings.set('pubnodes_tested', res);
            }

            //let hrend = process.hrtime(hrstart);
            // console.info('Execution time (hr): %ds %dms', hrend[0], hrend[1] / 1000000);
            // console.info(`parlimit: ${parLimit}`);
            // console.info(`total nodes: ${nodes.length}`);
            // console.info(`alive nodes: ${res.length}`);
            initNodeSelection();
        } else {
            initNodeSelection();
        }
    });
}

    wsmanager.stopSyncWorker();
    wsmanager.stopService().then(() => {
        setTimeout(function () {
            wsmanager.terminateService(true);
            try { fs.unlinkSync(wsession.get('walletConfig')); } catch (e) { }
            win.close();
        }, 1200);
    }).catch((err) => {
        console.log(err);
        wsmanager.terminateService(true);
        try { fs.unlinkSync(wsession.get('walletConfig')); } catch (e) { }
        win.close();
    });
});
**/
