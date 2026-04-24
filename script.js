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

// LINK DO SEU REPOSITÓRIO GITHUB
const URL_ALIMENTOS_RAW = "https://raw.githubusercontent.com/filemonsk8-commits/controle-peso-brutal/refs/heads/main/alimentos.json"; 

let currentPos = "";
let bancoLocal = [];

// 1. REGISTRO PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(() => console.log("SISTEMA_OFFLINE_ATIVADO"));
}

// 2. CARREGAR ALIMENTOS VIA GITHUB
async function carregarBanco() {
    try {
        const response = await fetch(URL_ALIMENTOS_RAW);
        const data = await response.json();
        bancoLocal = data.lista || [];
        console.log(`[SISTEMA] ${bancoLocal.length} ALIMENTOS_SINCRONIZADOS`);
    } catch (err) {
        console.error("FALHA_NA_VARREDURA_REMOTA:", err);
    }
}
carregarBanco();

// 3. BUSCA DE ALIMENTOS
document.getElementById('busca').addEventListener('input', (e) => {
    const termo = e.target.value.toUpperCase();
    const res = document.getElementById('resultados');
    res.innerHTML = "";
    if(termo.length < 2) return;

    bancoLocal.filter(i => i.n.includes(termo)).forEach(item => {
        const div = document.createElement('div');
        div.className = 'item-food';
        div.innerHTML = `> ${item.n} <br> <small>${item.k}kcal | P:${item.p}g</small>`;
        div.onclick = () => registrarConsumo(item);
        res.appendChild(div);
    });
});

// 4. REGISTRAR CONSUMO NO FIREBASE
window.registrarConsumo = async (item) => {
    if(!currentPos) return alert("ERRO: ACESSO NÃO AUTORIZADO. SELECIONE OPERADOR.");
    
    await push(ref(db, `consumo/${currentPos}`), {
        nome: item.n, 
        kcal: item.k, 
        prot: item.p,
        data: new Date().toLocaleDateString('pt-BR'), // Salva a data formatada
        timestamp: Date.now()
    });
};

// 5. SELEÇÃO DE USUÁRIO E FILTRO DE HOJE
window.mudarUser = (user) => {
    currentPos = user;
    document.getElementById('user-display').innerText = user.toUpperCase();
    document.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-${user.toLowerCase()}`).classList.add('active');

    const hoje = new Date().toLocaleDateString('pt-BR');

    onValue(ref(db, `consumo/${user}`), (snapshot) => {
        const logs = snapshot.val();
        const container = document.getElementById('logs-usuario');
        const tKcal = document.getElementById('total-kcal');
        const tProt = document.getElementById('total-prot');
        
        container.innerHTML = "";
        let sk = 0, sp = 0;

        if(logs) {
            // Converte objeto em array e inverte para o mais novo aparecer primeiro
            const itensLog = Object.values(logs).reverse();
            
            itensLog.forEach(l => {
                // SÓ MOSTRA E SOMA SE FOR A DATA DE HOJE
                if(l.data === hoje) {
                    sk += l.kcal; sp += l.prot;
                    const div = document.createElement('div');
                    div.className = 'item-food';
                    div.style.fontSize = "0.8rem";
                    div.style.borderLeft = "3px solid var(--red)";
                    div.innerHTML = `[OK] ${l.nome} | ${l.kcal}kcal`;
                    container.appendChild(div);
                }
            });
        }
        tKcal.innerText = Math.round(sk);
        tProt.innerText = sp.toFixed(1);
    });
};
