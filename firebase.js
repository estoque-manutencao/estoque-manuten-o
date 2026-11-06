// ============================================================
//  firebase.js — Configuração e Firebase
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyC4YaP-3RlNuP4NwRhCjiR2oGzeKBpjWG0",
  authDomain: "appagendamentoclientes.firebaseapp.com",
  projectId: "appagendamentoclientes",
  storageBucket: "appagendamentoclientes.firebasestorage.app",
  messagingSenderId: "752827133818",
  appId: "1:752827133818:web:12a306dac8da280889b0c3",
  measurementId: "G-JXPM86CRST"
};

const state = {
  categories: [],
  items: [],
  history: [],
  activeCategoryFilter: "ALL",
  dbConnected: false,
  operatorName: localStorage.getItem('operatorName') || '',
  undoStack: []
};

let db = null;

// ── INICIALIZAÇÃO ─────────────────────────────────────────────
async function initFirebase() {
  try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    state.dbConnected = true;

    setBadge('Firebase Conectado', 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30');
    loadAppConfig();
    subscribeToFirestore();

  } catch (err) {
    console.warn('Firebase erro:', err);
    setBadge('Erro de Conexão', 'bg-rose-500/20 text-rose-400 border-rose-500/30');
  }
}

function setBadge(text, cls) {
  const el = document.getElementById('db-status-badge');
  if (!el) return;
  el.className = `px-2 py-0.5 rounded-full text-[10px] border ${cls}`;
  el.innerText = text;
}

// ── SUBSCRIPTIONS ─────────────────────────────────────────────
function subscribeToFirestore() {
  if (!db) return;

  db.collection('items').onSnapshot(snap => {
    state.items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderDashboard();
    renderInventoryTable();
    renderRestockTable();
  }, err => console.error('items:', err));

  db.collection('history').onSnapshot(snap => {
    state.history = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    renderHistoryTable();
  }, err => console.error('history:', err));

  db.collection('categories').onSnapshot(snap => {
    state.categories = snap.docs.map(d => ({ id: d.id, name: d.data().name }));
    renderCategories();
  }, err => console.error('categories:', err));
}

// ── CRUD ITEMS ────────────────────────────────────────────────
async function fbSaveItem(item) {
  if (!db) return;
  const data = { ...item };
  delete data.id;
  await db.collection('items').doc(item.id).set(data, { merge: true });
}

async function fbDeleteItem(id) {
  if (!db) return;
  await db.collection('items').doc(id).delete();
}

// ── CRUD HISTORY ──────────────────────────────────────────────
async function fbSaveHistory(log) {
  if (!db) return null;
  const data = { ...log };
  delete data.id;
  const ref = await db.collection('history').add(data);
  return ref.id;
}

async function fbDeleteHistory(id) {
  if (!db) return;
  await db.collection('history').doc(id).delete();
}

// ── CRUD CATEGORIES ───────────────────────────────────────────
async function fbSaveCategory(name) {
  if (!db) return null;
  const ref = await db.collection('categories').add({ name });
  return ref.id;
}

async function fbDeleteCategory(id) {
  if (!db) return;
  await db.collection('categories').doc(id).delete();
}

async function fbUpdateCategory(id, newName) {
  if (!db) return;
  await db.collection('categories').doc(id).update({ name: newName });
}

// ── CONFIG ────────────────────────────────────────────────────
async function fbSaveConfig(key, value) {
  if (!db) return;
  await db.collection('config').doc(key).set({ value });
}

async function fbLoadConfig(key) {
  if (!db) return null;
  const doc = await db.collection('config').doc(key).get();
  return doc.exists ? doc.data().value : null;
}

async function loadAppConfig() {
  const name = await fbLoadConfig('appName');
  if (name) applyAppName(name);
}

function applyAppName(name) {
  document.querySelectorAll('[data-app-name]').forEach(el => el.innerText = name);
  document.title = `${name} — Controle de Estoque`;
}

// ── FOTO DA PEÇA ──────────────────────────────────────────────
async function fbSaveItemPhoto(itemId, base64) {
  if (!db) return;
  await db.collection('items').doc(itemId).update({ photo: base64 });
}

// ── NOTIFICAÇÃO E-MAIL ────────────────────────────────────────
async function fbSendLowStockAlert(items) {
  if (!db) return;
  const adminEmail = await fbLoadConfig('adminEmail');
  if (!adminEmail) return;
  await db.collection('mail').add({
    to: adminEmail,
    message: {
      subject: '⚠️ Alerta de Estoque Crítico',
      html: `<h2>Itens em Estoque Crítico</h2><ul>
        ${items.map(i => `<li><b>${i.name}</b> — ${i.quantity} ${i.unit || 'un'} (Mín: ${i.minStock})</li>`).join('')}
      </ul>`
    },
    createdAt: new Date().toISOString()
  });
}
