// ============================================================
//  app.js — StockMaster Pro | Lógica Principal
// ============================================================

let categoryChartInstance   = null;
let monthlyCatChartInstance = null;
let monthlyTotChartInstance = null;
let html5QrScanner          = null;

// ── INIT ──────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  await initFirebase();
  updateOperatorBadge();
});

function renderAll() {
  renderCategories();
  renderDashboard();
  renderInventoryTable();
  renderRestockTable();
  renderHistoryTable();
}

// ══════════════════════════════════════════════════════════════
//  OPERADOR
// ══════════════════════════════════════════════════════════════
function updateOperatorBadge() {
  const el = document.getElementById('operator-name-badge');
  if (!el) return;
  el.innerText = state.operatorName ? `👤 ${state.operatorName}` : '👤 Identificar-se';
}

function openOperatorModal(callback) {
  document.getElementById('operator-name-input').value = state.operatorName || '';
  document.getElementById('modal-operator').classList.remove('hidden');
  setTimeout(() => document.getElementById('operator-name-input').focus(), 80);
  window._operatorCallback = callback || null;
}

function closeOperatorModal() {
  document.getElementById('modal-operator').classList.add('hidden');
  window._operatorCallback = null;
}

function saveOperatorName(e) {
  if (e) e.preventDefault();
  const name = (document.getElementById('operator-name-input').value || '').trim();
  if (!name) { showToast('Informe seu nome!', 'error'); return; }
  state.operatorName = name;
  localStorage.setItem('operatorName', name);
  updateOperatorBadge();
  closeOperatorModal();
  if (window._operatorCallback) {
    window._operatorCallback(name);
    window._operatorCallback = null;
  }
}

function requireOperator(action) {
  if (state.operatorName) action(state.operatorName);
  else openOperatorModal(action);
}

// ══════════════════════════════════════════════════════════════
//  NAVEGAÇÃO
// ══════════════════════════════════════════════════════════════
function switchTab(tabName) {
  document.querySelectorAll('section[id^="tab-"]').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-btn').forEach(el => {
    el.classList.remove('bg-brand-600','text-white','shadow-lg','shadow-brand-600/30');
    el.classList.add('hover:bg-slate-800','text-slate-400');
  });
  document.getElementById(`tab-${tabName}`)?.classList.remove('hidden');
  const nav = document.getElementById(`nav-${tabName}`);
  if (nav) {
    nav.classList.add('bg-brand-600','text-white','shadow-lg','shadow-brand-600/30');
    nav.classList.remove('hover:bg-slate-800','text-slate-400');
  }
  const titles = {
    dashboard: 'Dashboard & Indicadores',
    inventory: 'Gestão do Estoque de Peças',
    restock:   'Sugestão de Reposição',
    financial: 'Análise Financeira & Custos',
    history:   'Histórico de Movimentações e OS',
    movements: 'Movimentações — Baixa & Entrada Rápida'
};
  document.getElementById('page-title').innerText = titles[tabName] || 'Controle de Estoque';
  if (tabName === 'financial') renderFinancialCharts();
  if (tabName === 'dashboard') renderDashboardCharts();
  if (tabName === 'restock')   renderRestockTable();
  if (tabName === 'history')   renderHistoryTable();
  updateMobileBottomNav(tabName); 
}

// ══════════════════════════════════════════════════════════════
//  CATEGORIAS
// ══════════════════════════════════════════════════════════════
function renderCategories() {
  // Atualiza select do modal de item
  const sel = document.getElementById('item-category');
  if (sel) {
    const cur = sel.value;
    sel.innerHTML = `<option value="">Selecionar categoria...</option>` +
      state.categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    if (cur) sel.value = cur;
  }

  // Atualiza select de filtro
  const filterSel = document.getElementById('filter-category');
  if (filterSel) {
    const cur = filterSel.value;
    filterSel.innerHTML = `<option value="ALL">Todas as Categorias</option>` +
      state.categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    if (cur) filterSel.value = cur;
  }

  // Pills de filtro rápido
  const pills = document.getElementById('category-pills');
  if (pills) {
    pills.innerHTML =
      `<button onclick="filterByPill('ALL')"
        class="px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition
          ${state.activeCategoryFilter === 'ALL'
            ? 'bg-brand-600 text-white'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
        Todas
       </button>` +
      state.categories.map(c => `
        <button onclick="filterByPill('${c.name}')"
          class="px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition
            ${state.activeCategoryFilter === c.name
              ? 'bg-brand-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
          ${c.name}
        </button>`).join('');
  }

  setEl('kpi-total-categories', state.categories.length);
  renderCategoryList();
}

function renderCategoryList() {
  const catList = document.getElementById('category-list');
  if (!catList) return;
  catList.innerHTML = state.categories.length
    ? state.categories.map(c => `
        <li class="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm">
          <span class="font-medium text-slate-700">${c.name}</span>
          <div class="flex gap-1">
            <button onclick="editCategoryPrompt('${c.id}','${c.name}')"
              title="Renomear"
              class="text-blue-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition">
              <i class="fa-solid fa-pencil text-xs"></i>
            </button>
            <button onclick="deleteCategory('${c.id}','${c.name}')"
              title="Excluir"
              class="text-rose-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition">
              <i class="fa-solid fa-trash text-xs"></i>
            </button>
          </div>
        </li>`).join('')
    : `<li class="text-center text-slate-400 text-xs py-6">
         <i class="fa-solid fa-tags text-2xl mb-2 block text-slate-300"></i>
         Nenhuma categoria cadastrada.
       </li>`;
}

function filterByPill(cat) {
  state.activeCategoryFilter = cat;
  const sel = document.getElementById('filter-category');
  if (sel) sel.value = cat;
  renderCategories();
  renderInventoryTable();
}

function openCategoryModal() {
  document.getElementById('new-category-input').value = '';
  renderCategoryList();
  document.getElementById('modal-category').classList.remove('hidden');
  setTimeout(() => document.getElementById('new-category-input').focus(), 80);
}

function closeCategoryModal() {
  document.getElementById('modal-category').classList.add('hidden');
}

async function addCategory() {
  const input = document.getElementById('new-category-input');
  const name  = (input?.value || '').trim();
  if (!name) { showToast('Digite o nome da categoria!', 'error'); return; }
  if (state.categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
    showToast('Esta categoria já existe!', 'error'); return;
  }
  try {
    const id = await fbSaveCategory(name);
    if (id && !state.categories.find(c => c.id === id)) {
      state.categories.push({ id, name });
    }
    if (input) input.value = '';
    renderCategories();
    showToast(`✅ Categoria "${name}" adicionada!`);
  } catch (err) {
    console.error(err);
    showToast('Erro ao salvar! Verifique a conexão.', 'error');
  }
}

async function editCategoryPrompt(id, currentName) {
  const newName = prompt('Novo nome da categoria:', currentName);
  if (!newName || newName.trim() === currentName) return;
  const trimmed = newName.trim();
  if (state.categories.some(c => c.id !== id && c.name.toLowerCase() === trimmed.toLowerCase())) {
    showToast('Já existe uma categoria com esse nome!', 'error'); return;
  }
  const cat = state.categories.find(c => c.id === id);
  if (cat) cat.name = trimmed;
  await fbUpdateCategory(id, trimmed);
  if (db) {
    const affected = state.items.filter(i => i.category === currentName);
    affected.forEach(i => i.category = trimmed);
    if (affected.length) {
      const batch = db.batch();
      affected.forEach(i =>
        batch.update(db.collection('items').doc(i.id), { category: trimmed })
      );
      await batch.commit();
    }
  }
  renderCategories();
  renderInventoryTable();
  showToast('✅ Categoria renomeada!');
}

async function deleteCategory(id, name) {
  if (state.items.some(i => i.category === name)) {
    showToast(`Categoria "${name}" está em uso! Altere os itens primeiro.`, 'error'); return;
  }
  if (!confirm(`Excluir a categoria "${name}"?\nEsta ação não pode ser desfeita.`)) return;
  state.categories = state.categories.filter(c => c.id !== id);
  await fbDeleteCategory(id);
  renderCategories();
  showToast('🗑️ Categoria removida.');
}

// ── Categoria rápida dentro do modal de peça ──────────────────
function openQuickCategoryModal() {
  document.getElementById('quick-category-input').value = '';
  document.getElementById('modal-quick-category').classList.remove('hidden');
  setTimeout(() => document.getElementById('quick-category-input').focus(), 80);
}

function closeQuickCategoryModal() {
  document.getElementById('modal-quick-category').classList.add('hidden');
}

async function saveQuickCategory(e) {
  e.preventDefault();
  const input = document.getElementById('quick-category-input');
  const name  = (input?.value || '').trim();
  if (!name) return;
  if (state.categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
    // Apenas seleciona a existente
    setTimeout(() => {
      const sel = document.getElementById('item-category');
      if (sel) sel.value = name;
    }, 50);
    closeQuickCategoryModal();
    showToast(`Categoria "${name}" selecionada!`);
    return;
  }
  try {
    const id = await fbSaveCategory(name);
    if (id && !state.categories.find(c => c.id === id)) {
      state.categories.push({ id, name });
    }
    renderCategories();
    setTimeout(() => {
      const sel = document.getElementById('item-category');
      if (sel) sel.value = name;
    }, 80);
    closeQuickCategoryModal();
    showToast(`✅ Categoria "${name}" criada e selecionada!`);
  } catch (err) {
    console.error(err);
    showToast('Erro ao criar categoria!', 'error');
  }
}

