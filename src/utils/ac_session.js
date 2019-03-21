const config = require('./ac_config');
const SESSION_KEY = 'wlshell';

var WalletShellSession = function (opts) {
    if (!(this instanceof WalletShellSession)) return new WalletShellSession(opts);
    opts = opts || {};

    this.sessKey = SESSION_KEY;
    this.eventName = 'sessionUpdated';
    this.sessDefault = {
        loadedWalletAddress: '',
        walletHash: '',
        //Used for Fusion Ext.
        walletUnlockedBalance: 0,
        walletLockedBalance: 0,
        walletConfig: opts.walletConfig || 'wconfig.txt',
        synchronized: false,
        syncStarted: false,
        serviceReady: false,
        connectedNode: '',
        txList: [],
        txLen: 0,
        txLastHash: null,
        txLastTimestamp: null,
        txNew: [],
        nodeFee: 0,
        configUpdated: false,
        uiStateChanged: false,
        defaultTitle: 'AntechnCoin',
        debug: opts.debug || false,
        fusionStarted: false,
        fusionProgress: false,
        addressBookErr: false
    };

    this.stickyVals = {
        publicNodes: [],
        addressBook: null // {id: null, name: null, path: null, data: {}}
    };
    /* jshint ignore:start */
    this.keys = Object.keys({ ...this.sessDefault, ...this.stickyVals });

//storage = window.localStorage;

    // initialize
 // if (!sessionStorage.getItem(this.sessKey)) {  sessionStorage.setItem(this.sessKey, JSON.stringify({ ...this.sessDefault, ...this.stickyVals }));
    /* jshint ignore:end */
};

 WalletShellSession.prototype.init = function () {
	// initialize  
	if (!sessionStorage.getItem(this.sessKey)) {  sessionStorage.setItem(this.sessKey, JSON.stringify({ ...this.sessDefault, ...this.stickyVals }));                                                                    /* jshint ignore:end */
}
}
WalletShellSession.prototype.get = function (key) {
    // initialize 
    console.log('Emer outbreak:'+key);
	try{
    if (!window.sessionStorage.getItem(this.sessKey)) { 
	    console.log('cat cut ur tongue: '+ this.sessKey);
	    window.sessionStorage.setItem(this.sessKey, JSON.stringify({ ...this.sessDefault, ...this.stickyVals 
       }));
    }
	} catch (err){
	 console.log('Caught: '+ err);
	}
    key = key || false;
    if (!key) {
       return JSON.parse(sessionStorage.getItem(this.sessKey)) || this.sessDefault;
	return '';
    }

    if (!this.keys.includes(key)) {
        throw new Error(`Invalid session key: ${key}`);
    }
    let sessRes = JSON.parse(sessionStorage.getItem(this.sessKey))[key]; 
    console.log('Get session val: :'+ sessRes);
    return sessRes;
};

WalletShellSession.prototype.getDefault = function (key) {
    if (!key) {
        return this.sessDefault;
    }
    return this.sessDefault[key];
};

WalletShellSession.prototype.set = function (key, val) {
    console.log('did it get here first!: '+ val);
    if (!this.keys.includes(key)) {
        throw new Error(`Invalid session key: ${key}`);
    }

    let sessData = this.get(); // all current data obj
    sessData[key] = val; // update value
    let sessDa = JSON.stringify(sessData);
    console.log('Got here!: '+ sessDa);
   return sessionStorage.setItem(this.sessKey, sessDa);
};

WalletShellSession.prototype.reset = function (key) {
    if (key) {
        if (!this.sessDefault.hasOwnProperty(key)) {
            throw new Error('Invalid session key');
        }

        let sessData = this.get(); // all current data obj
        sessData[key] = this.sessDefault[key]; // set to default value
        return sessionStorage.setItem(this.sessKey, JSON.stringify(sessData[key]));
    }
    return sessionStorage.setItem(this.sessKey, JSON.stringify(this.sessDefault));
    let stickyData = {};
    Object.keys(this.stickyVals).forEach((e) => {
        stickyData[e] = this.get(e);
    });
    /* jshint ignore: start */
    return sessionStorage.setItem(this.sessKey, JSON.stringify({ ...this.sessDefault, ...stickyData }));
    /* jshint ignore: end */
};

WalletShellSession.prototype.destroy = function () {
    return sessionStorage.removeItem(this.sessKey);
};

module.exports = WalletShellSession;
