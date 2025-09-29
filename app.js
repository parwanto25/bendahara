// Aplikasi keuangan sederhana - penyimpanan di localStorage
const STORAGE_KEY = 'simple_finance_v1'

let state = {
  categories: [],
  transactions: []
}

const els = {
  balance: document.getElementById('balance'),
  totalIncome: document.getElementById('total-income'),
  totalExpense: document.getElementById('total-expense'),
  topCategory: document.getElementById('top-category'),
  categoriesList: document.getElementById('categories-list'),
  categoryForm: document.getElementById('category-form'),
  categoryName: document.getElementById('category-name'),
  transactionForm: document.getElementById('transaction-form'),
  type: document.getElementById('type'),
  amount: document.getElementById('amount'),
  categorySelect: document.getElementById('category-select'),
  desc: document.getElementById('desc'),
  date: document.getElementById('date'),
  expensePercentList: document.getElementById('expense-percent-list'),
  transactionsTableBody: document.querySelector('#transactions-table tbody'),
  chartCanvas: document.getElementById('expenseChart').getContext('2d')
}

let expenseChart = null

// Utils
const readStorage = () => {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) } catch(e){ return null }
}
const saveStorage = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state))

const formatCurrency = (n) => {
  const num = Number(n) || 0
  return 'Rp ' + num.toLocaleString('id-ID')
}

// Init default
const initState = () => {
  const fromStorage = readStorage()
  if (fromStorage) {
    state = fromStorage
  } else {
    state = {
      categories: ['Umum'],
      transactions: []
    }
    saveStorage()
  }
}

// Render functions
const renderCategories = () => {
  els.categoriesList.innerHTML = ''
  state.categories.forEach((c, idx) => {
    const li = document.createElement('li')
    li.innerHTML = `<span>${c}</span><span><button class="del-cat" data-idx="${idx}">Hapus</button></span>`
    els.categoriesList.appendChild(li)
  })
  // populate select
  els.categorySelect.innerHTML = ''
  state.categories.forEach(c => {
    const opt = document.createElement('option')
    opt.value = c
    opt.textContent = c
    els.categorySelect.appendChild(opt)
  })
}

const renderTransactions = () => {
  els.transactionsTableBody.innerHTML = ''
  state.transactions
    .slice()
    .sort((a,b)=> new Date(b.date) - new Date(a.date))
    .forEach((t, idx) => {
      const tr = document.createElement('tr')
      tr.innerHTML = `
        <td>${t.date || ''}</td>
        <td>${t.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</td>
        <td>${formatCurrency(t.amount)}</td>
        <td>${t.category}</td>
        <td>${t.desc || ''}</td>
        <td><button class="del-tx" data-index="${idx}">Hapus</button></td>
      `
      els.transactionsTableBody.appendChild(tr)
    })
}

const calculateSummary = () => {
  const income = state.transactions.filter(t=>t.type==='income').reduce((s,t)=>s + Number(t.amount),0)
  const expense = state.transactions.filter(t=>t.type==='expense').reduce((s,t)=>s + Number(t.amount),0)
  const balance = income - expense
  // expense per category
  const expenseByCat = {}
  state.categories.forEach(c => expenseByCat[c] = 0)
  state.transactions.filter(t=>t.type==='expense').forEach(t=>{
    if (!expenseByCat[t.category]) expenseByCat[t.category] = 0
    expenseByCat[t.category] += Number(t.amount)
  })
  // top category
  let topCat = '-'
  const catEntries = Object.entries(expenseByCat)
  if (catEntries.length > 0) {
    const max = catEntries.reduce((m,e)=> e[1] > m[1] ? e : m, ['', -1])
    if (max[1] > 0) topCat = `${max[0]} (${formatCurrency(max[1])})`
  }
  return {income, expense, balance, expenseByCat, topCat}
}

