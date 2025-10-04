// admin.js - simple JSON loader/editor for transactions.json
(() => {
    const loadBtn = document.getElementById('load-btn');
    const downloadBtn = document.getElementById('download-btn');
    const copyBtn = document.getElementById('copy-btn');
    const textarea = document.getElementById('json-area');
    
    // Check if we have transactions in sessionStorage (from friend management)
    function getSessionTransactions() {
        const txnData = sessionStorage.getItem('current_transactions');
        if (txnData) {
            try {
                return JSON.parse(txnData);
            } catch (e) {
                console.error('Error parsing session transactions:', e);
            }
        }
        return null;
    }

    async function load() {
        try {
            // First check if we have transactions in session storage
            const sessionTxns = getSessionTransactions();
            if (sessionTxns) {
                textarea.value = JSON.stringify(sessionTxns, null, 2);
                // Clear the session storage after loading
                sessionStorage.removeItem('current_transactions');
                return;
            }
            
            // Otherwise load from file
            const r = await fetch('/data/transactions.json', { cache: "no-store" });
            if (!r.ok) throw new Error('Failed to load transactions.json');
            const j = await r.json();
            textarea.value = JSON.stringify(j, null, 2);
        } catch (err) {
            textarea.value = '// Error loading transactions.json: ' + err;
        }
    }

    loadBtn.addEventListener('click', load);

    downloadBtn.addEventListener('click', () => {
        const blob = new Blob([textarea.value], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'transactions.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    });

    copyBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(textarea.value);
            alert('JSON copied to clipboard. Paste it into data/transactions.json in GitHub web editor and commit.');
        } catch (err) {
            alert('Could not copy: ' + err);
        }
    });

    // auto load on open
    load();
})();
