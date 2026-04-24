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

let currentPos = "Eduardo", bancoLocal = [], alimentoSelecionado = null, chart = null;
const URL_ALIMENTOS = "https://raw.githubusercontent.com/filemonsk8-commits/controle-peso-brutal/refs/heads/main/alimentos.json";

// INICIALIZAÇÃO
async function carregarBanco() {
    const res = await fetch(URL_ALIMENTOS);
    const data = await res.json();
    bancoLocal = data.lista || [];
    mudarAba('Eduardo'); // Inicia com Eduardo
}

// TROCA DE ABAS
window.mudarAba = (user) => {
    currentPos = user;
    document.getElementById('display-aba').innerText = user.toUpperCase();
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${user.toLowerCase()}`).classList.add('active');
    
    configurarObservadores(user);
};

// BUSCA E MODAL
document.getElementById('busca').addEventListener('input', (e) => {
    const termo = e.target.value.toUpperCase();
    const res = document.getElementById('resultados');
    res.innerHTML = "";
    if(termo.length < 2) return;
    bancoLocal.filter(i => i.n.includes(termo)).forEach(item => {
        const div = document.createElement('div');
        div.className = 'item-food';
        div.innerHTML = `<span>${item.n}</span> <br> <small>${item.k}k | P:${item.p}</small>`;
        div.onclick = () => {
            alimentoSelecionado = item;
            document.getElementById('modal-nome-alimento').innerText = item.n;
            document.getElementById('modal-porcao').style.display = 'flex';
        };
        res.appendChild(div);
    });
});

window.fecharModal = () => document.getElementById('modal-porcao').style.display = 'none';

window.confirmarConsumo = async () => {
    const qtd = parseFloat(document.getElementById('input-qtd').value) || 100;
    const fator = qtd / 100;
    await push(ref(db, `consumo/${currentPos}`), {
        nome: alimentoSelecionado.n,
        kcal: Math.round(alimentoSelecionado.k * fator),
        prot: parseFloat((alimentoSelecionado.p * fator).toFixed(1)),
        qtd: qtd,
        data: new Date().toLocaleDateString('pt-BR'),
        timestamp: Date.now()
    });
    fecharModal();
    document.getElementById('input-qtd').value = "";
};

// PESO E GRÁFICO
window.salvarPeso = async () => {
    const p = document.getElementById('input-peso').value;
    if(!p) return;
    await push(ref(db, `biometria/${currentPos}`), {
        peso: parseFloat(p),
        data: new Date().toLocaleDateString('pt-BR'),
        timestamp: Date.now()
    });
    document.getElementById('input-peso').value = "";
};

function configurarObservadores(user) {
    const hoje = new Date().toLocaleDateString('pt-BR');
    
    // Logs de Consumo
    onValue(ref(db, `consumo/${user}`), (snap) => {
        const logs = snap.val();
        const container = document.getElementById('logs-usuario');
        let sk = 0, sp = 0; container.innerHTML = "";
        if(logs) {
            Object.keys(logs).reverse().forEach(id => {
                const l = logs[id];
                if(l.data === hoje) {
                    sk += l.kcal; sp += l.prot;
                    const d = document.createElement('div');
                    d.className = 'log-item';
                    d.innerHTML = `<div><b>${l.nome}</b> (${l.qtd}g/un)<br><small>${l.kcal}kcal | ${l.prot}g P</small></div>
                                   <button class="btn-del" onclick="apagarLog('${id}')">✖</button>`;
                    container.appendChild(d);
                }
            });
        }
        document.getElementById('total-kcal').innerText = Math.round(sk);
        document.getElementById('total-prot').innerText = sp.toFixed(1);
    });

    // Gráfico de Peso
    onValue(ref(db, `biometria/${user}`), (snap) => {
        const dados = snap.val();
        const ctx = document.getElementById('graficoPeso').getContext('2d');
        const lista = dados ? Object.values(dados).slice(-10) : [];
        if(chart) chart.destroy();
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: lista.map(d => d.data.split('/')[0] + '/' + d.data.split('/')[1]),
                datasets: [{ label: 'PESO (kg)', data: lista.map(d => d.peso), borderColor: '#00ff41', tension: 0.1 }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { grid: { color: '#222' } } } }
        });
    });
}

window.apagarLog = (id) => remove(ref(db, `consumo/${currentPos}/${id}`));

carregarBanco();