// ══════════════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════════════
function renderDashboard() {
  const period = document.getElementById('dash-period')?.value || 'all';
  const now    = new Date();

  const periodFilter = h => {
    if (period === 'all') return true;
    const d = new Date(h.date);
    if (period === 'week')  { const w = new Date(now); w.setDate(now.getDate()-7); return d >= w; }
    if (period === 'month') return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
    if (period === 'year')  return d.getFullYear()===now.getFullYear();
    return true;
  };

  const filteredHistory = state.history.filter(periodFilter);
  const totalValuation  = state.items.reduce((s,i) => s+((i.quantity||0)*(i.price||0)), 0);
  const lowStock        = state.items.filter(i => (i.quantity||0) <= (i.minStock||0));
  const periodSpent     = filteredHistory
    .filter(h => h.type==='ENTRADA')
    .reduce((s,h) => s+((h.quantity||0)*(h.unitPrice||0)), 0);

  setEl('kpi-total-items',      state.items.length);
  setEl('kpi-total-value',      `R$ ${totalValuation.toLocaleString('pt-BR',{minimumFractionDigits:2})}`);
  setEl('kpi-low-stock',        lowStock.length);
  setEl('kpi-total-categories', state.categories.length);
  setEl('kpi-period-spent',     `R$ ${periodSpent.toLocaleString('pt-BR',{minimumFractionDigits:2})}`);

  const alertList = document.getElementById('low-stock-list');
  if (alertList) {
    alertList.innerHTML = lowStock.length === 0
      ? `<p class="text-xs text-slate-400 text-center py-6">
           <i class="fa-solid fa-circle-check text-emerald-400 text-2xl mb-2 block"></i>
           Todos os itens em nível seguro!
         </p>`
      : lowStock.map(item => `
          <div class="flex items-center justify-between p-3 bg-rose-50/70 border border-rose-200 rounded-xl cursor-pointer hover:bg-rose-100/60 transition"
               onclick="switchTab('inventory')">
            <div>
              <p class="font-bold text-xs text-slate-800">${item.name}</p>
              <span class="text-[10px] text-slate-500">${item.location||'—'}</span>
            </div>
            <span class="text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md whitespace-nowrap">
              ${item.quantity} ${item.unit||'un'} / Mín: ${item.minStock}
            </span>
          </div>`).join('');
    if (lowStock.length > 0) fbSendLowStockAlert(lowStock);
  }
  renderDashboardCharts();
}

function renderDashboardCharts() {
  const ctx = document.getElementById('categoryValueChart');
  if (!ctx) return;
  const catMap = {};
  state.categories.forEach(c => { catMap[c.name] = 0; });
  state.items.forEach(i => {
    catMap[i.category] = (catMap[i.category]||0) + ((i.quantity||0)*(i.price||0));
  });
  const labels = Object.keys(catMap).filter(k => catMap[k] > 0);
  const values = labels.map(k => catMap[k]);
  if (categoryChartInstance) categoryChartInstance.destroy();
  categoryChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.length ? labels : ['Sem dados'],
      datasets: [{
        data: values.length ? values : [1],
        backgroundColor: ['#0284c7','#10b981','#f59e0b','#6366f1','#ec4899','#8b5cf6','#64748b'],
        borderWidth: 2, borderColor: '#fff'
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { font: { size: 11 } } },
        tooltip: { callbacks: {
          label: c => ` R$ ${Number(c.raw).toLocaleString('pt-BR',{minimumFractionDigits:2})}`
        }}
      }
    }
  });
}

// ══════════════════════════════════════════════════════════════
//  GRÁFICOS FINANCEIROS
// ══════════════════════════════════════════════════════════════
function renderFinancialCharts() {
  const catCtx = document.getElementById('monthlyCategoryChart');
  const totCtx = document.getElementById('monthlyTotalChart');
  if (!catCtx || !totCtx) return;

  const monthSet  = new Set();
  const catMonMap = {};

  state.history.filter(h => h.type==='ENTRADA').forEach(h => {
    const month = (h.date||'').slice(0,7);
    if (!month) return;
    monthSet.add(month);
    const item = state.items.find(i => i.name===h.itemName);
    const cat  = item?.category || 'Outros';
    if (!catMonMap[cat]) catMonMap[cat] = {};
    catMonMap[cat][month] = (catMonMap[cat][month]||0) + ((h.quantity||0)*(h.unitPrice||0));
  });

  const months   = [...monthSet].sort();
  const colors   = ['#0284c7','#10b981','#f59e0b','#6366f1','#ec4899','#8b5cf6','#64748b'];
  const datasets = Object.keys(catMonMap).map((cat,i) => ({
    label: cat,
    data: months.map(m => catMonMap[cat][m]||0),
    backgroundColor: colors[i % colors.length]
  }));

  let acc = 0;
  const totalLine = months.map(m => {
    acc += Object.values(catMonMap).reduce((s,c) => s+(c[m]||0), 0);
    return acc;
  });

  if (monthlyCatChartInstance) monthlyCatChartInstance.destroy();
  if (monthlyTotChartInstance) monthlyTotChartInstance.destroy();

  monthlyCatChartInstance = new Chart(catCtx, {
    type: 'bar',
    data: {
      labels: months.length ? months : ['Sem dados'],
      datasets: datasets.length ? datasets : [{label:'Sem dados',data:[0]}]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { font: { size: 11 } } } },
      scales: {
        x: { stacked:true, ticks:{color:'#64748b'}, grid:{color:'#f1f5f9'} },
        y: { stacked:true, ticks:{color:'#64748b', callback: v=>'R$'+Number(v).toLocaleString('pt-BR')}, grid:{color:'#f1f5f9'} }
      }
    }
  });

  monthlyTotChartInstance = new Chart(totCtx, {
    type: 'line',
    data: {
      labels: months.length ? months : ['Sem dados'],
      datasets: [{
        label: 'Investimento Acumulado (R$)',
        data: totalLine.length ? totalLine : [0],
        borderColor: '#0284c7', backgroundColor: 'rgba(2,132,199,0.1)',
        fill: true, tension: 0.3, pointRadius: 4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        x: { ticks:{color:'#64748b'}, grid:{color:'#f1f5f9'} },
        y: { ticks:{color:'#64748b', callback: v=>'R$'+Number(v).toLocaleString('pt-BR')}, grid:{color:'#f1f5f9'} }
      }
    }
  });
}

