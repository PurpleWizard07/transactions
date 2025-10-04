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
        let html = '<table class="tx-table"><thead><tr><th>Date</th><th>Time</th><th>UPI App</th><th>Amount</th><th>Note</th><th>Status</th></tr></thead><tbody>';
        txns.forEach(t => {
            html += `<tr>
        <td>${t.date}</td>
        <td>${t.time || ''}</td>
        <td>${t.upiApp || ''}</td>
        <td>${Number(t.amount).toFixed(2)}</td>
        <td>${t.note || ''}</td>
        <td>${t.status || ''}</td>
      </tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
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

    async function showForUser(userKey) {
        const userObj = window.APP_USERS[userKey];
        if (!userObj) return logout();

        welcomeEl.textContent = `Hello, ${userObj.name}`;

        const txns = await loadTransactions();

        if (userObj.id === 'maker') {
            // maker view: show all txns preview and link to admin
            hide(friendPanel);
            show(makerPanel);
            renderTable(makerTableWrap, txns, true);
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
