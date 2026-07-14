// API Base URL
const API_URL = '/api';

// DOM Elements
const expenseForm = document.getElementById('expense-form');
const expenseIdInput = document.getElementById('expense-id');
const descriptionInput = document.getElementById('expense-description');
const amountInput = document.getElementById('expense-amount');
const categorySelect = document.getElementById('expense-category');
const dateInput = document.getElementById('expense-date');

const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');
const formTitle = document.getElementById('form-title');

const totalSpentEl = document.getElementById('total-spent');
const transactionCountEl = document.getElementById('transaction-count');
const topCategoryEl = document.getElementById('top-category');
const topCategoryAmountEl = document.getElementById('top-category-amount');

const filterCategorySelect = document.getElementById('filter-category');
const sortBySelect = document.getElementById('sort-by');
const transactionsListEl = document.getElementById('transactions-list');
const feedSubtitle = document.getElementById('feed-subtitle');

const canvas = document.getElementById('category-chart');
const chartLegendEl = document.getElementById('chart-legend');

// Category settings for icons & styling
const CATEGORIES = {
  Food: { icon: 'utensils', class: 'cat-food', color: 'hsl(38, 92%, 50%)' },
  Shopping: { icon: 'shopping-bag', class: 'cat-shopping', color: 'hsl(346, 84%, 50%)' },
  Entertainment: { icon: 'gamepad-2', class: 'cat-entertainment', color: 'hsl(271, 91%, 65%)' },
  Utilities: { icon: 'zap', class: 'cat-utilities', color: 'hsl(217, 91%, 60%)' },
  Transport: { icon: 'car', class: 'cat-transport', color: 'hsl(173, 80%, 40%)' },
  Health: { icon: 'heart-pulse', class: 'cat-health', color: 'hsl(142, 76%, 36%)' },
  Other: { icon: 'help-circle', class: 'cat-other', color: 'hsl(215, 16%, 47%)' }
};

// Global App State
let editMode = false;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  setDefaultDate();
  fetchSummary();
  fetchExpenses();

  // Event Listeners
  expenseForm.addEventListener('submit', handleFormSubmit);
  cancelBtn.addEventListener('click', exitEditMode);
  filterCategorySelect.addEventListener('change', fetchExpenses);
  sortBySelect.addEventListener('change', fetchExpenses);
});

// Set default date input value to today
function setDefaultDate() {
  const today = new Date().toISOString().split('T')[0];
  dateInput.value = today;
}