const renderSummary = () => {
  const {income, expense, balance, expenseByCat, topCat} = calculateSummary()
  els.totalIncome.textContent = formatCurrency(income)
  els.totalExpense.textContent = formatCurrency(expense)
  els.balance.textContent = formatCurrency(balance)
  els.topCategory.textContent = topCat
  // percent list
  els.expensePercentList.innerHTML = ''
  const totalExpense = expense || 0
  Object.entries(expenseByCat).sort((a,b)=>b[1]-a[1]).forEach(([cat, amt])=>{
    if (amt <= 0) return
    const li = document.createElement('li')
    const pct = ((amt / totalExpense) * 100).toFixed(1)
    li.textContent = `${cat}: ${formatCurrency(amt)} — ${pct}%`
    els.expensePercentList.appendChild(li)
  })
  renderChart(expenseByCat)
}

const renderChart = (expenseByCat) => {
  const labels = []
  const data = []
  Object.entries(expenseByCat).forEach(([k,v])=>{
    if (v > 0) {
      labels.push(k)
      data.push(v)
    }
  })
  if (expenseChart) expenseChart.destroy()
  expenseChart = new Chart(els.chartCanvas, {
    type: 'pie',
    data: {
      labels,
      datasets: [{data, backgroundColor: labels.map((_,i)=>`hsl(${i*60 % 360} 70% 60%)`)}]
    },
    options: {plugins:{legend:{position:'bottom'}}}
  })
}

// Events
els.categoryForm.addEventListener('submit', (e)=>{
  e.preventDefault()
  const name = els.categoryName.value.trim()
  if (!name) return
  if (!state.categories.includes(name)) {
    state.categories.push(name)
    saveStorage()
    renderCategories()
    renderSummary()
    els.categoryName.value = ''
  } else {
    alert('Kategori sudah ada')
  }
})

els.categoriesList.addEventListener('click', (e)=>{
  if (e.target.classList.contains('del-cat')) {
    const idx = Number(e.target.dataset.idx)
    const name = state.categories[idx]
    // remove category and set transactions with that category to 'Umum' if exists else remove
    const fallback = state.categories.find(c=>'Umum'===c) ? 'Umum' : (state.categories[0] || null)
    state.transactions = state.transactions.map(t => t.category === name ? {...t, category: fallback} : t)
    state.categories.splice(idx,1)
    saveStorage()
    renderCategories()
    renderTransactions()
    renderSummary()
  }
})

els.transactionForm.addEventListener('submit', (e)=>{
  e.preventDefault()
  const t = {
    type: els.type.value,
    amount: Number(els.amount.value) || 0,
    category: els.categorySelect.value || (state.categories[0] || 'Umum'),
    desc: els.desc.value.trim(),
    date: els.date.value || new Date().toISOString().slice(0,10)
  }
  if (t.amount <= 0) { alert('Masukkan jumlah lebih dari 0'); return }
  state.transactions.push(t)
  saveStorage()
  renderTransactions()
  renderSummary()
  // reset form
  els.amount.value = ''
  els.desc.value = ''
  els.date.value = ''
})

els.transactionsTableBody.addEventListener('click', (e)=>{
  if (e.target.classList.contains('del-tx')) {
    const row = e.target.closest('tr')
    const idx = Array.from(els.transactionsTableBody.children).indexOf(row)
    // find sorted index mapping to actual transaction
    const sorted = state.transactions.slice().sort((a,b)=> new Date(b.date) - new Date(a.date))
    const tx = sorted[idx]
    // remove first matching transaction (by timestamp & amount & category & desc)
    const foundIndex = state.transactions.findIndex(t=> t.date===tx.date && t.amount===tx.amount && t.category===tx.category && t.desc===tx.desc && t.type===tx.type)
    if (foundIndex > -1) {
      state.transactions.splice(foundIndex,1)
      saveStorage()
      renderTransactions()
      renderSummary()
    }
  }
})

// Init
const init = () => {
  initState()
  renderCategories()
  renderTransactions()
  renderSummary()
}

init()