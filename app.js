// app.js - handles login and rendering of views
(() => {
    const loginForm = document.getElementById('login-form');
    const loginView = document.getElementById('login-view');
    const appView = document.getElementById('app-view');
    const welcomeEl = document.getElementById('welcome');
    const friendPanel = document.getElementById('friend-panel');
    const makerPanel = document.getElementById('maker-panel');
    const tableWrap = document.getElementById('table-wrap');
    const makerTableWrap = document.getElementById('maker-table-wrap');
    const logoutBtn = document.getElementById('logout-btn');
    
    // Friend management elements
    const friendSelect = document.getElementById('friend-select');
    const friendTransactionForm = document.getElementById('friend-transaction-form');
    const addTransactionForm = document.getElementById('add-transaction-form');
    const friendTransactions = document.getElementById('friend-transactions');
    const friendTableWrap = document.getElementById('friend-table-wrap');
    
    // Transaction form elements
    const txnDate = document.getElementById('txn-date');
    const txnTime = document.getElementById('txn-time');
    const txnUpiApp = document.getElementById('txn-upi-app');
    const txnAmount = document.getElementById('txn-amount');
    const txnNote = document.getElementById('txn-note');
    
    // Current state
    let currentTransactions = [];
    let selectedFriendId = '';

    function show(el) { el.classList.remove('hidden'); }
    function hide(el) { el.classList.add('hidden'); }

    function saveSession(userKey) {
        sessionStorage.setItem('txn_user', userKey);
    }
    function clearSession() {
        sessionStorage.removeItem('txn_user');
    }
    function getSession() {
        return sessionStorage.getItem('txn_user');
    }

    // Render a friendly table for a list of txns
    function renderTable(container, txns, showActions = false) {
        if (!txns || txns.length === 0) {
            container.innerHTML = '<p>No transactions found.</p>';
            return;
        }
        let html = '<table class="tx-table"><thead><tr><th>Date</th><th>Time</th><th>UPI App</th><th>Amount</th><th>Note</th><th>Status</th>';
        
        if (showActions) {
            html += '<th>Actions</th>';
        }
        
        html += '</tr></thead><tbody>';
        
        txns.forEach(t => {
            html += `<tr data-id="${t.id}">
        <td>${t.date}</td>
        <td>${t.time || ''}</td>
        <td>${t.upiApp || ''}</td>
        <td>${Number(t.amount).toFixed(2)}</td>
        <td>${t.note || ''}</td>
        <td>${t.status || ''}</td>`;
            
            if (showActions) {
                html += `<td>
          <button class="edit-btn small" data-id="${t.id}">Edit</button>
          <button class="delete-btn small" data-id="${t.id}">Delete</button>
        </td>`;
            }
            
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
        
        // Add event listeners for action buttons if needed
        if (showActions && container) {
            const editButtons = container.querySelectorAll('.edit-btn');
            const deleteButtons = container.querySelectorAll('.delete-btn');
            
            editButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const txnId = e.target.getAttribute('data-id');
                    editTransaction(txnId);
                });
            });
            
            deleteButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const txnId = e.target.getAttribute('data-id');
                    deleteTransaction(txnId);
                });
            });
        }
    }

    // Load transactions.json and call callback
    async function loadTransactions() {
        try {
            const r = await fetch('/data/transactions.json', { cache: "no-store" });
            if (!r.ok) throw new Error('Could not load transactions.json: ' + r.status);
            const data = await r.json();
            return data;
        } catch (err) {
            console.error(err);
            return [];
        }
    }

    // Populate friend select dropdown
    function populateFriendSelect() {
        // Clear existing options except the default one
        while (friendSelect.options.length > 1) {
            friendSelect.remove(1);
        }
        
        // Add options for each friend
        Object.entries(window.APP_USERS).forEach(([username, user]) => {
            if (username !== 'maker') {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = user.name;
                friendSelect.appendChild(option);
            }
        });
    }
    
    // Handle friend selection change
    async function handleFriendSelect() {
        selectedFriendId = friendSelect.value;
        
        if (selectedFriendId) {
            show(friendTransactionForm);
            show(friendTransactions);
            
            // Set today's date as default
            const today = new Date();
            txnDate.value = today.toISOString().split('T')[0];
            
            // Load and display friend's transactions
            await loadFriendTransactions(selectedFriendId);
        } else {
            hide(friendTransactionForm);
            hide(friendTransactions);
        }
    }
    
    // Load transactions for a specific friend
    async function loadFriendTransactions(friendId) {
        const txns = await loadTransactions();
        currentTransactions = txns;
        
        const friendTxns = txns.filter(t => {
            // For user IDs, we need to check both the friendId field and the id field in APP_USERS
            const matchesFriendId = t.friendId === friendId;
            // Also check if friendId matches a username key in APP_USERS
            const matchesUsername = Object.entries(window.APP_USERS).some(([username, user]) => {
                return user.id === friendId && t.friendId === username;
            });
            
            return matchesFriendId || matchesUsername;
        });
        
        renderTable(friendTableWrap, friendTxns, true);
    }
    
    // Add a new transaction
    async function addTransaction(e) {
        e.preventDefault();
        
        if (!selectedFriendId) {
            alert('Please select a friend first.');
            return;
        }
        
        // Generate a unique ID
        const txnId = 't' + Date.now();
        
        // Create new transaction object
        const newTxn = {
            id: txnId,
            friendId: selectedFriendId,
            date: txnDate.value,
            time: txnTime.value,
            upiApp: txnUpiApp.value,
            amount: parseFloat(txnAmount.value),
            note: txnNote.value,
            status: 'pending'
        };
        
        // Add to current transactions
        currentTransactions.push(newTxn);
        
        // Update the display
        await loadFriendTransactions(selectedFriendId);
        
        // Reset form
        addTransactionForm.reset();
        
        // Set today's date again
        const today = new Date();
        txnDate.value = today.toISOString().split('T')[0];
        
        // Update all transactions view
        renderTable(makerTableWrap, currentTransactions, true);
        
        // Alert user that they need to save changes
        alert('Transaction added. Remember to save your changes using the Admin Editor.');
    }
    
    // Edit a transaction
    function editTransaction(txnId) {
        const txn = currentTransactions.find(t => t.id === txnId);
        if (!txn) return;
        
        // Populate form with transaction data
        txnDate.value = txn.date;
        txnTime.value = txn.time || '';
        txnUpiApp.value = txn.upiApp || '';
        txnAmount.value = txn.amount;
        txnNote.value = txn.note || '';
        
        // Remove the transaction (will be replaced when form is submitted)
        deleteTransaction(txnId, false);
        
        // Scroll to form
        friendTransactionForm.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Delete a transaction
    function deleteTransaction(txnId, confirm = true) {
        if (confirm && !window.confirm('Are you sure you want to delete this transaction?')) {
            return;
        }
        
        // Remove from current transactions
        currentTransactions = currentTransactions.filter(t => t.id !== txnId);
        
        // Update displays
        loadFriendTransactions(selectedFriendId);
        renderTable(makerTableWrap, currentTransactions, true);
        
        if (confirm) {
            // Alert user that they need to save changes
            alert('Transaction deleted. Remember to save your changes using the Admin Editor.');
        }
    }

    async function showForUser(userKey) {
        const userObj = window.APP_USERS[userKey];
        if (!userObj) return logout();

        welcomeEl.textContent = `Hello, ${userObj.name}`;

        const txns = await loadTransactions();
        currentTransactions = txns;

        if (userKey === 'maker') {
            // maker view: show all txns preview and link to admin
            hide(friendPanel);
            show(makerPanel);
            renderTable(makerTableWrap, txns, true);
            
            // Setup friend management
            populateFriendSelect();
            
            // Add event listener to admin link to save current transactions
            const adminLink = document.querySelector('a[href="/admin.html"]');
            if (adminLink) {
                adminLink.addEventListener('click', function(e) {
                    // Save current transactions to session storage
                    sessionStorage.setItem('current_transactions', JSON.stringify(currentTransactions));
                });
            }
        } else {
            // friend view: filter by friendId
            hide(makerPanel);
            show(friendPanel);
            const own = txns.filter(t => t.friendId === userObj.id && (t.status === 'pending' || t.status === undefined));
            renderTable(tableWrap, own);
        }

        hide(loginView);
        show(appView);
    }

    function logout() {
        clearSession();
        hide(appView);
        show(loginView);
    }

    // On page load, if session exists, restore
    document.addEventListener('DOMContentLoaded', () => {
        const sessionUser = getSession();
        if (sessionUser && window.APP_USERS && window.APP_USERS[sessionUser]) {
            showForUser(sessionUser);
        }
        
        // Add event listeners for friend management
        if (friendSelect) {
            friendSelect.addEventListener('change', handleFriendSelect);
        }
        
        if (addTransactionForm) {
            addTransactionForm.addEventListener('submit', addTransaction);
        }
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const u = document.getElementById('username').value.trim();
        const p = document.getElementById('password').value;
        if (!window.APP_USERS || !window.APP_USERS[u]) {
            alert('Invalid username or passkey.');
            return;
        }
        const user = window.APP_USERS[u];
        if (user.pass !== p) {
            alert('Invalid username or passkey.');
            return;
        }
        saveSession(u);
        showForUser(u);
    });

    logoutBtn.addEventListener('click', () => {
        logout();
    });
})();