// ══════════════════════════════════════════════════════════════
//  TABELA DE ESTOQUE
// ══════════════════════════════════════════════════════════════
function renderInventoryTable() {
  const search     = (document.getElementById('search-input')?.value||'').toLowerCase();
  const catFilter  =  document.getElementById('filter-category')?.value||'ALL';
  const statFilter =  document.getElementById('filter-status')?.value||'ALL';
  const tbody      =  document.getElementById('inventory-tbody');
  const emptyMsg   =  document.getElementById('empty-inventory');
  if (!tbody) return;

  const filtered = state.items.filter(item => {
    const matchSearch =
      (item.name||'').toLowerCase().includes(search) ||
      (item.sku||'').toLowerCase().includes(search) ||
      (item.location||'').toLowerCase().includes(search) ||
      (item.supplier||'').toLowerCase().includes(search);
    const matchCat    = catFilter==='ALL' || item.category===catFilter;
    let   matchStatus = true;
    if (statFilter==='LOW') matchStatus = item.quantity<=item.minStock && item.quantity>0;
    if (statFilter==='OUT') matchStatus = item.quantity===0;
    if (statFilter==='OK')  matchStatus = item.quantity>item.minStock;
    return matchSearch && matchCat && matchStatus;
  });

  if (!filtered.length) {
    tbody.innerHTML = '';
    emptyMsg?.classList.remove('hidden');
    return;
  }
  emptyMsg?.classList.add('hidden');

  tbody.innerHTML = filtered.map(item => {
    const isLow = item.quantity <= item.minStock;
    const isOut = item.quantity === 0;
    let rowBg   = 'hover:bg-slate-50';
    if (isOut)      rowBg = 'bg-rose-50/60 hover:bg-rose-100/50';
    else if (isLow) rowBg = 'bg-amber-50/50 hover:bg-amber-100/40';

    let badge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">✅ OK</span>`;
    if (isOut)      badge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200 text-rose-800">⛔ Esgotado</span>`;
    else if (isLow) badge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-800">⚠️ Baixo</span>`;

    let validBadge = '';
    if (item.expiryDate) {
      const days = Math.ceil((new Date(item.expiryDate)-new Date())/86400000);
      if (days<=0)
        validBadge = `<span class="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-rose-200 text-rose-800 font-bold">Vencido</span>`;
      else if (days<=30)
        validBadge = `<span class="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-200 text-amber-800 font-bold">Vence ${days}d</span>`;
    }

    const photoHtml = item.photo
      ? `<img src="${item.photo}" alt="foto"
            class="w-10 h-10 rounded-lg object-cover border border-slate-200 cursor-pointer flex-shrink-0"
            onclick="showPhotoModal('${item.id}')" title="Ver foto">`
      : `<div class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 flex-shrink-0 cursor-pointer hover:bg-slate-200 transition"
              onclick="triggerPhotoUpload('${item.id}')" title="Adicionar foto">
           <i class="fa-solid fa-camera text-sm"></i>
         </div>`;

    const qrHtml = item.qrCode
      ? `<img src="${item.qrCode}" class="w-9 h-9 rounded cursor-pointer hover:scale-110 transition"
             onclick="showQrModal('${item.id}')" title="Ver / Imprimir QR Code">`
      : `<button onclick="showQrModal('${item.id}')" title="Gerar QR Code"
              class="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition">
           <i class="fa-solid fa-qrcode text-xs"></i>
         </button>`;

    const pdfBtn = item.datasheet
      ? `<a href="${item.datasheet}" target="_blank" title="Abrir Manual/PDF"
              class="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition inline-flex items-center justify-center">
           <i class="fa-solid fa-file-pdf"></i>
         </a>`
      : `<span class="text-slate-300 text-xs">—</span>`;

    const suppDisplay = Array.isArray(item.suppliers) && item.suppliers.length
      ? item.suppliers[0] + (item.suppliers.length>1 ? ` <span class="text-slate-400 text-[10px]">+${item.suppliers.length-1}</span>` : '')
      : (item.supplier||'—');

    return `
      <tr class="${rowBg} transition border-b border-slate-100 group">
        <td class="py-3 px-3">
          <div class="flex items-center gap-2">
            ${photoHtml}
            <div>
              <div class="font-bold text-slate-800 text-sm leading-tight">${item.name}</div>
              <div class="text-[10px] text-slate-400 font-mono mt-0.5">SKU: ${item.sku||'N/A'}</div>
              ${item.notes?`<div class="text-[10px] text-slate-400 italic truncate max-w-[180px]">${item.notes}</div>`:''}
            </div>
          </div>
        </td>
        <td class="py-3 px-3">
          <span class="inline-block px-2 py-0.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 whitespace-nowrap">
            ${item.category||'—'}
          </span>
        </td>
        <td class="py-3 px-3 text-slate-600 text-xs font-mono whitespace-nowrap">
          <i class="fa-solid fa-location-dot text-slate-300 mr-1"></i>${item.location||'—'}
        </td>
        <td class="py-3 px-3 text-center">
          <div class="font-bold text-slate-800 text-base">${item.quantity}
            <span class="text-xs font-normal text-slate-400">${item.unit||'un'}</span>
          </div>
          <div class="text-[10px] text-slate-400 mb-0.5">Mín: ${item.minStock}</div>
          ${badge}${validBadge}
        </td>
        <td class="py-3 px-3 text-right">
          <div class="font-semibold text-slate-800 text-sm">
            R$ ${Number(item.price||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}
          </div>
          <div class="text-[10px] text-slate-400">
            Total: R$ ${((item.quantity||0)*(item.price||0)).toLocaleString('pt-BR',{minimumFractionDigits:2})}
          </div>
        </td>
        <td class="py-3 px-3 text-xs text-slate-500">${suppDisplay}</td>
        <td class="py-3 px-3 text-center">${qrHtml}</td>
        <td class="py-3 px-3 text-center">${pdfBtn}</td>
        <td class="py-3 px-3">
          <div class="flex items-center justify-center gap-1">
            <button onclick="openMovementModal('${item.id}','ENTRADA')" title="Dar Entrada"
              class="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition">
              <i class="fa-solid fa-plus text-xs"></i>
            </button>
            <button onclick="openMovementModal('${item.id}','BAIXA')" title="Dar Baixa / OS"
              class="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition">
              <i class="fa-solid fa-minus text-xs"></i>
            </button>
            <button onclick="editItem('${item.id}')" title="Editar"
              class="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-600 transition">
              <i class="fa-solid fa-pen text-xs"></i>
            </button>
            <button onclick="deleteItem('${item.id}')" title="Excluir"
              class="p-1.5 rounded-lg bg-slate-100 text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition">
              <i class="fa-solid fa-trash text-xs"></i>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════════
//  FOTO DA PEÇA
// ══════════════════════════════════════════════════════════════
function showPhotoModal(id) {
  const item = state.items.find(i => i.id===id);
  if (!item?.photo) return;
  document.getElementById('photo-modal-img').src        = item.photo;
  document.getElementById('photo-modal-name').innerText = item.name;
  document.getElementById('modal-photo').classList.remove('hidden');
}

function closePhotoModal() {
  document.getElementById('modal-photo').classList.add('hidden');
}

function triggerPhotoUpload(itemId) {
  const input  = document.createElement('input');
  input.type   = 'file';
  input.accept = 'image/*';
  input.onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    // Comprime para max 600px antes de salvar
    const reader = new FileReader();
    reader.onload = async ev => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const max    = 600;
        let   w = img.width, h = img.height;
        if (w > max) { h = Math.round(h*max/w); w = max; }
        if (h > max) { w = Math.round(w*max/h); h = max; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img,0,0,w,h);
        const base64 = canvas.toDataURL('image/jpeg', 0.82);
        const item   = state.items.find(i => i.id===itemId);
        if (item) item.photo = base64;
        await fbSaveItemPhoto(itemId, base64);
        renderInventoryTable();
        showToast('📷 Foto salva!');
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

// ══════════════════════════════════════════════════════════════
//  QR CODE
// ══════════════════════════════════════════════════════════════
async function generateAndSaveQr(item) {
  return new Promise(resolve => {
    const tmp         = document.createElement('div');
    tmp.style.position = 'absolute';
    tmp.style.left    = '-9999px';
    document.body.appendChild(tmp);
    new QRCode(tmp, { text: item.sku||item.id, width:200, height:200 });
    setTimeout(async () => {
      const canvas = tmp.querySelector('canvas');
      const img    = tmp.querySelector('img');
      let   base64 = '';
      if (canvas)    base64 = canvas.toDataURL('image/png');
      else if (img)  base64 = img.src;
      document.body.removeChild(tmp);
      if (base64 && db) {
        item.qrCode = base64;
        await db.collection('items').doc(item.id).update({ qrCode: base64 });
      }
      resolve(base64);
    }, 350);
  });
}

function showQrModal(id) {
  const item = state.items.find(i => i.id===id);
  if (!item) return;
  document.getElementById('qr-modal-name').innerText = item.name;
  document.getElementById('qr-modal-sku').innerText  = `SKU: ${item.sku||item.id}`;
  document.getElementById('qr-modal-loc').innerText  = `LOC: ${item.location||'—'}`;
  const container     = document.getElementById('qr-container');
  container.innerHTML = '';
  if (item.qrCode) {
    const img     = document.createElement('img');
    img.src       = item.qrCode;
    img.className = 'w-36 h-36 object-contain';
    container.appendChild(img);
  } else {
    new QRCode(container, { text: item.sku||item.id, width:140, height:140 });
  }
  document.getElementById('modal-qr').classList.remove('hidden');
}

function closeQrModal() { document.getElementById('modal-qr').classList.add('hidden'); }

// ══════════════════════════════════════════════════════════════
//  REPOSIÇÃO
// ══════════════════════════════════════════════════════════════
function renderRestockTable() {
  const tbody = document.getElementById('restock-tbody');
  if (!tbody) return;
  const critical = state.items.filter(i => (i.quantity||0) <= (i.minStock||0));
  const totalCost = critical.reduce((s,item) => {
    const sug = Math.max((item.minStock*2)-item.quantity, 1);
    return s + sug*(item.price||0);
  }, 0);

  setEl('restock-total-cost', `R$ ${totalCost.toLocaleString('pt-BR',{minimumFractionDigits:2})}`);
  setEl('restock-count', critical.length);

  if (!critical.length) {
    tbody.innerHTML = `
      <tr><td colspan="7" class="py-10 text-center">
        <i class="fa-solid fa-circle-check text-3xl text-emerald-400 mb-2 block"></i>
        <p class="text-slate-400 text-sm">Todos os itens estão em níveis seguros!</p>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = critical.map(item => {
    const suggested = Math.max((item.minStock*2)-item.quantity, 1);
    const cost      = suggested*(item.price||0);
    const suppliers = Array.isArray(item.suppliers) ? item.suppliers : (item.supplier?[item.supplier]:[]);
    return `
      <tr class="hover:bg-slate-50 transition border-b border-slate-100">
        <td class="py-3 px-4">
          <div class="font-bold text-slate-800">${item.name}</div>
          <div class="text-xs text-slate-400 font-mono">SKU: ${item.sku||'—'}</div>
        </td>
        <td class="py-3 px-4 text-xs text-slate-600">
          ${suppliers.length ? suppliers.join('<br>') : '<span class="text-slate-400">Não informado</span>'}
        </td>
        <td class="py-3 px-4 text-center">
          <span class="font-bold text-rose-600 text-base">${item.quantity}</span>
          <span class="text-xs text-slate-400"> ${item.unit||'un'}</span>
        </td>
        <td class="py-3 px-4 text-center text-slate-500 text-sm">${item.minStock} ${item.unit||'un'}</td>
        <td class="py-3 px-4 text-center">
          <span class="px-3 py-1 bg-brand-50 text-brand-700 font-bold rounded-lg border border-brand-200 text-sm">
            + ${suggested} ${item.unit||'un'}
          </span>
        </td>
        <td class="py-3 px-4 text-right font-bold text-slate-800">
          R$ ${cost.toLocaleString('pt-BR',{minimumFractionDigits:2})}
        </td>
        <td class="py-3 px-4 text-center">
          <button onclick="openMovementModal('${item.id}','ENTRADA')"
            class="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition">
            <i class="fa-solid fa-plus mr-1"></i>Registrar Entrada
          </button>
        </td>
      </tr>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════════
//  CRUD DE ITENS
// ══════════════════════════════════════════════════════════════
function openItemModal() {
  document.getElementById('form-item').reset();
  document.getElementById('item-id').value              = '';
  document.getElementById('modal-item-title').innerText = 'Cadastrar Nova Peça / Material';
  document.getElementById('suppliers-list').innerHTML   = '';
  renderCategories();
  document.getElementById('modal-item').classList.remove('hidden');
  setTimeout(() => document.getElementById('item-name').focus(), 80);
}

function editItem(id) {
  const item = state.items.find(i => i.id===id);
  if (!item) return;

  document.getElementById('item-id').value             = item.id;
  document.getElementById('item-name').value           = item.name         || '';
  document.getElementById('item-sku').value            = item.sku          || '';
  document.getElementById('item-unit').value           = item.unit         || 'un';
  document.getElementById('item-quantity').value       = item.quantity     ?? 0;
  document.getElementById('item-min-stock').value      = item.minStock     ?? 0;
  document.getElementById('item-price').value          = item.price        || 0;
  document.getElementById('item-datasheet').value      = item.datasheet    || '';
  document.getElementById('item-purchase-date').value  = item.purchaseDate || '';
  document.getElementById('item-arrival-date').value   = item.arrivalDate  || '';
  document.getElementById('item-expiry-date').value    = item.expiryDate   || '';
  document.getElementById('item-notes').value          = item.notes        || '';

  const parts = (item.location||'').split('/').map(p=>p.trim());
  document.getElementById('loc-corridor').value = parts[0]||'';
  document.getElementById('loc-shelf').value    = parts[1]||'';
  document.getElementById('loc-level').value    = parts[2]||'';
  document.getElementById('loc-bin').value      = parts[3]||'';

  const supList   = document.getElementById('suppliers-list');
  supList.innerHTML = '';
  const suppliers = Array.isArray(item.suppliers)?item.suppliers:(item.supplier?[item.supplier]:[]);
  suppliers.forEach(s => addSupplierTag(s));

  renderCategories();
  setTimeout(() => {
    const sel = document.getElementById('item-category');
    if (sel) sel.value = item.category||'';
  }, 80);

  document.getElementById('modal-item-title').innerText = `Editar: ${item.name}`;
  document.getElementById('modal-item').classList.remove('hidden');
}

function closeItemModal() { document.getElementById('modal-item').classList.add('hidden'); }

function addSupplierTag(name) {
  const val = typeof name==='string' ? name : (document.getElementById('supplier-input')?.value||'').trim();
  if (!val) return;
  const list = document.getElementById('suppliers-list');
  if ([...list.querySelectorAll('[data-supplier]')].some(el=>el.dataset.supplier.toLowerCase()===val.toLowerCase())) return;
  const tag         = document.createElement('div');
  tag.className     = 'flex items-center gap-1 bg-slate-100 border border-slate-300 px-2 py-1 rounded-lg text-xs';
  tag.dataset.supplier = val;
  tag.innerHTML     = `
    <span class="text-slate-700 font-medium">${val}</span>
    <button type="button" onclick="this.parentElement.remove()"
      class="text-slate-400 hover:text-rose-500 ml-1 transition">
      <i class="fa-solid fa-xmark"></i>
    </button>`;
  list.appendChild(tag);
  const inp = document.getElementById('supplier-input');
  if (inp) inp.value = '';
}

function getSupplierTags() {
  return [...document.querySelectorAll('#suppliers-list [data-supplier]')]
    .map(el => el.dataset.supplier);
}

async function saveItem(e) {
  e.preventDefault();
  const id    = document.getElementById('item-id').value || 'item-'+Date.now();
  const isNew = !state.items.find(i => i.id===id);

  const location = [
    document.getElementById('loc-corridor').value.trim(),
    document.getElementById('loc-shelf').value.trim(),
    document.getElementById('loc-level').value.trim(),
    document.getElementById('loc-bin').value.trim()
  ].filter(Boolean).join(' / ') || 'Almoxarifado Geral';

  const qty       = parseInt(document.getElementById('item-quantity').value) || 0;
  const suppliers = getSupplierTags();

  const item = {
    id,
    name:         document.getElementById('item-name').value.trim(),
    sku:          document.getElementById('item-sku').value.trim(),
    category:     document.getElementById('item-category').value,
    unit:         document.getElementById('item-unit').value,
    location,
    quantity:     qty,
    minStock:     parseInt(document.getElementById('item-min-stock').value)  || 0,
    price:        parseFloat(document.getElementById('item-price').value)    || 0,
    suppliers,
    supplier:     suppliers[0] || '',
    datasheet:    document.getElementById('item-datasheet').value.trim(),
    purchaseDate: document.getElementById('item-purchase-date').value,
    arrivalDate:  document.getElementById('item-arrival-date').value,
    expiryDate:   document.getElementById('item-expiry-date').value,
    notes:        document.getElementById('item-notes').value.trim(),
    photo:        state.items.find(i=>i.id===id)?.photo  || '',
    qrCode:       state.items.find(i=>i.id===id)?.qrCode || ''
  };

  requireOperator(async operator => {
    if (isNew && qty > 0) {
      await fbSaveHistory({
        date:       formatDate(new Date()),
        type:       'ENTRADA',
        itemName:   item.name,
        unit:       item.unit,
        quantity:   qty,
        unitPrice:  item.price,
        os: '', equipment: '',
        target:     suppliers[0]||'Cadastro inicial',
        technician: operator,
        reason:     'Saldo inicial ao cadastrar'
      });
    }

    const idx = state.items.findIndex(i=>i.id===id);
    if (idx>=0) state.items[idx] = item;
    else state.items.push(item);

    await fbSaveItem(item);
    closeItemModal();
    showToast(isNew ? '⏳ Salvando QR Code...' : '✅ Peça atualizada!');

    await generateAndSaveQr(item);
    renderDashboard();
    renderInventoryTable();
    renderRestockTable();

    if (isNew) {
      showToast('✅ Peça cadastrada! QR Code gerado.');
      setTimeout(() => showQrModal(item.id), 400);
    }
  });
}

async function deleteItem(id) {
  const item = state.items.find(i=>i.id===id);
  if (!item) return;
  if (!confirm(`⚠️ Excluir "${item.name}"?\nEsta ação não pode ser desfeita.`)) return;

  requireOperator(async operator => {
    await fbSaveHistory({
      date:       formatDate(new Date()),
      type:       'EXCLUSÃO',
      itemName:   item.name,
      unit:       item.unit||'un',
      quantity:   item.quantity,
      unitPrice:  item.price||0,
      os:'', equipment:'', target:'',
      technician: operator,
      reason:     'Item excluído do sistema'
    });
    state.items = state.items.filter(i=>i.id!==id);
    await fbDeleteItem(id);
    renderDashboard();
    renderInventoryTable();
    renderRestockTable();
    showToast('🗑️ Item removido.');
  });
}

// ══════════════════════════════════════════════════════════════
//  MOVIMENTAÇÕES
// ══════════════════════════════════════════════════════════════
function openMovementModal(id, type) {
  const item = state.items.find(i=>i.id===id);
  if (!item) return;

  document.getElementById('movement-item-id').value         = item.id;
  document.getElementById('movement-type').value            = type;
  document.getElementById('movement-item-name').innerText   = item.name;
  document.getElementById('movement-current-qty').innerText = item.quantity;
  document.getElementById('movement-unit-label').innerText  = item.unit||'un';
  document.getElementById('movement-unit-badge').innerText  = item.unit||'un';
  document.getElementById('movement-technician').value      = state.operatorName||'';

  document.getElementById('form-movement').reset();
  document.getElementById('movement-item-id').value         = item.id;
  document.getElementById('movement-type').value            = type;
  document.getElementById('movement-qty').value             = 1;
  document.getElementById('movement-technician').value      = state.operatorName||'';
  document.getElementById('movement-current-qty').innerText = item.quantity;

  const header    = document.getElementById('modal-movement-header');
  const submitBtn = document.getElementById('movement-submit-btn');
  const baixaFlds = document.getElementById('baixa-fields');
  const entFlds   = document.getElementById('entrada-fields');

  if (type==='ENTRADA') {
    document.getElementById('modal-movement-title').innerText = '📥 Dar Entrada no Estoque';
    header.className    = 'px-6 py-4 bg-emerald-600 text-white flex justify-between items-center';
    submitBtn.className = 'px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition shadow';
    submitBtn.innerHTML = '<i class="fa-solid fa-plus mr-1"></i> Confirmar Entrada';
    baixaFlds.classList.add('hidden');
    entFlds.classList.remove('hidden');
    document.getElementById('movement-os').removeAttribute('required');
    document.getElementById('movement-equipment').removeAttribute('required');
  } else {
    document.getElementById('modal-movement-title').innerText = '📤 Dar Baixa / Ordem de Serviço';
    header.className    = 'px-6 py-4 bg-rose-600 text-white flex justify-between items-center';
    submitBtn.className = 'px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm transition shadow';
    submitBtn.innerHTML = '<i class="fa-solid fa-minus mr-1"></i> Confirmar Baixa';
    baixaFlds.classList.remove('hidden');
    entFlds.classList.add('hidden');
    document.getElementById('movement-os').setAttribute('required','true');
    document.getElementById('movement-equipment').setAttribute('required','true');
  }

  document.getElementById('modal-movement').classList.remove('hidden');
  setTimeout(() => document.getElementById('movement-qty').focus(), 80);
}

function closeMovementModal() { document.getElementById('modal-movement').classList.add('hidden'); }

async function saveMovement(e) {
  e.preventDefault();
  const itemId     = document.getElementById('movement-item-id').value;
  const type       = document.getElementById('movement-type').value;
  const qty        = parseInt(document.getElementById('movement-qty').value)||0;
  const os         = document.getElementById('movement-os').value.trim();
  const equipment  = document.getElementById('movement-equipment').value.trim();
  const target     = document.getElementById('movement-target').value.trim();
  const reason     = document.getElementById('movement-reason').value.trim();
  const technician = document.getElementById('movement-technician').value.trim();
  const item       = state.items.find(i=>i.id===itemId);

  if (!item)                                { showToast('Item não encontrado!','error'); return; }
  if (qty<=0)                               { showToast('Informe uma quantidade válida!','error'); return; }
  if (type==='BAIXA' && qty>item.quantity)  { showToast(`Estoque insuficiente! Disponível: ${item.quantity} ${item.unit||'un'}`, 'error'); return; }
  if (!technician)                          { showToast('Informe o responsável pela operação!','error'); return; }

  const previousQty = item.quantity;
  if (type==='ENTRADA') item.quantity += qty;
  else item.quantity -= qty;

  const log = {
    date:       formatDate(new Date()),
    type,
    itemName:   item.name,
    unit:       item.unit||'un',
    quantity:   qty,
    unitPrice:  item.price||0,
    os:         type==='BAIXA'?os:'',
    equipment:  type==='BAIXA'?equipment:'',
    target:     type==='ENTRADA'?target:'',
    technician,
    reason:     reason||'—'
  };

  const logId = await fbSaveHistory(log);
  await fbSaveItem(item);

  state.operatorName = technician;
  localStorage.setItem('operatorName', technician);
  updateOperatorBadge();

  state.undoStack.push({ type:'movement', itemId:item.id, prevQty:previousQty, logId });
  document.getElementById('undo-btn').classList.remove('hidden');

  closeMovementModal();
  renderDashboard();
  renderInventoryTable();
  renderRestockTable();
  renderHistoryTable();
  showToast(type==='ENTRADA' ? `✅ Entrada de ${qty} ${item.unit||'un'} registrada!` : `✅ Baixa de ${qty} ${item.unit||'un'} registrada!`);
}

async function undoLastAction() {
  const last = state.undoStack.pop();
  if (!last) return;
  if (last.type==='movement') {
    const item = state.items.find(i=>i.id===last.itemId);
    if (item) { item.quantity = last.prevQty; await fbSaveItem(item); }
    if (last.logId) await fbDeleteHistory(last.logId);
    renderDashboard();
    renderInventoryTable();
    renderRestockTable();
    renderHistoryTable();
    showToast('↩️ Última movimentação desfeita!');
  }
  if (!state.undoStack.length) document.getElementById('undo-btn').classList.add('hidden');
}

// ══════════════════════════════════════════════════════════════
//  HISTÓRICO
// ══════════════════════════════════════════════════════════════
function renderHistoryTable() {
  const tbody     = document.getElementById('history-tbody');
  const summaryEl = document.getElementById('history-summary');
  if (!tbody) return;

  const search = (document.getElementById('hist-search')?.value    ||'').toLowerCase();
  const month  =  document.getElementById('hist-month')?.value     ||'';
  const type   =  document.getElementById('hist-type')?.value      ||'ALL';
  const tech   = (document.getElementById('hist-technician')?.value||'').toLowerCase();

  const filtered = state.history.filter(h => {
    const matchSearch =
      (h.itemName ||'').toLowerCase().includes(search) ||
      (h.os       ||'').toLowerCase().includes(search) ||
      (h.equipment||'').toLowerCase().includes(search) ||
      (h.reason   ||'').toLowerCase().includes(search) ||
      (h.technician||'').toLowerCase().includes(search);
    const matchMonth = !month || (h.date||'').startsWith(month);
    const matchType  = type==='ALL' || h.type===type;
    const matchTech  = !tech || (h.technician||'').toLowerCase().includes(tech);
    return matchSearch && matchMonth && matchType && matchTech;
  });

  const total = filtered.reduce((s,h) => s+((h.quantity||0)*(h.unitPrice||0)), 0);
  if (summaryEl) {
    summaryEl.innerText =
      `${filtered.length} registro(s) · R$ ${total.toLocaleString('pt-BR',{minimumFractionDigits:2})}`;
  }

  if (!filtered.length) {
    tbody.innerHTML = `
      <tr><td colspan="8" class="py-10 text-center">
        <i class="fa-solid fa-inbox text-3xl text-slate-300 mb-2 block"></i>
        <p class="text-slate-400 text-sm">Nenhuma movimentação encontrada.</p>
      </td></tr>`;
    return;
  }

  const typeStyle = {
    ENTRADA:  { cls:'bg-emerald-100 text-emerald-700', label:'▲ ENTRADA' },
    BAIXA:    { cls:'bg-rose-100 text-rose-700',       label:'▼ BAIXA / OS' },
    EXCLUSÃO: { cls:'bg-slate-200 text-slate-600',     label:'✕ EXCLUÍDO' }
  };

  tbody.innerHTML = filtered.map(h => {
    const ts    = typeStyle[h.type] || { cls:'bg-slate-100 text-slate-500', label: h.type };
    const valor = (h.quantity||0)*(h.unitPrice||0);
    return `
      <tr class="hover:bg-slate-50 transition border-b border-slate-100">
        <td class="py-3 px-4 text-slate-500 text-xs font-mono whitespace-nowrap">${h.date||'—'}</td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded-full text-xs font-bold ${ts.cls} whitespace-nowrap">
            ${ts.label}
          </span>
        </td>
        <td class="py-3 px-4 font-bold text-slate-800 text-sm">${h.itemName||'—'}</td>
        <td class="py-3 px-4 text-center">
          <span class="font-bold text-slate-800">${h.quantity}</span>
          <span class="text-xs text-slate-400"> ${h.unit||'un'}</span>
        </td>
        <td class="py-3 px-4 text-emerald-700 font-semibold text-xs">
          R$ ${valor.toLocaleString('pt-BR',{minimumFractionDigits:2})}
        </td>
        <td class="py-3 px-4 text-slate-700 text-xs">
          ${h.os
            ? `<span class="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-mono font-bold">${h.os}</span>`
            : `<span class="text-slate-500">${h.target||'—'}</span>`}
        </td>
        <td class="py-3 px-4 text-slate-600 text-xs">${h.equipment||'—'}</td>
        <td class="py-3 px-4 text-xs">
          <div class="font-semibold text-slate-700">👤 ${h.technician||'—'}</div>
          <div class="text-[10px] text-slate-400 mt-0.5 italic">${h.reason||'—'}</div>
        </td>
      </tr>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════════
//  SCANNER
// ══════════════════════════════════════════════════════════════
function openScannerModal() {
  document.getElementById('scan-result-box').classList.add('hidden');
  document.getElementById('scan-item-detail').classList.add('hidden');
  document.getElementById('scan-again-btn')?.classList.add('hidden');
  document.getElementById('modal-scanner').classList.remove('hidden');

  if (!html5QrScanner) html5QrScanner = new Html5Qrcode('reader');

  html5QrScanner.start(
    { facingMode:'environment' },
    { fps:10, qrbox:{width:220,height:220} },
    decodedText => {
      const item = state.items.find(i =>
        (i.sku && i.sku.toLowerCase()===decodedText.toLowerCase()) || i.id===decodedText
      );
      if (item) {
        renderScanResult(item);
      } else {
        document.getElementById('scan-result-box').classList.remove('hidden');
        document.getElementById('scan-not-found-code').innerText = decodedText;
        document.getElementById('scan-item-detail').classList.add('hidden');
      }
    },
    () => {}
  ).catch(err => console.warn('Camera:', err));
}

function renderScanResult(item) {
  document.getElementById('scan-result-box')?.classList.add('hidden');

  const isLow = item.quantity <= item.minStock;
  const isOut = item.quantity === 0;
  let statusBadge = `<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">✅ Normal</span>`;
  if (isOut)      statusBadge = `<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-200 text-rose-800">⛔ Esgotado</span>`;
  else if (isLow) statusBadge = `<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-200 text-amber-800">⚠️ Estoque Baixo</span>`;

  const suppliers = Array.isArray(item.suppliers)&&item.suppliers.length
    ? item.suppliers.join(', ') : (item.supplier||'—');

  let validLine = '';
  if (item.expiryDate) {
    const days = Math.ceil((new Date(item.expiryDate)-new Date())/86400000);
    const cls  = days<=0?'text-rose-600 font-bold':days<=30?'text-amber-600 font-bold':'text-slate-600';
    validLine  = `
      <div class="flex justify-between">
        <span class="text-slate-400">Validade</span>
        <span class="${cls}">${item.expiryDate}${days<=0?' — Vencido':days<=30?` — ${days}d`:''}</span>
      </div>`;
  }

  document.getElementById('scan-item-detail').innerHTML = `
    <div class="flex items-center gap-3 mb-4">
      ${item.photo
        ? `<img src="${item.photo}" class="w-16 h-16 rounded-xl object-cover border border-slate-200 flex-shrink-0">`
        : `<div class="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-300 flex-shrink-0">
             <i class="fa-solid fa-image text-2xl"></i>
           </div>`}
      <div class="flex-1 min-w-0">
        <h4 class="font-bold text-slate-800 text-base leading-tight">${item.name}</h4>
        <p class="text-xs text-slate-400 font-mono mt-0.5">${item.sku||item.id}</p>
        <div class="mt-1.5">${statusBadge}</div>
      </div>
    </div>

    <div class="space-y-2 text-xs border-t border-slate-100 pt-3">
      <div class="flex justify-between items-center py-1 border-b border-slate-50">
        <span class="text-slate-400 font-medium">Quantidade</span>
        <span class="font-bold text-slate-800 text-sm">
          ${item.quantity} <span class="text-xs font-normal text-slate-400">${item.unit||'un'}</span>
          <span class="text-[10px] text-slate-400 ml-1">(Mín: ${item.minStock})</span>
        </span>
      </div>
      <div class="flex justify-between items-center py-1 border-b border-slate-50">
        <span class="text-slate-400 font-medium">Categoria</span>
        <span class="font-medium text-slate-700">${item.category||'—'}</span>
      </div>
      <div class="flex justify-between items-center py-1 border-b border-slate-50">
        <span class="text-slate-400 font-medium">Localização</span>
        <span class="font-mono text-slate-700 text-right max-w-[55%] truncate">${item.location||'—'}</span>
      </div>
      <div class="flex justify-between items-center py-1 border-b border-slate-50">
        <span class="text-slate-400 font-medium">Preço Un.</span>
        <span class="font-semibold text-emerald-700">R$ ${Number(item.price||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
      </div>
      <div class="flex justify-between items-center py-1 border-b border-slate-50">
        <span class="text-slate-400 font-medium">Valor em Estoque</span>
        <span class="font-bold text-emerald-700">R$ ${((item.quantity||0)*(item.price||0)).toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
      </div>
      <div class="flex justify-between items-center py-1 border-b border-slate-50">
        <span class="text-slate-400 font-medium">Fornecedor(es)</span>
        <span class="font-medium text-slate-700 text-right max-w-[55%]">${suppliers}</span>
      </div>
      ${validLine}
      ${item.notes?`
      <div class="flex justify-between items-start py-1">
        <span class="text-slate-400 font-medium">Obs.</span>
        <span class="text-slate-600 text-right max-w-[60%] italic">${item.notes}</span>
      </div>`:''}
    </div>

    <div class="flex gap-2 mt-4 pt-3 border-t border-slate-100">
      <button onclick="closeScannerModal(); openMovementModal('${item.id}','BAIXA')"
        class="flex-1 py-2.5 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 transition flex items-center justify-center gap-1">
        <i class="fa-solid fa-minus"></i> Dar Baixa
      </button>
      <button onclick="closeScannerModal(); openMovementModal('${item.id}','ENTRADA')"
        class="flex-1 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition flex items-center justify-center gap-1">
        <i class="fa-solid fa-plus"></i> Dar Entrada
      </button>
      <button onclick="closeScannerModal(); editItem('${item.id}')"
        class="px-3.5 py-2.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 transition"
        title="Editar peça">
        <i class="fa-solid fa-pen"></i>
      </button>
    </div>
  `;

  document.getElementById('scan-item-detail').classList.remove('hidden');
  document.getElementById('scan-again-btn')?.classList.remove('hidden');
  html5QrScanner?.pause();
}

function scanAgain() {
  document.getElementById('scan-item-detail').classList.add('hidden');
  document.getElementById('scan-result-box').classList.add('hidden');
  document.getElementById('scan-again-btn')?.classList.add('hidden');
  html5QrScanner?.resume();
}

function closeScannerModal() {
  const close = () => document.getElementById('modal-scanner').classList.add('hidden');
  if (html5QrScanner) html5QrScanner.stop().then(close).catch(close);
  else close();
}

// ══════════════════════════════════════════════════════════════
//  EXPORTAR
// ══════════════════════════════════════════════════════════════
function exportCSV() {
  const header = ['Nome','SKU','Categoria','Localização','Qtd','Un','Preço Un','Valor Total','Fornecedores','Validade','Notas'];
  const rows   = state.items.map(i => [
    i.name, i.sku, i.category, i.location,
    i.quantity, i.unit||'un',
    Number(i.price||0).toFixed(2),
    Number((i.quantity||0)*(i.price||0)).toFixed(2),
    Array.isArray(i.suppliers)?i.suppliers.join(' | '):(i.supplier||''),
    i.expiryDate||'', i.notes||''
  ]);
  downloadFile(
    [header,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n'),
    'estoque.csv','text/csv'
  );
  showToast('📊 Estoque CSV exportado!');
}

function exportHistoryCSV() {
  const header = ['Data','Tipo','Peça','Qtd','Un','Valor','OS','Equipamento','Responsável','Motivo'];
  const rows   = state.history.map(h => [
    h.date, h.type, h.itemName, h.quantity, h.unit||'un',
    Number((h.quantity||0)*(h.unitPrice||0)).toFixed(2),
    h.os||'', h.equipment||'', h.technician||'', h.reason||''
  ]);
  downloadFile(
    [header,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n'),
    'historico.csv','text/csv'
  );
  showToast('📊 Histórico CSV exportado!');
}

function exportPDF() { window.print(); }

function downloadFile(content, filename, type) {
  const blob = new Blob(['\ufeff'+content],{type});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════════════════════
//  CONFIGURAÇÕES
// ══════════════════════════════════════════════════════════════
function openConfigModal() {
  const cur = document.querySelector('[data-app-name]')?.innerText||'StockMaster Pro';
  document.getElementById('config-app-name').value    = cur;
  document.getElementById('config-admin-email').value = '';
  fbLoadConfig('adminEmail').then(v => {
    if (v) document.getElementById('config-admin-email').value = v;
  });
  document.getElementById('modal-config').classList.remove('hidden');
}

function closeConfigModal() { document.getElementById('modal-config').classList.add('hidden'); }

async function saveAppConfig(e) {
  e.preventDefault();
  const name  = document.getElementById('config-app-name').value.trim();
  const email = document.getElementById('config-admin-email').value.trim();
  if (name)  { applyAppName(name);  await fbSaveConfig('appName',name); }
  if (email) { await fbSaveConfig('adminEmail',email); }
  closeConfigModal();
  showToast('✅ Configurações salvas!');
}

// ══════════════════════════════════════════════════════════════
//  ATALHOS DE TECLADO
// ══════════════════════════════════════════════════════════════
document.addEventListener('keydown', e => {
  if (e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT') return;
  const modals = ['modal-item','modal-movement','modal-qr','modal-scanner',
                  'modal-category','modal-config','modal-photo','modal-operator','modal-quick-category'];
  if (e.key==='Escape') modals.forEach(id => document.getElementById(id)?.classList.add('hidden'));
if (e.key==='n'||e.key==='N') openItemModal();
if (e.key==='h'||e.key==='H') switchTab('history');
if (e.key==='d'||e.key==='D') switchTab('dashboard');
if (e.key==='e'||e.key==='E') switchTab('inventory');
if (e.key==='r'||e.key==='R') switchTab('restock');
if (e.key==='f'||e.key==='F') switchTab('financial');
if (e.key==='m'||e.key==='M') switchTab('movements');

});

document.addEventListener('click', e => {
  ['modal-item','modal-movement','modal-qr','modal-scanner',
   'modal-category','modal-config','modal-photo','modal-operator','modal-quick-category'].forEach(id => {
    const modal = document.getElementById(id);
    if (modal && e.target===modal) modal.classList.add('hidden');
  });
});

// ══════════════════════════════════════════════════════════════
//  UTILITÁRIOS
// ══════════════════════════════════════════════════════════════
function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.innerText = val;
}

function formatDate(d) {
  return d.toLocaleDateString('pt-BR') + ' ' +
    d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
}

function showToast(msg, type='success') {
  let toast = document.getElementById('toast-notification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-notification';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = [
    'fixed bottom-6 right-6 z-[999] px-5 py-3 rounded-xl text-sm font-semibold shadow-xl',
    'transition-all duration-300 pointer-events-none',
    type==='error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
  ].join(' ');
  toast.style.opacity   = '1';
  toast.style.transform = 'translateY(0)';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.opacity   = '0';
    toast.style.transform = 'translateY(1rem)';
  }, 3500);
}
// ══════════════════════════════════════════════════════════════
//  MENU MOBILE
// ══════════════════════════════════════════════════════════════
function toggleMobileMenu() {
    document.getElementById('mobile-sidebar').classList.toggle('open');
    document.getElementById('mobile-menu-overlay').classList.toggle('open');
}

function closeMobileMenu() {
    document.getElementById('mobile-sidebar').classList.remove('open');
    document.getElementById('mobile-menu-overlay').classList.remove('open');
}

// Destaca botão ativo na barra inferior
function updateMobileBottomNav(tabName) {
    const map = {
        dashboard: 'mob-nav-dashboard',
        inventory: 'mob-nav-inventory',
        movements: 'mob-nav-movements',
        history:   'mob-nav-history'
    };
    document.querySelectorAll('.mob-nav-btn').forEach(btn => {
        btn.classList.remove('text-brand-400','text-amber-400','text-white');
        btn.classList.add('text-slate-400');
    });
    const activeId = map[tabName];
    if (activeId) {
        const btn = document.getElementById(activeId);
        if (btn) {
            btn.classList.remove('text-slate-400');
            btn.classList.add(tabName === 'movements' ? 'text-amber-400' : 'text-brand-400');
        }
    }
}

// ══════════════════════════════════════════════════════════════
//  ABA MOVIMENTAÇÕES — Busca rápida + Baixa + Entrada
// ══════════════════════════════════════════════════════════════

let movSelectedItem = null; // item atualmente selecionado na aba

// ── Abre a aba e reseta estado ─────────────────────────────────
function openMovimentacoesTab() {
  switchTab('movements');
  movClearSelection();
}

function movClearSelection() {
  movSelectedItem = null;
  document.getElementById('mov-item-card').classList.add('hidden');
  document.getElementById('mov-baixa-form').classList.add('hidden');
  document.getElementById('mov-entrada-form').classList.add('hidden');
  document.getElementById('mov-search-input').value = '';
  document.getElementById('mov-search-results').innerHTML = '';
  document.getElementById('mov-search-results').classList.add('hidden');
  document.getElementById('mov-empty-state').classList.remove('hidden');
  // Para scanner se estiver rodando
  movStopScanner();
}

// ══════════════════════════════════════════════════════════════
//  BUSCA DE ITEM
// ══════════════════════════════════════════════════════════════
function movSearchItems() {
  const q       = (document.getElementById('mov-search-input').value || '').trim().toLowerCase();
  const results = document.getElementById('mov-search-results');
  const empty   = document.getElementById('mov-empty-state');

  if (!q) {
    results.innerHTML = '';
    results.classList.add('hidden');
    if (!movSelectedItem) empty.classList.remove('hidden');
    return;
  }

  const found = state.items.filter(i =>
    (i.name     || '').toLowerCase().includes(q) ||
    (i.sku      || '').toLowerCase().includes(q) ||
    (i.location || '').toLowerCase().includes(q) ||
    (i.supplier || '').toLowerCase().includes(q) ||
    (Array.isArray(i.suppliers) && i.suppliers.some(s => s.toLowerCase().includes(q)))
  );

  if (!found.length) {
    results.innerHTML = `
      <div class="p-4 text-center text-slate-400 text-sm">
        <i class="fa-solid fa-circle-xmark text-2xl mb-2 block text-slate-300"></i>
        Nenhum item encontrado para "<strong>${q}</strong>"
      </div>`;
    results.classList.remove('hidden');
    empty.classList.add('hidden');
    return;
  }

  results.innerHTML = found.map(item => {
    const isLow = item.quantity <= item.minStock;
    const isOut = item.quantity === 0;
    let badge = `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">OK</span>`;
    if (isOut)      badge = `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-200 text-rose-800">Esgotado</span>`;
    else if (isLow) badge = `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-800">Baixo</span>`;

    return `
      <button onclick="movSelectItem('${item.id}')"
        class="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-brand-50 transition border-b border-slate-100 last:border-0">
        ${item.photo
          ? `<img src="${item.photo}" class="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-slate-200">`
          : `<div class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
               <i class="fa-solid fa-gear text-slate-400 text-sm"></i>
             </div>`}
        <div class="flex-1 min-w-0">
          <p class="font-bold text-slate-800 text-sm truncate">${item.name}</p>
          <p class="text-[10px] text-slate-400 font-mono">${item.sku || '—'} · ${item.location || '—'}</p>
        </div>
        <div class="flex flex-col items-end gap-1 flex-shrink-0">
          ${badge}
          <span class="text-xs font-bold text-slate-700">${item.quantity} ${item.unit || 'un'}</span>
        </div>
      </button>`;
  }).join('');

  results.classList.remove('hidden');
  empty.classList.add('hidden');
}

// ── Seleciona item e exibe card completo ──────────────────────
function movSelectItem(id) {
  const item = state.items.find(i => i.id === id);
  if (!item) return;

  movSelectedItem = item;

  // Esconde busca, exibe card
  document.getElementById('mov-search-results').classList.add('hidden');
  document.getElementById('mov-empty-state').classList.add('hidden');
  document.getElementById('mov-search-input').value = item.name;

  movRenderCard(item);
  document.getElementById('mov-item-card').classList.remove('hidden');
  document.getElementById('mov-baixa-form').classList.add('hidden');
  document.getElementById('mov-entrada-form').classList.add('hidden');
}

function movRenderCard(item) {
  const isLow = item.quantity <= item.minStock;
  const isOut = item.quantity === 0;

  let statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">✅ Estoque Normal</span>`;
  if (isOut)      statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-200 text-rose-800 border border-rose-300">⛔ Esgotado</span>`;
  else if (isLow) statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-200 text-amber-800 border border-amber-300">⚠️ Estoque Baixo</span>`;

  const suppliers = Array.isArray(item.suppliers) && item.suppliers.length
    ? item.suppliers : (item.supplier ? [item.supplier] : []);

  let validLine = '';
  if (item.expiryDate) {
    const days = Math.ceil((new Date(item.expiryDate) - new Date()) / 86400000);
    const cls  = days <= 0 ? 'text-rose-600 font-bold' : days <= 30 ? 'text-amber-600 font-bold' : 'text-slate-600';
    validLine  = `
      <div class="flex justify-between py-1.5 border-b border-slate-100">
        <span class="text-slate-500 text-xs">Validade</span>
        <span class="text-xs ${cls}">${item.expiryDate}${days<=0?' — Vencido':days<=30?` — ${days}d`:''}</span>
      </div>`;
  }

  const qrHtml = item.qrCode
    ? `<img src="${item.qrCode}" class="w-14 h-14 rounded-lg border border-slate-200 cursor-pointer hover:scale-110 transition" onclick="showQrModal('${item.id}')" title="Ver QR Code">`
    : `<div class="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center cursor-pointer hover:bg-slate-200 transition" onclick="showQrModal('${item.id}')" title="Gerar QR Code">
         <i class="fa-solid fa-qrcode text-slate-400 text-xl"></i>
       </div>`;

  document.getElementById('mov-item-card-content').innerHTML = `
    <!-- Topo: foto + nome + status -->
    <div class="flex items-start gap-4 mb-4">
      ${item.photo
        ? `<img src="${item.photo}" class="w-20 h-20 rounded-2xl object-cover border border-slate-200 flex-shrink-0 shadow-sm">`
        : `<div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center flex-shrink-0">
             <i class="fa-solid fa-gear text-slate-400 text-3xl"></i>
           </div>`}
      <div class="flex-1 min-w-0">
        <h3 class="font-bold text-slate-900 text-lg leading-tight">${item.name}</h3>
        <p class="text-xs text-slate-400 font-mono mt-0.5">${item.sku || '—'}</p>
        <div class="mt-2">${statusBadge}</div>
      </div>
      <div class="flex-shrink-0">${qrHtml}</div>
    </div>

    <!-- Grid de dados -->
    <div class="grid grid-cols-2 gap-x-6 gap-y-0 text-sm border-t border-slate-100 pt-3 mb-4">
      <div class="flex justify-between py-1.5 border-b border-slate-100 col-span-2 sm:col-span-1">
        <span class="text-slate-500 text-xs">Quantidade</span>
        <span class="font-bold text-slate-900 text-base" id="mov-card-qty">
          ${item.quantity}
          <span class="text-xs font-normal text-slate-400">${item.unit || 'un'}</span>
        </span>
      </div>
      <div class="flex justify-between py-1.5 border-b border-slate-100 col-span-2 sm:col-span-1">
        <span class="text-slate-500 text-xs">Estoque mínimo</span>
        <span class="text-xs font-semibold text-slate-700">${item.minStock} ${item.unit || 'un'}</span>
      </div>
      <div class="flex justify-between py-1.5 border-b border-slate-100 col-span-2 sm:col-span-1">
        <span class="text-slate-500 text-xs">Categoria</span>
        <span class="text-xs font-semibold text-slate-700">${item.category || '—'}</span>
      </div>
      <div class="flex justify-between py-1.5 border-b border-slate-100 col-span-2 sm:col-span-1">
        <span class="text-slate-500 text-xs">Localização</span>
        <span class="text-xs font-mono text-slate-700">${item.location || '—'}</span>
      </div>
      <div class="flex justify-between py-1.5 border-b border-slate-100 col-span-2 sm:col-span-1">
        <span class="text-slate-500 text-xs">Preço unitário</span>
        <span class="text-xs font-semibold text-emerald-700">R$ ${Number(item.price||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
      </div>
      <div class="flex justify-between py-1.5 border-b border-slate-100 col-span-2 sm:col-span-1">
        <span class="text-slate-500 text-xs">Valor em estoque</span>
        <span class="text-xs font-bold text-emerald-700">
          R$ ${((item.quantity||0)*(item.price||0)).toLocaleString('pt-BR',{minimumFractionDigits:2})}
        </span>
      </div>
      ${validLine}
      ${suppliers.length ? `
      <div class="flex justify-between py-1.5 border-b border-slate-100 col-span-2">
        <span class="text-slate-500 text-xs">Fornecedor(es)</span>
        <span class="text-xs font-semibold text-slate-700 text-right max-w-[60%]">
          ${suppliers.join('<br>')}
        </span>
      </div>` : ''}
      ${item.notes ? `
      <div class="flex justify-between py-1.5 col-span-2">
        <span class="text-slate-500 text-xs">Obs.</span>
        <span class="text-xs italic text-slate-600 text-right max-w-[65%]">${item.notes}</span>
      </div>` : ''}
    </div>

    <!-- Botões de ação -->
    <div class="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
      <button onclick="movOpenBaixa()"
        ${isOut ? 'disabled title="Sem estoque disponível"' : ''}
        class="flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition
          ${isOut
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
            : 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/20 active:scale-95'}">
        <i class="fa-solid fa-minus-circle text-base"></i>
        Dar Baixa / OS
      </button>
      <button onclick="movOpenEntrada()"
        class="flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700
               text-white font-bold text-sm shadow-md shadow-emerald-500/20 transition active:scale-95">
        <i class="fa-solid fa-plus-circle text-base"></i>
        Dar Entrada
      </button>
    </div>
  `;
}

// ══════════════════════════════════════════════════════════════
//  FORMULÁRIO DE BAIXA
// ══════════════════════════════════════════════════════════════
function movOpenBaixa() {
  if (!movSelectedItem) return;
  document.getElementById('mov-entrada-form').classList.add('hidden');
  document.getElementById('mov-baixa-os').value         = '';
  document.getElementById('mov-baixa-equipment').value  = '';
  document.getElementById('mov-baixa-qty').value        = 1;
  document.getElementById('mov-baixa-qty').max          = movSelectedItem.quantity;
  document.getElementById('mov-baixa-tech').value       = state.operatorName || '';
  document.getElementById('mov-baixa-reason').value     = '';
  document.getElementById('mov-baixa-unit').innerText   = movSelectedItem.unit || 'un';
  document.getElementById('mov-baixa-max').innerText    = `Máx: ${movSelectedItem.quantity} ${movSelectedItem.unit||'un'}`;
  document.getElementById('mov-baixa-form').classList.remove('hidden');
  setTimeout(() => document.getElementById('mov-baixa-qty').focus(), 80);
  document.getElementById('mov-baixa-form').scrollIntoView({ behavior:'smooth', block:'nearest' });
}

async function movConfirmBaixa(e) {
  e.preventDefault();
  if (!movSelectedItem) return;

  const qty       = parseInt(document.getElementById('mov-baixa-qty').value) || 0;
  const os        = document.getElementById('mov-baixa-os').value.trim();
  const equipment = document.getElementById('mov-baixa-equipment').value.trim();
  const tech      = document.getElementById('mov-baixa-tech').value.trim();
  const reason    = document.getElementById('mov-baixa-reason').value.trim();

  if (qty <= 0)                                         { showToast('Informe a quantidade!', 'error'); return; }
  if (qty > movSelectedItem.quantity)                   { showToast(`Estoque insuficiente! Disponível: ${movSelectedItem.quantity} ${movSelectedItem.unit||'un'}`, 'error'); return; }
  if (!os)                                              { showToast('Informe o número da OS!', 'error'); return; }
  if (!equipment)                                       { showToast('Informe o equipamento / destino!', 'error'); return; }
  if (!tech)                                            { showToast('Informe o responsável!', 'error'); return; }

  const btn = document.getElementById('mov-baixa-submit');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Registrando...';

  try {
    movSelectedItem.quantity -= qty;

    const log = {
      date:       formatDate(new Date()),
      type:       'BAIXA',
      itemName:   movSelectedItem.name,
      unit:       movSelectedItem.unit || 'un',
      quantity:   qty,
      unitPrice:  movSelectedItem.price || 0,
      os,
      equipment,
      target:     '',
      technician: tech,
      reason:     reason || '—'
    };

    await fbSaveHistory(log);
    await fbSaveItem(movSelectedItem);

    state.operatorName = tech;
    localStorage.setItem('operatorName', tech);
    updateOperatorBadge();

    // Atualiza card sem desselecionar
    movRenderCard(movSelectedItem);
    document.getElementById('mov-baixa-form').classList.add('hidden');

    renderDashboard();
    renderInventoryTable();
    renderRestockTable();
    renderHistoryTable();

    showToast(`✅ Baixa de ${qty} ${movSelectedItem.unit||'un'} registrada! OS: ${os}`);

  } catch (err) {
    console.error(err);
    movSelectedItem.quantity += qty; // rollback local
    showToast('❌ Erro ao registrar baixa. Tente novamente.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check mr-1"></i> Confirmar Baixa';
  }
}

// ══════════════════════════════════════════════════════════════
//  FORMULÁRIO DE ENTRADA
// ══════════════════════════════════════════════════════════════
function movOpenEntrada() {
  if (!movSelectedItem) return;
  document.getElementById('mov-baixa-form').classList.add('hidden');

  const suppliers = Array.isArray(movSelectedItem.suppliers) && movSelectedItem.suppliers.length
    ? movSelectedItem.suppliers : (movSelectedItem.supplier ? [movSelectedItem.supplier] : []);

  // Preenche select de fornecedores cadastrados
  const sel = document.getElementById('mov-entrada-supplier-sel');
  sel.innerHTML = `<option value="">Selecionar fornecedor existente...</option>` +
    suppliers.map(s => `<option value="${s}">${s}</option>`).join('') +
    `<option value="__outro__">+ Outro fornecedor</option>`;

  document.getElementById('mov-entrada-supplier-custom').classList.add('hidden');
  document.getElementById('mov-entrada-supplier-custom').value = '';
  document.getElementById('mov-entrada-qty').value   = 1;
  document.getElementById('mov-entrada-nf').value    = '';
  document.getElementById('mov-entrada-tech').value  = state.operatorName || '';
  document.getElementById('mov-entrada-reason').value= '';
  document.getElementById('mov-entrada-unit').innerText = movSelectedItem.unit || 'un';

  document.getElementById('mov-entrada-form').classList.remove('hidden');
  setTimeout(() => document.getElementById('mov-entrada-qty').focus(), 80);
  document.getElementById('mov-entrada-form').scrollIntoView({ behavior:'smooth', block:'nearest' });
}

function movEntradaSupplierChange() {
  const sel    = document.getElementById('mov-entrada-supplier-sel');
  const custom = document.getElementById('mov-entrada-supplier-custom');
  if (sel.value === '__outro__') {
    custom.classList.remove('hidden');
    custom.focus();
  } else {
    custom.classList.add('hidden');
    custom.value = '';
  }
}

async function movConfirmEntrada(e) {
  e.preventDefault();
  if (!movSelectedItem) return;

  const qty     = parseInt(document.getElementById('mov-entrada-qty').value) || 0;
  const selVal  = document.getElementById('mov-entrada-supplier-sel').value;
  const supplier= selVal === '__outro__'
    ? document.getElementById('mov-entrada-supplier-custom').value.trim()
    : selVal;
  const nf      = document.getElementById('mov-entrada-nf').value.trim();
  const tech    = document.getElementById('mov-entrada-tech').value.trim();
  const reason  = document.getElementById('mov-entrada-reason').value.trim();

  if (qty <= 0)    { showToast('Informe a quantidade!', 'error'); return; }
  if (!tech)       { showToast('Informe o responsável!', 'error'); return; }

  const btn = document.getElementById('mov-entrada-submit');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Registrando...';

  try {
    movSelectedItem.quantity += qty;

    // Se fornecedor novo, adiciona à lista do item
    if (supplier && !['', '__outro__'].includes(supplier)) {
      if (!Array.isArray(movSelectedItem.suppliers)) movSelectedItem.suppliers = [];
      if (!movSelectedItem.suppliers.includes(supplier)) {
        movSelectedItem.suppliers.push(supplier);
        movSelectedItem.supplier = movSelectedItem.suppliers[0];
      }
    }

    const log = {
      date:       formatDate(new Date()),
      type:       'ENTRADA',
      itemName:   movSelectedItem.name,
      unit:       movSelectedItem.unit || 'un',
      quantity:   qty,
      unitPrice:  movSelectedItem.price || 0,
      os:         '',
      equipment:  '',
      target:     supplier ? `${nf ? nf + ' — ' : ''}${supplier}` : (nf || '—'),
      technician: tech,
      reason:     reason || '—'
    };

    await fbSaveHistory(log);
    await fbSaveItem(movSelectedItem);

    state.operatorName = tech;
    localStorage.setItem('operatorName', tech);
    updateOperatorBadge();

    movRenderCard(movSelectedItem);
    document.getElementById('mov-entrada-form').classList.add('hidden');

    renderDashboard();
    renderInventoryTable();
    renderRestockTable();
    renderHistoryTable();

    showToast(`✅ Entrada de ${qty} ${movSelectedItem.unit||'un'} registrada!`);

  } catch (err) {
    console.error(err);
    movSelectedItem.quantity -= qty;
    showToast('❌ Erro ao registrar entrada. Tente novamente.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check mr-1"></i> Confirmar Entrada';
  }
}

// ══════════════════════════════════════════════════════════════
//  SCANNER NA ABA MOVIMENTAÇÕES
// ══════════════════════════════════════════════════════════════
let movScannerInstance = null;
let movScannerActive   = false;

function movToggleScanner() {
  if (movScannerActive) {
    movStopScanner();
  } else {
    movStartScanner();
  }
}

function movStartScanner() {
  const container = document.getElementById('mov-reader');
  const btn       = document.getElementById('mov-scanner-btn');

  container.classList.remove('hidden');
  btn.innerHTML   = '<i class="fa-solid fa-stop text-rose-400 mr-2"></i> Parar Scanner';
  btn.classList.replace('bg-slate-800', 'bg-slate-700');
  movScannerActive = true;

  if (!movScannerInstance) movScannerInstance = new Html5Qrcode('mov-reader');

  movScannerInstance.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: { width: 240, height: 240 } },
    decodedText => {
      const item = state.items.find(i =>
        (i.sku && i.sku.toLowerCase() === decodedText.toLowerCase()) ||
        i.id === decodedText
      );
      if (item) {
        movStopScanner();
        movSelectItem(item.id);
        showToast(`✅ Peça encontrada: ${item.name}`);
      } else {
        showToast(`⚠️ Código não encontrado: ${decodedText}`, 'error');
      }
    },
    () => {}
  ).catch(err => {
    console.warn('Scanner:', err);
    showToast('❌ Não foi possível acessar a câmera.', 'error');
    movStopScanner();
  });
}

function movStopScanner() {
  const btn = document.getElementById('mov-scanner-btn');
  if (!btn) return;

  if (movScannerInstance && movScannerActive) {
    movScannerInstance.stop().catch(() => {});
  }

  movScannerActive = false;
  document.getElementById('mov-reader')?.classList.add('hidden');
  if (btn) {
    btn.innerHTML = '<i class="fa-solid fa-camera mr-2"></i> Escanear QR Code';
    btn.classList.replace('bg-slate-700', 'bg-slate-800');
  }
}
