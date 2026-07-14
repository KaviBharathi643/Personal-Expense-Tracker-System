const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'expenses.json');

// Ensure database directory and file exist
function initializeDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf8');
  }
}

// Load all expenses
function getExpenses() {
  initializeDatabase();
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database file, returning empty list:', error);
    return [];
  }
}

// Save all expenses helper
function saveAllExpenses(expenses) {
  initializeDatabase();
  fs.writeFileSync(DATA_FILE, JSON.stringify(expenses, null, 2), 'utf8');
}

// Add or update an expense
function saveExpense(expenseData) {
  const expenses = getExpenses();
  
  const newExpense = {
    id: expenseData.id || Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    description: expenseData.description || 'Untitled Expense',
    amount: parseFloat(expenseData.amount) || 0,
    category: expenseData.category || 'Other',
    date: expenseData.date || new Date().toISOString().split('T')[0]
  };

  if (expenseData.id) {
    // Update existing
    const index = expenses.findIndex(e => e.id === expenseData.id);
    if (index !== -1) {
      expenses[index] = newExpense;
    } else {
      expenses.push(newExpense);
    }
  } else {
    // Add new
    expenses.push(newExpense);
  }

  saveAllExpenses(expenses);
  return newExpense;
}

// Delete an expense
function deleteExpense(id) {
  const expenses = getExpenses();
  const filtered = expenses.filter(e => e.id !== id);
  if (expenses.length !== filtered.length) {
    saveAllExpenses(filtered);
    return true;
  }
  return false;
}

// Get expense summary stats
function getSummary() {
  const expenses = getExpenses();
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  const categoryMap = {};
  expenses.forEach(e => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
  });

  const categoryBreakdown = Object.keys(categoryMap).map(cat => ({
    category: cat,
    amount: categoryMap[cat],
    percentage: total > 0 ? Math.round((categoryMap[cat] / total) * 100) : 0
  })).sort((a, b) => b.amount - a.amount);

  return {
    totalSpent: parseFloat(total.toFixed(2)),
    transactionCount: expenses.length,
    categoryBreakdown
  };
}

module.exports = {
  getExpenses,
  saveExpense,
  deleteExpense,
  getSummary
};
