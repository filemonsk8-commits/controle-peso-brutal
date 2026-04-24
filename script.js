import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

const URL_ALIMENTOS = "https://raw.githubusercontent.com/filemonsk8-commits/controle-peso-brutal/refs/heads/main/alimentos.json"; 
let currentPos = "";
let bancoLocal = [];
let chart;

// CARREGAR BANCO DO GITHUB
async function carregarBanco() {
    try {
        const res = await fetch(URL_ALIMENTOS);
        const data = await res.json();
        bancoLocal = data.lista || [];
        console.log("[SISTEMA] DADOS_SINCRONIZADOS");
    } catch (e) { console.error("ERRO_VARREDURA"); }
}
carregarBanco();

// BUSCA
document.getElementById('busca').addEventListener('input', (e) => {
    const termo = e.target.value.toUpperCase();
    const res = document.getElementById('resultados');
    res.innerHTML = "";
    if(termo.length < 2) return;
    bancoLocal.filter(i => i.n.includes(termo)).forEach(item => {
        const div = document.createElement('div');
        div.className = 'item-food';
        div.innerHTML = `> ${item.n} | ${item.k}kcal`;
        div.onclick = () => registrarConsumo(item);
        res.appendChild(div);
    });
});

// REGISTRAR CONSUMO
window.registrarConsumo = async (item) => {
    if(!currentPos) return alert("ERRO: OPERADOR NÃO IDENTIFICADO");
    await push(ref(db, `consumo/${currentPos}`), {
        nome: item.n, kcal: item.k, prot: item.p,
        data: new Date().toLocaleDateString('pt-BR'), timestamp: Date.now()
    });
};

// SALVAR PESO
window.salvarPeso = async () => {
    const pesoVal = document.getElementById('input-peso').value;
    if(!currentPos || !pesoVal) return alert("DADOS_INVALIDOS");
    await push(ref(db, `biometria/${currentPos}`), {
        peso: parseFloat(pesoVal),
        data: new Date().toLocaleDateString('pt-BR'), timestamp: Date.now()
    });
    document.getElementById('input-peso').value = "";
};

// MUDAR USER
window.mudarUser = (user) => {
    currentPos = user;
    document.getElementById('user-display').innerText = user.toUpperCase();
    document.querySelectorAll('.user-access button').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-${user.toLowerCase()}`).classList.add('active');

    const hoje = new Date().toLocaleDateString('pt-BR');
    onValue(ref(db, `consumo/${user}`), (snap) => {
        const logs = snap.val();
        const container = document.getElementById('logs-usuario');
        let sk = 0, sp = 0;
        container.innerHTML = "";
        if(logs) {
            Object.values(logs).reverse().forEach(l => {
                if(l.data === hoje) {
                    sk += l.kcal; sp += l.prot;
                    const d = document.createElement('div');
                    d.className = 'item-food'; d.style.fontSize = "0.7rem";
                    d.innerHTML = `[OK] ${l.nome} | ${l.kcal}k`;
                    container.appendChild(d);
                }
            });
        }
        document.getElementById('total-kcal').innerText = Math.round(sk);
        document.getElementById('total-prot').innerText = sp.toFixed(1);
    });
};

// GRÁFICO
function initChart() {
    onValue(ref(db, `biometria`), (snap) => {
        const dados = snap.val() || {};
        const ctx = document.getElementById('graficoPeso').getContext('2d');
        const edu = dados.Eduardo ? Object.values(dados.Eduardo).slice(-7) : [];
        const nad = dados.Nadia ? Object.values(dados.Nadia).slice(-7) : [];
        
        if(chart) chart.destroy();
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: edu.length > nad.length ? edu.map(d => d.data) : nad.map(d => d.data),
                datasets: [
                    { label: 'EDUARDO', data: edu.map(d => d.peso), borderColor: '#00ff41', tension: 0.1 },
                    { label: 'NÁDIA', data: nad.map(d => d.peso), borderColor: '#ff003c', tension: 0.1 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#888', font: { family: 'monospace' } } } } }
        });
    });
}
initChart();
