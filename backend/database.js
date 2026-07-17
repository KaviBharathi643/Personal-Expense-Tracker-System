const mysql = require('mysql2/promise');
const crypto = require('crypto');

// Create the connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'ihtarahbivaK@103535',
  database: 'aware_tracker',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Helper for raw queries
async function query(sql, params) {
  const [results] = await pool.execute(sql, params);
  return results;
}

// --- Auth queries ---
async function createUser(name, email, passwordHash) {
  const id = crypto.randomUUID();
  await query(
    'INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
    [id, name, email, passwordHash]
  );
  return { id, name, email };
}

async function getUserByEmail(email) {
  const rows = await query('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0] || null;
}

async function saveResetToken(email, token, expiry) {
  await query(
    'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE email = ?',
    [token, expiry, email]
  );
}

async function getUserByResetToken(token) {
  const rows = await query(
    'SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()',
    [token]
  );
  return rows[0] || null;
}

async function updatePassword(userId, passwordHash) {
  await query(
    'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
    [passwordHash, userId]
  );
}

// --- Folders API CRUD ---
async function getFolders(userId) {
  return await query('SELECT * FROM folders WHERE user_id = ? ORDER BY created_at ASC', [userId]);
}

async function saveFolder(folderData, userId) {
  const id = folderData.id || crypto.randomUUID();
  const walletLimit = folderData.walletLimit !== undefined ? (folderData.walletLimit === null || folderData.walletLimit === '' ? null : parseFloat(folderData.walletLimit)) : null;

  if (folderData.id) {
    // Update
    await query(
      'UPDATE folders SET name = ?, wallet_limit = ? WHERE id = ? AND user_id = ?',
      [folderData.name, walletLimit, id, userId]
    );
  } else {
    // Insert
    await query(
      'INSERT INTO folders (id, user_id, name, wallet_limit) VALUES (?, ?, ?, ?)',
      [id, userId, folderData.name, walletLimit]
    );
  }
  return { id, name: folderData.name, walletLimit };
}

async function deleteFolder(id, userId) {
  const res = await query('DELETE FROM folders WHERE id = ? AND user_id = ?', [id, userId]);
  return res.affectedRows > 0;
}

// --- Files API CRUD ---
async function getFiles(userId) {
  return await query('SELECT * FROM files WHERE user_id = ? ORDER BY created_at ASC', [userId]);
}

async function saveFile(fileData, userId) {
  const id = fileData.id || crypto.randomUUID();
  const folderId = fileData.folderId || null;
  const walletLimit = fileData.walletLimit !== undefined ? (fileData.walletLimit === null || fileData.walletLimit === '' ? null : parseFloat(fileData.walletLimit)) : null;

  if (fileData.id) {
    // Update
    await query(
      'UPDATE files SET name = ?, folder_id = ?, wallet_limit = ? WHERE id = ? AND user_id = ?',
      [fileData.name, folderId, walletLimit, id, userId]
    );
  } else {
    // Insert
    await query(
      'INSERT INTO files (id, user_id, name, folder_id, wallet_limit) VALUES (?, ?, ?, ?, ?)',
      [id, userId, fileData.name, folderId, walletLimit]
    );
  }
  return { id, name: fileData.name, folderId, walletLimit };
}

async function deleteFile(id, userId) {
  const res = await query('DELETE FROM files WHERE id = ? AND user_id = ?', [id, userId]);
  return res.affectedRows > 0;
}

// --- Expenses API CRUD ---
async function getExpenses(filters, userId) {
  let sql = 'SELECT * FROM expenses WHERE user_id = ?';
  const params = [userId];

  if (filters.fileId) {
    sql += ' AND file_id = ?';
    params.push(filters.fileId);
  } else if (filters.folderId) {
    sql += ' AND file_id IN (SELECT id FROM files WHERE folder_id = ?)';
    params.push(filters.folderId);
  }

  if (filters.category && filters.category !== 'All') {
    sql += ' AND category = ?';
    params.push(filters.category);
  }

  if (filters.sortBy) {
    if (filters.sortBy === 'date-desc') {
      sql += ' ORDER BY date DESC';
    } else if (filters.sortBy === 'date-asc') {
      sql += ' ORDER BY date ASC';
    } else if (filters.sortBy === 'amount-desc') {
      sql += ' ORDER BY amount DESC';
    } else if (filters.sortBy === 'amount-asc') {
      sql += ' ORDER BY amount ASC';
    }
  } else {
    sql += ' ORDER BY date DESC';
  }

  return await query(sql, params);
}

async function saveExpense(expenseData, userId) {
  const id = expenseData.id || crypto.randomUUID();
  const description = expenseData.description || null;
  const category = expenseData.category || 'Other';
  const date = expenseData.date ? new Date(expenseData.date) : new Date();

  if (expenseData.id) {
    // Update
    await query(
      'UPDATE expenses SET file_id = ?, amount = ?, description = ?, category = ?, date = ? WHERE id = ? AND user_id = ?',
      [expenseData.fileId, expenseData.amount, description, category, date, id, userId]
    );
  } else {
    // Insert
    await query(
      'INSERT INTO expenses (id, user_id, file_id, amount, description, category, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, userId, expenseData.fileId, expenseData.amount, description, category, date]
    );
  }
  return { id, fileId: expenseData.fileId, amount: expenseData.amount, description, category, date };
}

async function deleteExpense(id, userId) {
  const res = await query('DELETE FROM expenses WHERE id = ? AND user_id = ?', [id, userId]);
  return res.affectedRows > 0;
}

// --- Dashboard Summary Calculation ---
async function getSummary(scopeType, scopeId, userId) {
  let sql = 'SELECT * FROM expenses WHERE user_id = ?';
  const params = [userId];

  if (scopeType === 'file') {
    sql += ' AND file_id = ?';
    params.push(scopeId);
  } else if (scopeType === 'folder') {
    sql += ' AND file_id IN (SELECT id FROM files WHERE folder_id = ?)';
    params.push(scopeId);
  }

  const expenses = await query(sql, params);
  const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  const categoryMap = {};
  expenses.forEach(e => {
    const cat = e.category || 'Other';
    categoryMap[cat] = (categoryMap[cat] || 0) + parseFloat(e.amount);
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
  query,
  createUser,
  getUserByEmail,
  saveResetToken,
  getUserByResetToken,
  updatePassword,
  getFolders,
  saveFolder,
  deleteFolder,
  getFiles,
  saveFile,
  deleteFile,
  getExpenses,
  saveExpense,
  deleteExpense,
  getSummary
};
