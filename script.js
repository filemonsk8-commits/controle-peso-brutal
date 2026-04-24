import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAUGBeg3LHf4O-_vU69SdI7DNdq1sZIOFk",
    authDomain: "controlepesobrutal.firebaseapp.com",
    projectId: "controlepesobrutal",
    databaseURL: "https://controlepesobrutal-default-rtdb.firebaseio.com",
    storageBucket: "controlepesobrutal.firebasestorage.app",
    messagingSenderId: "1091314596159",
    appId: "1:1091314596159:web:d90dc1673e7fea0eee7b8a"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let currentPos = "Eduardo", bancoLocal = [], selecionado = null, qtdAtual = 100, chart = null;
const URL_ALIMENTOS = "https://raw.githubusercontent.com/filemonsk8-commits/controle-peso-brutal/refs/heads/main/alimentos.json";

// INICIAR
async function init() {
    const r = await fetch(URL_ALIMENTOS);
    const d = await r.json();
    bancoLocal = d.lista || [];
    mudarAba('Eduardo');
}

// ABAS (SIDEBAR)
window.mudarAba = (user) => {
    currentPos = user;
    document.getElementById('display-user').innerText = user.toUpperCase();
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`side-${user.toLowerCase()}`).classList.add('active');
    monitorarDados(user);
};

// PORÇÕES (+ / -)
window.alterarQtd = (v) => {
    qtdAtual = Math.max(1, qtdAtual + v);
    document.getElementById('display-qtd').innerText = qtdAtual;
};

window.abrirModal = (item) => {
    selecionado = item;
    qtdAtual = 100; // Reset para base 100
    document.getElementById('m-nome').innerText = item.n;
    document.getElementById('display-qtd').innerText = qtdAtual;
    document.getElementById('modal-porcao').style.display = 'flex';
};

window.fecharModal = () => document.getElementById('modal-porcao').style.display = 'none';

window.confirmarConsumo = async () => {
    const fator = qtdAtual / 100;
    await push(ref(db, `consumo/${currentPos}`), {
        nome: selecionado.n,
        kcal: Math.round(selecionado.k * fator),
        prot: parseFloat((selecionado.p * fator).toFixed(1)),
        qtd: qtdAtual,
        data: new Date().toLocaleDateString('pt-BR'),
        timestamp: Date.now()
    });
    fecharModal();
};

// BUSCA
document.getElementById('busca').addEventListener('input', (e) => {
    const t = e.target.value.toUpperCase();
    const res = document.getElementById('resultados');
    res.innerHTML = "";
    if(t.length < 2) return;
    bancoLocal.filter(i => i.n.includes(t)).forEach(item => {
        const div = document.createElement('div');
        div.className = 'log-row'; div.style.cursor = 'pointer';
        div.innerHTML = `<div>${item.n}</div> <small>${item.k}k</small>`;
        div.onclick = () => abrirModal(item);
        res.appendChild(div);
    });
});

// MONITORAMENTO FIREBASE
function monitorarDados(user) {
    const hoje = new Date().toLocaleDateString('pt-BR');
    
    onValue(ref(db, `consumo/${user}`), (s) => {
        const data = s.val();
        let sk = 0, sp = 0;
        const cont = document.getElementById('logs-usuario');
        cont.innerHTML = "";
        if(data) {
            Object.keys(data).reverse().forEach(id => {
                const l = data[id];
                if(l.data === hoje) {
                    sk += l.kcal; sp += l.prot;
                    const d = document.createElement('div');
                    d.className = 'log-row';
                    d.innerHTML = `<div><b>${l.nome}</b><br><small>${l.qtd}g | ${l.kcal}kcal</small></div>
                                   <button class="btn-x" onclick="apagar('${id}')">✖</button>`;
                    cont.appendChild(d);
                }
            });
        }
        document.getElementById('total-kcal').innerText = Math.round(sk);
        document.getElementById('total-prot').innerText = sp.toFixed(1);
    });

    onValue(ref(db, `biometria/${user}`), (s) => {
        const d = s.val();
        const lista = d ? Object.values(d).slice(-7) : [];
        const ctx = document.getElementById('graficoPeso').getContext('2d');
        if(chart) chart.destroy();
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: lista.map(i => i.data.slice(0,5)),
                datasets: [{ label: 'PESO (kg)', data: lista.map(i => i.peso), borderColor: '#00ff41', tension: 0.2 }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { grid: { color: '#111' } } } }
        });
    });
}

window.salvarPeso = async () => {
    const p = document.getElementById('input-peso').value;
    if(!p) return;
    await push(ref(db, `biometria/${currentPos}`), { peso: parseFloat(p), data: new Date().toLocaleDateString('pt-BR'), timestamp: Date.now() });
    document.getElementById('input-peso').value = "";
};

window.apagar = (id) => remove(ref(db, `consumo/${currentPos}/${id}`));

init();
