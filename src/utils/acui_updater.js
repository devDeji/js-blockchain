const wsutil = require('./ac_utils');
const WalletShellSession = require('./ac_session');
const config = require('./ac_config');
const syncStatus = require('./ac_constants').syncStatus;
//const sessConfig = { debug: remote.app.debug, walletConfig: remote.app.walletConfig };
const wsession = new WalletShellSession();

/* sync progress ui */
const WFCLEAR_INTERVAL = 5;

let WFCLEAR_TICK = 0;
let FUSION_CHECK = 0;
let TX_INITIALIZED = false;

function triggerTxRefresh() {
    txUpdateInputFlag.value = 1;
}

function updateSyncProgress(data) {
    const iconSync = document.getElementById('navbar-icon-sync');
    let blockCount = data.displayBlockCount;
    let knownBlockCount = data.displayKnownBlockCount;
    let blockSyncPercent = data.syncPercent;
    let statusText = '';

    switch (knownBlockCount) {
        case syncStatus.NET_ONLINE:
            // sync status text
            statusText = 'RESUMING WALLET SYNC...';
            
            // sync sess flags
            wsession.set('syncStarted', false);
            wsession.set('synchronized', false);
            break;
        case syncStatus.NET_OFFLINE:
            // sync status text
            statusText = 'PAUSED, NETWORK DISCONNECTED';

            // sync sess flags
            wsession.set('syncStarted', false);
            wsession.set('synchronized', false);
            // reset balance
            let resetBalance = {
                availableBalance: 0,
                lockedAmount: 0
            };
            updateBalance(resetBalance);
            break;
        case syncStatus.IDLE:
            // sync status text
            statusText = 'IDLE';
            // sync sess flags
            wsession.set('syncStarted', false);
            wsession.set('synchronized', false);
            // no node connected
            wsession.set('connectedNode', '');
            break;
        case syncStatus.RESET:
            if (!connInfoDiv.innerHTML.startsWith('Connected')) {
                let connStatusText = `Connected to: <strong>${wsession.get('connectedNode')}</strong>`;
                let connNodeFee = wsession.get('nodeFee');
                if (connNodeFee > 0) {
                    connStatusText += ` | Node fee: <strong>${connNodeFee.toFixed(config.decimalPlaces)} ${config.assetTicker}</strong>`;
                }
                connInfoDiv.innerHTML = connStatusText;
                connInfoDiv.classList.remove('conn-warning');
                connInfoDiv.classList.remove('empty');
            }
            wsession.set('syncStarted', true);
            statusText = 'PREPARING RESCAN...';
     
            //
            wsession.set('synchronized', false);
            brwin.setProgressBar(-1);
            break;
        case syncStatus.NODE_ERROR:

            wsession.set('connectedNode', '');
            break;
        default:
            if (!connInfoDiv.innerHTML.startsWith('Connected')) {
                let connStatusText = `Connected to: <strong>${wsession.get('connectedNode')}</strong>`;
                let connNodeFee = wsession.get('nodeFee');
                if (connNodeFee > 0) {
                    connStatusText += ` | Node fee: <strong>${connNodeFee.toFixed(config.decimalPlaces)} ${config.assetTicker}</strong>`;
                }
            // sync sess flags
            wsession.set('syncStarted', true);
            statusText = `${blockCount}/${knownBlockCount}`;
            if (blockCount + 1 >= knownBlockCount && knownBlockCount !== 0) {
                // sync status sess flag
                wsession.set('synchronized', true);
            } else {
                // sync status sess flag
                wsession.set('synchronized', false);
                let taskbarProgress = +(parseFloat(blockSyncPercent) / 100).toFixed(2);
            }
            break;
    }

    if (WFCLEAR_TICK === WFCLEAR_INTERVAL) {
        webFrame.clearCache();
        WFCLEAR_TICK = 0;
    }
    WFCLEAR_TICK++;

    // handle failed fusion
    if (true === wsession.get('fusionProgress')) {
        let lockedBalance = wsession.get('walletLockedBalance');
        if (lockedBalance <= 0 && FUSION_CHECK === 3) {
            fusionCompleted();
        }
        FUSION_CHECK++;
    }
}

function fusionCompleted() {
    FUSION_CHECK = 0;
    wsession.set('fusionStarted', false);
    wsession.set('fusionProgress', false);
    wsutil.showToast('Optimization completed. You may need to repeat the process until your wallet is fully optimized.', 5000);
}

function updateBalance(data) {
 if (!data) return;
    let availableBalance = parseFloat(data.availableBalance) || 0;

    let bUnlocked = wsutil.amountForMortal(availableBalance);
    let bLocked = wsutil.amountForMortal(data.lockedAmount);
    let fees = (wsession.get('nodeFee') + config.minimumFee);
    let maxSendRaw = (bUnlocked - fees);

    if (maxSendRaw <= 0) {
        inputSendAmountField.value = 0;
        inputSendAmountField.setAttribute('max', '0.00');
        inputSendAmountField.setAttribute('disabled', 'disabled');
        maxSendFormHelp.innerHTML = "You don't have any funds to be sent.";
        sendMaxAmount.dataset.maxsend = 0;
        sendMaxAmount.classList.add('hidden');
        wsession.set('walletUnlockedBalance', 0);
        wsession.set('walletLockedBalance', 0);
        if (availableBalance < 0) return;
    }

    balanceAvailableField.innerHTML = bUnlocked;
    balanceLockedField.innerHTML = bLocked;
    wsession.set('walletUnlockedBalance', bUnlocked);
    wsession.set('walletLockedBalance', bLocked);
    // update fusion progress
    if (true === wsession.get('fusionProgress')) {
        if (wsession.get('fusionStarted') && parseInt(bLocked, 10) <= 0) {
            fusionCompleted();
        } else {
            if (parseInt(bLocked, 10) > 0) {
                wsession.set('fusionStarted', true);
            }
        }
    }

}

function updateTransactions(result) {
    let txlistExisting = wsession.get('txList');
    const blockItems = result.items;

    if (!txlistExisting.length && !blockItems.length) {
        
    }

    if (!blockItems.length) return;

    let txListNew = [];

    Array.from(blockItems).forEach((block) => {
        block.transactions.map((tx) => {
            if (tx.amount !== 0 && !wsutil.objInArray(txlistExisting, tx, 'transactionHash')) {
                tx.amount = wsutil.amountForMortal(tx.amount);
                tx.timeStr = new Date(tx.timestamp * 1000).toUTCString();
                tx.fee = wsutil.amountForMortal(tx.fee);
                tx.paymentId = tx.paymentId.length ? tx.paymentId : '-';
                tx.txType = (tx.amount > 0 ? 'in' : 'out');
                tx.rawAmount = parseInt(tx.amount, 10);
                tx.rawFee = tx.fee;
                tx.rawPaymentId = tx.paymentId;
                tx.rawHash = tx.transactionHash;
                txListNew.unshift(tx);
            }
        });
    });

    if (!txListNew.length) return;
    let latestTx = txListNew[0];
    let newLastHash = latestTx.transactionHash;
    let newLastTimestamp = latestTx.timestamp;
    let newTxAmount = latestTx.amount;

    // store it
    wsession.set('txLastHash', newLastHash);
    wsession.set('txLastTimestamp', newLastTimestamp);
    let txList = txListNew.concat(txlistExisting);
    wsession.set('txList', txList);
    wsession.set('txLen', txList.length);
    wsession.set('txNew', txListNew);

    let currentDate = new Date();
    currentDate = `${currentDate.getUTCFullYear()}-${currentDate.getUTCMonth() + 1}-${currentDate.getUTCDate()}`;
    let lastTxDate = new Date(newLastTimestamp * 1000);
    lastTxDate = `${lastTxDate.getUTCFullYear()}-${lastTxDate.getUTCMonth() + 1}-${lastTxDate.getUTCDate()}`;

    // amount to check
    setTimeout(triggerTxRefresh, (TX_INITIALIZED ? 100 : 1000));
}

function showFeeWarning(fee) {
    fee = fee || 0;
    let nodeFee = parseFloat(fee);
    if (nodeFee <= 0) return;
}

function updateQr(address) {
    //let backupReminder = document.getElementById('button-overview-showkeys');
    if (!address) {
        triggerTxRefresh();
        //backupReminder.classList.remove('connected');
        try { clearInterval(window.backupReminderTimer); } catch (_e) { }
        return;
    }



    let walletHash = wsutil.fnvhash(address);
    wsession.set('walletHash', walletHash);
}

}


