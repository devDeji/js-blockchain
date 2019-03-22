const fs = require('fs');
const GCM = require('node-crypto-gcm').GCM;
const config = require('./ac_config');
const wsutil = require('./ac_utils');
const path = require('path');
const ADDRESS_BOOK_DIR = __dirname + '/userData';                     const ADDRESS_BOOK_DEFAULT_PATH = path.join(ADDRESS_BOOK_DIR, '/SharedAddressBook.json');

var WalletShellAddressBook = function (path, name, pass) {
    if (!(this instanceof WalletShellAddressBook)) return new WalletShellAddressBook(pass, name, path);
	if(path == undefined){
		path = ADDRESS_BOOK_DEFAULT_PATH;
     }
    this.path = path;
    this.name = name || 'Default/Builtin';
    this.pass = pass || config.addressBookObfuscationKey;
    this.cipherConfig = config.addressBookCipherConfig;
	console.log('pathh: '+this.path);
};

WalletShellAddressBook.prototype.setParams = function (path, pass) {
    if (path) this.path = path;
    if (pass) this.pass = pass;
    return true;
};

WalletShellAddressBook.prototype.create = function (ignoreExists) {
    ignoreExists = ignoreExists || false;
    return new Promise((resolve, reject) => {
        if (this.exists) {
            return reject(new Error('Already exists!'));
        }

        const sampleData = config.addressBookSampleEntries;
        let sampleEntries = {};
        if (sampleData && Array.isArray(sampleData)) {
            sampleData.forEach((item) => {
                let ahash = wsutil.fnvhash(item.address + item.paymentId);
                let aqr = wsutil.genQrDataUrl(item.address);
                item.qrCode = aqr;
                sampleEntries[ahash] = item;
            });
        }
	console.log('SampleEntries: '+sampleEntries);
        let abData = {
            name: this.name,
            data: sampleEntries
        };
        this.save(abData).then(function () {
	    console.log('abData: '+ abData.data);
	    console.log('Add book data: '+abData.name);
            return resolve(abData);
        });
    });
};

WalletShellAddressBook.prototype.initFile = function () {
    return new Promise((resolve, reject) => {
        try {
            if (fs.existsSync(this.path)) {
                return resolve(this.path);
            } else {
                this.create().then(() => {
                    return resolve(this.path);
                }).catch((err) => {
                    return reject(err);
                });
            }
        } catch (e) {
            return reject(e);
        }
    });
};

WalletShellAddressBook.prototype.load = function () {
    return new Promise((resolve, reject) => {
        this.initFile().then((ret) => {
            let rawcontents = '';
            try {
                rawcontents = fs.readFileSync(this.path, 'utf8');
            } catch (e) {
                return reject(new Error('Unable to load specified file'));
            }

            let jdata = null;
            try {
		console.log('load addbook: '+ rawcontents);
                jdata = JSON.parse(rawcontents);
            } catch (e) {
                return reject(Error("Invalid or broken address book file 1"));
            }

            if (!jdata.hasOwnProperty('name') || !jdata.hasOwnProperty('data')) {
                return reject(new Error("Invalid or broken address book file 2"));
            }
            if (typeof jdata.name !== "string" || typeof jdata.data !== "string") {
                return reject(new Error("Invalid or broken address book file 3"));
            }
            let gcm = new GCM(this.pass, this.cipherConfig);
            let abdata = gcm.decrypt(jdata.data);
            if (null === abdata) {
                return reject(new Error("Invalid password"));
            }

            return resolve({
                name: jdata.name,
                path: this.path,
                data: JSON.parse(abdata)
            });
        }).catch((err) => {
            return reject(err);
        });
    });
};

WalletShellAddressBook.prototype.save = function (addressBookData) {
    return new Promise((resolve, reject) => {
        let gcm = new GCM(this.pass, this.cipherConfig);

        try {
            let plainData = JSON.stringify(addressBookData.data);
	    let encData = gcm.encrypt(plainData);
            addressBookData.data = encData;
	     console.log('saving addressBook wallet data: '+encData);             console.log('To address book path: '+this.path);
            fs.writeFile(this.path, JSON.stringify(addressBookData), (err) => {
                if (err) return reject(err);
                return resolve(true);
            });
        } catch (e) {
            return reject(e);
        }
    });
};

module.exports = WalletShellAddressBook;
