const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// API Endpoints

// Get all expenses (with optional category filtering)
app.get('/api/expenses', (req, res) => {
  try {
    let expenses = db.getExpenses();
    const { category, sortBy } = req.query;

    if (category && category !== 'All') {
      expenses = expenses.filter(e => e.category.toLowerCase() === category.toLowerCase());
    }

    if (sortBy) {
      if (sortBy === 'date-desc') {
        expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
      } else if (sortBy === 'date-asc') {
        expenses.sort((a, b) => new Date(a.date) - new Date(b.date));
      } else if (sortBy === 'amount-desc') {
        expenses.sort((a, b) => b.amount - a.amount);
      } else if (sortBy === 'amount-asc') {
        expenses.sort((a, b) => a.amount - b.amount);
      }
    } else {
      // Default to newest first
      expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve expenses' });
  }
});

// Add a new or edit an existing expense
app.post('/api/expenses', (req, res) => {
  try {
    const { description, amount, category, date, id } = req.body;

    if (!description || !amount || !category) {
      return res.status(400).json({ error: 'Description, amount, and category are required' });
    }

    const saved = db.saveExpense({ id, description, amount, category, date });
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save expense' });
  }
});

// Delete an expense
app.delete('/api/expenses/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = db.deleteExpense(id);
    if (deleted) {
      res.json({ success: true, message: 'Expense deleted successfully' });
    } else {
      res.status(404).json({ error: 'Expense not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// Get expense summary metrics
app.get('/api/summary', (req, res) => {
  try {
    const summary = db.getSummary();
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve summary' });
  }
});

// Fallback to index.html for single page application behavior
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
