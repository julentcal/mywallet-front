const API_URL = 'http://localhost:3000/api/wallet';

const loginView = document.getElementById('login-view');
const appView = document.getElementById('app-view');
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const userNameDisplay = document.getElementById('userNameDisplay');
const logoutBtn = document.getElementById('logoutBtn');
const balanceCard = document.getElementById('balanceCard');
const themeToggle = document.getElementById('themeToggle');
const summaryMonthEl = document.getElementById('summaryMonth');
const monthlyIncomeEl = document.getElementById('monthlyIncome');
const monthlyExpenseEl = document.getElementById('monthlyExpense');
const monthlyBalanceEl = document.getElementById('monthlyBalance');

const balanceEl = document.getElementById('totalBalance');
const listEl = document.getElementById('transactionList');
const transactionForm = document.getElementById('transactionForm');
const conceptoInput = document.getElementById('concepto');
const montoInput = document.getElementById('monto');
const tipoInput = document.getElementById('tipo');

const currencyFormatter = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
});

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
});

function formatCurrency(value) {
    const numberValue = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numberValue) ? currencyFormatter.format(numberValue) : '—';
}

function formatDate(value) {
    const dateValue = value ? new Date(value) : null;
    return dateValue && !Number.isNaN(dateValue.getTime())
        ? dateFormatter.format(dateValue)
        : '—';
}

let usuarioActual = null;
let authToken = null;

function iniciarApp() {
    const temaGuardado = localStorage.getItem('mywallet_theme');
    if (temaGuardado === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.textContent = '☀️';
    }

    const usuarioGuardado = localStorage.getItem('mywallet_user');
    const tokenGuardado = localStorage.getItem('mywallet_token');
    if (usuarioGuardado && tokenGuardado) {
        usuarioActual = JSON.parse(usuarioGuardado);
        authToken = tokenGuardado;
        mostrarApp();
    } else {
        localStorage.removeItem('mywallet_user');
        localStorage.removeItem('mywallet_token');
        usuarioActual = null;
        authToken = null;
        mostrarLogin();
    }
}

function mostrarLogin() {
    loginView.classList.remove('hidden');
    appView.classList.add('hidden');
}

function mostrarApp() {
    loginView.classList.add('hidden');
    appView.classList.remove('hidden');
    userNameDisplay.textContent = ` Hola, ${usuarioActual.name}`;
    cargarMovimientos();
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!res.ok) throw new Error('Usuario no encontrado');

        const data = await res.json();
        const user = data.user || data.usuario || data;
        const token = data.token || data.accessToken || data.jwt;
        if (!token) throw new Error('Token no recibido');
        
        localStorage.setItem('mywallet_user', JSON.stringify(user));
        if (token) {
            localStorage.setItem('mywallet_token', token);
        }
        usuarioActual = user;
        authToken = token;
        mostrarApp();

    } catch (error) {
        alert('Error: credenciales inválidas');
    }
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('mywallet_user');
    localStorage.removeItem('mywallet_token');
    usuarioActual = null;
    authToken = null;
    mostrarLogin();
});

themeToggle.addEventListener('click', () => {
    const esOscuro = document.body.classList.toggle('dark-mode');
    localStorage.setItem('mywallet_theme', esOscuro ? 'dark' : 'light');
    themeToggle.textContent = esOscuro ? '☀️' : '🌙';
});

async function cargarMovimientos() {
    try {
        if (!authToken) {
            mostrarLogin();
            return;
        }
        const res = await fetch(API_URL, {
            headers: { 
                'user-id': usuarioActual.id,
                Authorization: `Bearer ${authToken}`
            }
        });
        const data = await res.json();
        renderizarLista(data);
        actualizarBalance(data);
    } catch (error) {
        console.error(error);
    }
}

transactionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const friendEmail = document.getElementById('friendEmail').value; 

    const nuevaTransaccion = {
        concepto: conceptoInput.value,
        monto: parseFloat(montoInput.value),
        tipo: tipoInput.value,
        emailAmigo: friendEmail
    };

    try {
        await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'user-id': usuarioActual.id,
                Authorization: `Bearer ${authToken}`
            },
            body: JSON.stringify(nuevaTransaccion)
        });

        conceptoInput.value = '';
        montoInput.value = '';
        document.getElementById('friendEmail').value = '';
        cargarMovimientos();
    } catch (error) {
        console.error(error);
    }
});

window.borrarMovimiento = async (id) => {
    if(!confirm('¿Borrar?')) return;
    try {
        await fetch(`${API_URL}/${id}`, { 
            method: 'DELETE',
            headers: { 
                'user-id': usuarioActual.id,
                Authorization: `Bearer ${authToken}`
            }
        });
        cargarMovimientos();
    } catch (error) { console.error(error); }
};

function renderizarLista(movimientos) {
    listEl.innerHTML = '';
    
    movimientos.slice().reverse().forEach(mov => {
        const item = document.createElement('li');
        const fecha = formatDate(mov.date);
        
        let infoExtra = '';
        let claseExtra = '';

        if (mov.user_id != usuarioActual.id) {
            infoExtra = `<small style="color: #e67e22;">Pagado por: ${mov.pagado_por}</small>`;
            claseExtra = 'border-left: 4px solid #e67e22;';
        } 
        else if (mov.shared_with_id) {
             infoExtra = `<small style="color: #2ecc71;">Compartido</small>`;
        }

        const esGasto = mov.type === 'gasto';
        const signo = esGasto ? '-' : '+';
        const colorClass = esGasto ? 'gasto' : 'ingreso';
        const tieneFullAmount = mov.full_amount && mov.full_amount !== mov.amount;
        const fullAmountInfo = tieneFullAmount
            ? `<small style="color: #636e72;">Importe total: ${formatCurrency(mov.full_amount)}</small>`
            : '';

        item.style = claseExtra;
        item.innerHTML = `
            <div class="item-left">
                <span class="item-concept">${mov.concept}</span>
                <span class="item-date">${fecha}</span>
                ${infoExtra}
                ${fullAmountInfo}
            </div>
            <div style="display:flex; align-items:center">
                <span class="item-amount ${colorClass}">${signo}${formatCurrency(mov.amount)}</span>
                ${mov.user_id == usuarioActual.id ? `<button class="delete-btn" onclick="borrarMovimiento('${mov.id}')">✕</button>` : ''}
            </div>
        `;
        
        listEl.appendChild(item);
    });
}

    function actualizarResumenMensual(movimientos) {
        const ahora = new Date();
        const mesActual = ahora.getMonth();
        const anoActual = ahora.getFullYear();
        const nombreMes = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(ahora);

        const resumen = movimientos.reduce(
            (acc, mov) => {
                const fechaMov = mov.date ? new Date(mov.date) : null;
                if (!fechaMov || Number.isNaN(fechaMov.getTime())) return acc;

                if (fechaMov.getMonth() === mesActual && fechaMov.getFullYear() === anoActual) {
                    if (mov.type === 'ingreso') {
                        acc.ingresos += Number(mov.amount) || 0;
                    } else {
                        acc.gastos += Number(mov.amount) || 0;
                    }
                }

                return acc;
            },
            { ingresos: 0, gastos: 0 }
        );

        const balance = resumen.ingresos - resumen.gastos;

        summaryMonthEl.textContent = `${nombreMes} ${anoActual}`;
        monthlyIncomeEl.textContent = formatCurrency(resumen.ingresos);
        monthlyExpenseEl.textContent = formatCurrency(resumen.gastos);
        monthlyBalanceEl.textContent = formatCurrency(balance);
    }

function actualizarBalance(movimientos) {
    const total = movimientos.reduce((acc, mov) => {
        return mov.type === 'ingreso' ? acc + mov.amount : acc - mov.amount;
    }, 0);
    balanceEl.textContent = formatCurrency(total);
    balanceCard.classList.toggle('balance-positive', total >= 0);
    balanceCard.classList.toggle('balance-negative', total < 0);
    actualizarResumenMensual(movimientos);
}

iniciarApp();