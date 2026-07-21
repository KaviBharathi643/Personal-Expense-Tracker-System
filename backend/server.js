const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '../.env');
const envEncPath = path.join(__dirname, '../.env.enc');

dotenv.config({ path: envPath });

if (fs.existsSync(envEncPath)) {
  const envEncContent = fs.readFileSync(envEncPath, 'utf8');
  for (const line of envEncContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'aware_secure_jwt_secret_key_103535';

// Mail transporter config
const transporter = nodemailer.createTransport({
  service: process.env.MAILER_SERVICE || 'gmail',
  auth: {
    user: process.env.MAILER_USER || 'employeepayroll.workforce@gmail.com',
    pass: process.env.MAILER_PASS || ''
  }
});

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// --- JWT Auth Middleware ---
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token missing' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalid or expired' });
    }
    req.user = user;
    next();
  });
}

// --- Auth Endpoints ---

// Register User
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email address already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await db.createUser(name, email, passwordHash);
    
    // Generate immediate token
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({ user, token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login User
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await db.getUserByEmail(email);
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      user: { id: user.id, name: user.name, email: user.email },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Forgot Password - Generates OTP and sends Mail
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await db.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'Email not found' });
    }

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry

    await db.saveResetToken(email, otp, expiry);

    // Send Mail
    const mailOptions = {
      from: '"Aware Assistant" <employeepayroll.workforce@gmail.com>',
      to: email,
      subject: 'Aware Password Reset OTP Verification Code',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #0b1c30; background-color: #f8f9ff; border-radius: 8px;">
          <h2 style="color: #002626;">Aware Expense Workspace</h2>
          <p>You requested to reset your password. Use the verification code below to verify your request. This code is valid for 15 minutes.</p>
          <div style="font-size: 28px; font-weight: bold; background-color: #e5eeff; padding: 15px; text-align: center; border-radius: 6px; letter-spacing: 5px; color: #006b5f; margin: 20px 0;">
            ${otp}
          </div>
          <p>If you didn't request this password reset, please ignore this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'OTP sent successfully to email' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to request password reset' });
  }
});

// Verify Reset OTP
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and verification code are required' });
    }

    const user = await db.getUserByResetToken(otp);
    if (!user || user.email !== email) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    res.json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Reset Password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, verification code, and new password are required' });
    }

    const user = await db.getUserByResetToken(otp);
    if (!user || user.email !== email) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await db.updatePassword(user.id, passwordHash);
    res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// --- Folders API (Protected) ---
app.get('/api/folders', authenticateToken, async (req, res) => {
  try {
    const folders = await db.getFolders(req.user.id);
    res.json(folders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve folders' });
  }
});

app.post('/api/folders', authenticateToken, async (req, res) => {
  try {
    const { id, name, walletLimit } = req.body;
    if (!id && !name) {
      return res.status(400).json({ error: 'Folder name is required' });
    }
    const folder = await db.saveFolder({ id, name, walletLimit }, req.user.id);
    res.status(201).json(folder);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save folder' });
  }
});

app.delete('/api/folders/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db.deleteFolder(id, req.user.id);
    if (deleted) {
      res.json({ success: true, message: 'Folder and contents deleted' });
    } else {
      res.status(404).json({ error: 'Folder not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// --- Files API (Protected) ---
app.get('/api/files', authenticateToken, async (req, res) => {
  try {
    const files = await db.getFiles(req.user.id);
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve files' });
  }
});

app.post('/api/files', authenticateToken, async (req, res) => {
  try {
    const { id, name, folderId, walletLimit } = req.body;
    if (!id && !name) {
      return res.status(400).json({ error: 'File name is required' });
    }
    const file = await db.saveFile({ id, name, folderId, walletLimit }, req.user.id);
    res.status(201).json(file);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save file' });
  }
});

app.delete('/api/files/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db.deleteFile(id, req.user.id);
    if (deleted) {
      res.json({ success: true, message: 'File and expenses deleted' });
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// --- Expenses API (Protected) ---
app.get('/api/expenses', authenticateToken, async (req, res) => {
  try {
    const { fileId, folderId, category, sortBy } = req.query;
    const expenses = await db.getExpenses({ fileId, folderId, category, sortBy }, req.user.id);
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve expenses' });
  }
});

app.post('/api/expenses', authenticateToken, async (req, res) => {
  try {
    const { id, fileId, amount, description, category, date } = req.body;

    if (!fileId) {
      return res.status(400).json({ error: 'File ID is required' });
    }
    if (amount === undefined || amount === null || isNaN(parseFloat(amount))) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const saved = await db.saveExpense({ id, fileId, amount, description, category, date }, req.user.id);
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save expense' });
  }
});

app.delete('/api/expenses/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db.deleteExpense(id, req.user.id);
    if (deleted) {
      res.json({ success: true, message: 'Expense deleted successfully' });
    } else {
      res.status(404).json({ error: 'Expense not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// --- Aggregated Metrics Summary (Protected) ---
app.get('/api/summary', authenticateToken, async (req, res) => {
  try {
    const { scopeType, scopeId } = req.query;
    const summary = await db.getSummary(scopeType, scopeId, req.user.id);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve summary' });
  }
});

// SPA router fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
