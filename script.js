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

let currentPos = "";
let bancoLocal = [];

// REGISTRO DO SERVICE WORKER (PWA)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(() => console.log("PWA_ATIVO"));
}

// CARREGAR ALIMENTOS
onValue(ref(db, 'alimentos/lista'), (snapshot) => {
    bancoLocal = snapshot.val() || [];
    console.log("BASE_DE_DADOS_SINCRONIZADA");
});

// BUSCA
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

// REGISTRAR CONSUMO
window.registrarConsumo = async (item) => {
    if(!currentPos) return alert("ERRO: SELECIONE UM OPERADOR!");
    await push(ref(db, `consumo/${currentPos}`), {
        nome: item.n, kcal: item.k, prot: item.p,
        data: new Date().toLocaleDateString()
    });
};

// MUDAR USUÁRIO
window.mudarUser = (user) => {
    currentPos = user;
    document.getElementById('user-display').innerText = user.toUpperCase();
    document.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-${user.toLowerCase()}`).classList.add('active');

    onValue(ref(db, `consumo/${user}`), (snapshot) => {
        const logs = snapshot.val();
        const container = document.getElementById('logs-usuario');
        container.innerHTML = "";
        let sk = 0, sp = 0;

        if(logs) {
            Object.values(logs).forEach(l => {
                sk += l.kcal; sp += l.prot;
                const div = document.createElement('div');
                div.className = 'item-food';
                div.style.fontSize = "0.8rem";
                div.innerHTML = `[OK] ${l.nome} | ${l.kcal}kcal`;
                container.prepend(div);
            });
        }
        document.getElementById('total-kcal').innerText = Math.round(sk);
        document.getElementById('total-prot').innerText = sp.toFixed(1);
    });
};