// Show clean toasts
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'info';
  if (type === 'success') icon = 'check-circle';
  if (type === 'error') icon = 'alert-triangle';
  
  toast.innerHTML = `
    <i data-lucide="${icon}"></i>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  lucide.createIcons();

  // Trigger animation frame to guarantee slide-in
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3500);
}

// Fetch stats summary from API
async function fetchSummary() {
  try {
    const res = await fetch(`${API_URL}/summary`);
    if (!res.ok) throw new Error('Failed to fetch summary');
    const summary = await res.json();
    
    renderSummary(summary);
  } catch (error) {
    console.error('Error fetching summary:', error);
    showToast('Failed to load metrics summary', 'error');
  }
}

// Render dynamic stats on metrics cards and drawing doughnut chart
function renderSummary(summary) {
  // Format total spent
  totalSpentEl.textContent = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(summary.totalSpent);

  // Transactions count
  transactionCountEl.textContent = `${summary.transactionCount} transaction${summary.transactionCount !== 1 ? 's' : ''}`;

  // Top category
  if (summary.categoryBreakdown && summary.categoryBreakdown.length > 0) {
    const top = summary.categoryBreakdown[0];
    topCategoryEl.textContent = top.category;
    topCategoryAmountEl.textContent = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(top.amount) + ` spent`;
  } else {
    topCategoryEl.textContent = '—';
    topCategoryAmountEl.textContent = '$0.00 spent';
  }

  // Draw chart visual representation
  drawDoughnutChart(summary.categoryBreakdown, summary.totalSpent);
}

// Custom simple Canvas chart renderer
function drawDoughnutChart(breakdown, total) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  chartLegendEl.innerHTML = '';

  if (!breakdown || breakdown.length === 0 || total === 0) {
    // Draw empty placeholder circle
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 45, 0, 2 * Math.PI);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 14;
    ctx.stroke();

    const emptyLegend = document.createElement('div');
    emptyLegend.className = 'legend-item';
    emptyLegend.innerHTML = '<span class="legend-label">No data yet</span>';
    chartLegendEl.appendChild(emptyLegend);
    return;
  }

  let startAngle = -Math.PI / 2;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = 45;

  breakdown.forEach(item => {
    const categoryInfo = CATEGORIES[item.category] || CATEGORIES.Other;
    const sliceAngle = (item.amount / total) * 2 * Math.PI;

    // Draw segment
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
    ctx.strokeStyle = categoryInfo.color;
    ctx.lineWidth = 14;
    ctx.stroke();

    startAngle += sliceAngle;

    // Add Legend list
    const legendItem = document.createElement('div');
    legendItem.className = 'legend-item';
    legendItem.innerHTML = `
      <span class="legend-label">
        <span class="legend-color" style="background-color: ${categoryInfo.color}"></span>
        ${item.category}
      </span>
      <span class="legend-value">${item.percentage}%</span>
    `;
    chartLegendEl.appendChild(legendItem);
  });
}

// Fetch transactions feed based on category filter and sort selections
async function fetchExpenses() {
  const category = filterCategorySelect.value;
  const sortBy = sortBySelect.value;

  try {
    let url = `${API_URL}/expenses?sortBy=${sortBy}`;
    if (category !== 'All') {
      url += `&category=${category}`;
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch expenses');
    const expenses = await res.json();
    
    // Update header label
    if (category === 'All') {
      feedSubtitle.textContent = `Showing all ${expenses.length} transaction${expenses.length !== 1 ? 's' : ''}`;
    } else {
      feedSubtitle.textContent = `Showing ${expenses.length} in ${category}`;
    }

    renderExpenses(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    showToast('Failed to load transaction feed', 'error');
  }
}

// Build transaction feed UI rows
function renderExpenses(expenses) {
  transactionsListEl.innerHTML = '';

  if (expenses.length === 0) {
    transactionsListEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i data-lucide="inbox"></i></div>
        <p>No transactions match the filter criteria.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  expenses.forEach(e => {
    const cat = CATEGORIES[e.category] || CATEGORIES.Other;
    
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(e.amount);

    const formattedDate = new Date(e.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC' // Keep date exact to date picker setting
    });

    const expenseItem = document.createElement('div');
    expenseItem.className = 'expense-item';
    expenseItem.innerHTML = `
      <div class="expense-left">
        <div class="category-icon ${cat.class}">
          <i data-lucide="${cat.icon}"></i>
        </div>
        <div class="expense-info">
          <span class="expense-desc">${escapeHtml(e.description)}</span>
          <span class="expense-meta">
            <span>${e.category}</span>
            <span class="meta-dot"></span>
            <span>${formattedDate}</span>
          </span>
        </div>
      </div>
      <div class="expense-right">
        <span class="expense-amount">${formattedAmount}</span>
        <div class="expense-actions">
          <button class="action-btn edit" onclick="enterEditMode('${e.id}', '${escapeJs(e.description)}', ${e.amount}, '${e.category}', '${e.date}')" title="Edit expense">
            <i data-lucide="edit-3"></i>
          </button>
          <button class="action-btn delete" onclick="deleteExpense('${e.id}')" title="Delete expense">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
    `;
    transactionsListEl.appendChild(expenseItem);
  });

  lucide.createIcons();
}

// Add/Edit Form submit logic
async function handleFormSubmit(event) {
  event.preventDefault();

  const id = expenseIdInput.value;
  const description = descriptionInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const category = categorySelect.value;
  const date = dateInput.value;

  // Simple clean validation
  if (!description) {
    showToast('Please enter a description', 'error');
    descriptionInput.focus();
    return;
  }
  if (isNaN(amount) || amount <= 0) {
    showToast('Please enter a valid amount greater than 0', 'error');
    amountInput.focus();
    return;
  }
  if (!category) {
    showToast('Please select a category', 'error');
    categorySelect.focus();
    return;
  }
  if (!date) {
    showToast('Please select a date', 'error');
    dateInput.focus();
    return;
  }

  const payload = { description, amount, category, date };
  if (editMode) {
    payload.id = id;
  }

  try {
    const res = await fetch(`${API_URL}/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('Network error logging expense');
    
    showToast(editMode ? 'Expense updated successfully!' : 'Expense logged successfully!');
    
    // Clear and refresh UI
    exitEditMode();
    fetchSummary();
    fetchExpenses();
  } catch (error) {
    console.error('Error logging expense:', error);
    showToast('Failed to save expense', 'error');
  }
}

// Edit Mode control
window.enterEditMode = function(id, description, amount, category, date) {
  editMode = true;
  expenseIdInput.value = id;
  descriptionInput.value = description;
  amountInput.value = amount;
  categorySelect.value = category;
  dateInput.value = date;

  formTitle.textContent = 'Edit Expense';
  submitBtn.innerHTML = '<i data-lucide="check-circle"></i> Update Expense';
  cancelBtn.classList.remove('hidden');
  lucide.createIcons();
  
  descriptionInput.scrollIntoView({ behavior: 'smooth' });
  descriptionInput.focus();
};

function exitEditMode() {
  editMode = false;
  expenseIdInput.value = '';
  descriptionInput.value = '';
  amountInput.value = '';
  categorySelect.value = '';
  setDefaultDate();

  formTitle.textContent = 'Add Expense';
  submitBtn.innerHTML = '<i data-lucide="plus-circle"></i> Save Expense';
  cancelBtn.classList.add('hidden');
  lucide.createIcons();
}

// Delete item
window.deleteExpense = async function(id) {
  if (!confirm('Are you sure you want to delete this expense?')) return;

  try {
    const res = await fetch(`${API_URL}/expenses/${id}`, {
      method: 'DELETE'
    });

    if (!res.ok) throw new Error('Network error deleting expense');

    showToast('Expense deleted successfully.');
    if (editMode && expenseIdInput.value === id) {
      exitEditMode();
    }
    fetchSummary();
    fetchExpenses();
  } catch (error) {
    console.error('Error deleting expense:', error);
    showToast('Failed to delete expense', 'error');
  }
};

// Safe HTML Escape helpers
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}

function escapeJs(str) {
  return str.replace(/'/g, "\\'")
            .replace(/"/g, '\\"')
            .replace(/\\/g, '\\\\');
}
