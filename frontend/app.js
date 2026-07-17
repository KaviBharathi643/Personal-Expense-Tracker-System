const API_URL = '/api';

// ── App State ──
let userToken = localStorage.getItem('aware_token') || null;
let activeUser = null;
let currentScopeType = null; // 'folder' | 'file'
let currentScopeId = null;
let foldersList = [];
let filesList = [];
let activeCategory = 'Food';
let numpadVal = '0.00';
let forgotStep = 1;
let forgotEmail = '';
let forgotOtp = '';

let collapsedFolders = {};
try {
  collapsedFolders = JSON.parse(localStorage.getItem('collapsed_folders') || '{}');
} catch (e) {
  collapsedFolders = {};
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  // OTP auto-tab
  const otpBoxes = document.querySelectorAll('.otp-box');
  otpBoxes.forEach((box, i) => {
    box.addEventListener('input', (e) => {
      if (e.target.value.length === 1 && i < otpBoxes.length - 1) otpBoxes[i + 1].focus();
    });
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && i > 0) otpBoxes[i - 1].focus();
    });
  });
  checkAuth();
});

// ════════════════════════════════════════════════
// Toast Notifications
// ════════════════════════════════════════════════
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');

  let typeClass, icon;
  if (type === 'success') {
    typeClass = 'toast-success';
    icon = 'check_circle';
  } else if (type === 'error') {
    typeClass = 'toast-error';
    icon = 'error';
  } else {
    typeClass = 'toast-info';
    icon = 'info';
  }

  toast.className = `toast ${typeClass}`;
  toast.innerHTML = `<span class="material-symbols-outlined toast-icon">${icon}</span><span>${message}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ════════════════════════════════════════════════
// Auth Fetch Helper
// ════════════════════════════════════════════════
async function authFetch(url, options = {}) {
  const headers = options.headers || {};
  if (userToken) headers['Authorization'] = `Bearer ${userToken}`;
  options.headers = headers;
  const res = await fetch(url, options);
  if (res.status === 401 || res.status === 403) {
    handleLogout();
    throw new Error('Session expired');
  }
  return res;
}

// ════════════════════════════════════════════════
// Auth Check & View Toggle
// ════════════════════════════════════════════════
function checkAuth() {
  const viewAuth = document.getElementById('view-auth');
  const viewWorkspace = document.getElementById('view-workspace');

  if (userToken) {
    try {
      const payload = JSON.parse(atob(userToken.split('.')[1]));
      activeUser = payload;
      document.getElementById('user-profile-name').textContent = payload.name;
      document.getElementById('user-profile-email').textContent = payload.email;
      viewAuth.classList.add('hidden');
      viewWorkspace.classList.remove('hidden');
      document.body.classList.remove('overflow-hidden');
      initWorkspace();
    } catch (e) {
      handleLogout();
    }
  } else {
    viewWorkspace.classList.add('hidden');
    viewAuth.classList.remove('hidden');
    switchAuthTab('login');
  }
}

// ════════════════════════════════════════════════
// Auth Tab Switcher
// ════════════════════════════════════════════════
window.switchAuthTab = function(tab) {
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  const formForgot = document.getElementById('form-forgot');
  const tabLogin = document.getElementById('btn-tab-login');
  const tabRegister = document.getElementById('btn-tab-register');
  const indicator = document.getElementById('tab-indicator');
  const authTabs = document.getElementById('auth-tabs');
  const title = document.getElementById('screen-title');
  const subtitle = document.getElementById('screen-subtitle');
  const bubble = document.getElementById('welcome-bubble');
  const character = document.getElementById('character-container');

  // Hide all
  [formLogin, formRegister, formForgot].forEach(f => { f.classList.add('hidden-state'); f.classList.remove('active-state'); });

  if (tab === 'login') {
    formLogin.classList.remove('hidden-state'); formLogin.classList.add('active-state');
    indicator.style.transform = 'translateX(0%)';
    tabLogin.classList.add('active'); tabRegister.classList.remove('active');
    title.textContent = 'Aware Pro';
    subtitle.textContent = 'Your intelligent expense assistant';
    bubble.classList.remove('visible');
    authTabs.classList.remove('hidden');
  } else if (tab === 'register') {
    formRegister.classList.remove('hidden-state'); formRegister.classList.add('active-state');
    indicator.style.transform = 'translateX(100%)';
    tabRegister.classList.add('active'); tabLogin.classList.remove('active');
    title.textContent = 'Join Us';
    subtitle.textContent = 'Start tracking with intelligence';
    bubble.classList.add('visible');
    character.classList.add('character-bounce');
    setTimeout(() => character.classList.remove('character-bounce'), 600);
    authTabs.classList.remove('hidden');
  } else if (tab === 'forgot') {
    authTabs.classList.add('hidden');
    formForgot.classList.remove('hidden-state'); formForgot.classList.add('active-state');
    title.textContent = 'Password Recovery';
    subtitle.textContent = 'Verify your identity to proceed';
    setupForgotStep(1);
  }
};

function setupForgotStep(step) {
  forgotStep = step;
  const emailW = document.getElementById('forgot-email-wrapper');
  const otpW = document.getElementById('otp-wrapper');
  const passW = document.getElementById('reset-password-wrapper');
  const btn = document.getElementById('btn-forgot-action');
  const info = document.getElementById('forgot-info-text');

  emailW.classList.add('hidden'); otpW.classList.add('hidden'); passW.classList.add('hidden');

  if (step === 1) {
    info.textContent = 'Enter your email to receive a 6-digit secure OTP.';
    emailW.classList.remove('hidden');
    btn.textContent = 'Send OTP';
  } else if (step === 2) {
    info.textContent = 'Enter the 6-digit verification code sent to your email.';
    otpW.classList.remove('hidden');
    btn.textContent = 'Verify Code';
  } else if (step === 3) {
    info.textContent = 'Almost done! Choose a new secure password.';
    passW.classList.remove('hidden');
    btn.textContent = 'Reset Password';
  }
}

// ════════════════════════════════════════════════
// Auth Handlers
// ════════════════════════════════════════════════
window.handleLogout = function() {
  localStorage.removeItem('aware_token');
  userToken = null;
  activeUser = null;
  currentScopeType = null;
  currentScopeId = null;
  checkAuth();
};

async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    localStorage.setItem('aware_token', data.token);
    userToken = data.token;
    showToast(`Welcome back, ${data.user.name}!`);
    checkAuth();
  } catch (err) { showToast(err.message, 'error'); }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('register-name').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    localStorage.setItem('aware_token', data.token);
    userToken = data.token;
    showToast('Account created successfully!');
    checkAuth();
  } catch (err) { showToast(err.message, 'error'); }
}

window.handleForgotAction = async function(e) {
  e.preventDefault();
  if (forgotStep === 1) {
    forgotEmail = document.getElementById('forgot-email').value.trim();
    if (!forgotEmail) { showToast('Enter your email', 'error'); return; }
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      showToast('OTP sent to your email.');
      setupForgotStep(2);
    } catch (err) { showToast(err.message, 'error'); }
  } else if (forgotStep === 2) {
    forgotOtp = Array.from(document.querySelectorAll('.otp-box')).map(b => b.value).join('');
    if (forgotOtp.length < 6) { showToast('Enter the full 6-digit code', 'error'); return; }
    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, otp: forgotOtp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      showToast('Code verified successfully.');
      setupForgotStep(3);
    } catch (err) { showToast(err.message, 'error'); }
  } else if (forgotStep === 3) {
    const newPassword = document.getElementById('forgot-new-password').value;
    if (!newPassword || newPassword.length < 6) { showToast('Minimum 6 characters', 'error'); return; }
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, otp: forgotOtp, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');
      showToast('Password reset successful. Please login.');
      switchAuthTab('login');
    } catch (err) { showToast(err.message, 'error'); }
  }
};

// ════════════════════════════════════════════════
// Drawer Toggle
// ════════════════════════════════════════════════
window.toggleDrawer = function() {
  const drawer = document.getElementById('main-drawer');
  const overlay = document.getElementById('sidebar-overlay');
  drawer.classList.toggle('open');
  overlay.classList.toggle('visible');
};

// ════════════════════════════════════════════════
// Bottom Navigation (Mobile tabs)
// ════════════════════════════════════════════════
window.switchBottomTab = function(tab) {
  ['ledger', 'wallet', 'history', 'settings'].forEach(t => {
    const el = document.getElementById(`bnav-${t}`);
    if (t === tab) {
      el.className = 'bnav-item active';
    } else {
      el.className = 'bnav-item';
    }
  });
};

// ════════════════════════════════════════════════
// Workspace Initialization
// ════════════════════════════════════════════════
async function initWorkspace() {
  await Promise.all([fetchFolders(), fetchFiles()]);
  renderSidebar();
  if (filesList.length > 0) {
    selectScope('file', filesList[0].id);
  } else if (foldersList.length > 0) {
    selectScope('folder', foldersList[0].id);
  } else {
    renderPlaceholder();
  }
}

async function fetchFolders() {
  try {
    const res = await authFetch(`${API_URL}/folders`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    foldersList = data.map(folder => ({
      ...folder,
      walletLimit: folder.walletLimit !== undefined ? folder.walletLimit : folder.wallet_limit
    }));
  } catch (e) { showToast('Failed to load folders', 'error'); }
}

async function fetchFiles() {
  try {
    const res = await authFetch(`${API_URL}/files`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    filesList = data.map(file => ({
      ...file,
      folderId: file.folderId !== undefined ? file.folderId : file.folder_id,
      walletLimit: file.walletLimit !== undefined ? file.walletLimit : file.wallet_limit
    }));
  } catch (e) { showToast('Failed to load files', 'error'); }
}

// ════════════════════════════════════════════════
// Sidebar Folder/File Tree
// ════════════════════════════════════════════════
function renderSidebar() {
  const tree = document.getElementById('sidebar-folder-tree');
  tree.innerHTML = '';

  if (foldersList.length === 0 && filesList.length === 0) {
    tree.innerHTML = `<div class="folder-tree-empty">No folders yet. Create one!</div>`;
    return;
  }

  foldersList.forEach(folder => {
    const children = filesList.filter(f => f.folderId === folder.id);
    const wrapper = document.createElement('div');
    const isActive = currentScopeType === 'folder' && currentScopeId === folder.id;
    const isCollapsed = collapsedFolders[folder.id] === true;

    wrapper.innerHTML = `
      <div class="scope-item ${isActive ? 'active' : ''}" id="scope-folder-${folder.id}" onclick="selectScope('folder','${folder.id}')">
        <div class="scope-item-left" style="gap: 4px;">
          <span class="material-symbols-outlined transition-transform duration-200" style="transform: ${isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)'}; font-size: 20px; color: var(--text-muted); cursor: pointer;">chevron_right</span>
          <span class="material-symbols-outlined">folder</span>
          <span class="scope-item-name">${esc(folder.name)}</span>
        </div>
        <div class="scope-item-actions">
          <button onclick="event.stopPropagation(); openFileModal('${folder.id}')" class="scope-action-btn" title="New File"><span class="material-symbols-outlined">add</span></button>
          <button onclick="event.stopPropagation(); deleteFolder('${folder.id}')" class="scope-action-btn scope-action-delete" title="Delete"><span class="material-symbols-outlined">delete</span></button>
        </div>
      </div>
      <div class="folder-children" id="folder-children-${folder.id}" style="${isCollapsed ? 'display: none;' : ''}"></div>
    `;

    const childContainer = wrapper.querySelector(`#folder-children-${folder.id}`);

    // "New File" button inside folder
    const newFileBtn = document.createElement('button');
    newFileBtn.className = 'new-file-btn';
    newFileBtn.innerHTML = `<span class="material-symbols-outlined">add</span><span>New File</span>`;
    newFileBtn.onclick = () => openFileModal(folder.id);
    childContainer.appendChild(newFileBtn);

    children.forEach(file => {
      const isFileActive = currentScopeType === 'file' && currentScopeId === file.id;
      const fileEl = document.createElement('div');
      fileEl.className = `scope-item ${isFileActive ? 'active' : ''}`;
      fileEl.id = `scope-file-${file.id}`;
      fileEl.onclick = () => selectScope('file', file.id);
      fileEl.innerHTML = `
        <div class="scope-item-left">
          <span class="material-symbols-outlined" style="font-size: 18px;">description</span>
          <span class="scope-item-name" style="max-width: 120px;">${esc(file.name)}</span>
        </div>
        <div class="scope-item-actions">
          <button onclick="event.stopPropagation(); deleteFile('${file.id}')" class="scope-action-btn scope-action-delete"><span class="material-symbols-outlined">delete</span></button>
        </div>
      `;
      childContainer.appendChild(fileEl);
    });

    tree.appendChild(wrapper);
  });

  // Root files (no folder)
  const rootFiles = filesList.filter(f => !f.folderId);
  if (rootFiles.length > 0) {
    const divider = document.createElement('div');
    divider.className = 'root-files-divider';
    divider.innerHTML = `<span class="material-symbols-outlined">folder_shared</span><span>Unsorted Files</span>`;
    tree.appendChild(divider);
    rootFiles.forEach(file => {
      const isActive = currentScopeType === 'file' && currentScopeId === file.id;
      const el = document.createElement('div');
      el.className = `scope-item ${isActive ? 'active' : ''}`;
      el.id = `scope-file-${file.id}`;
      el.onclick = () => selectScope('file', file.id);
      el.innerHTML = `
        <div class="scope-item-left">
          <span class="material-symbols-outlined" style="font-size: 18px;">description</span>
          <span class="scope-item-name">${esc(file.name)}</span>
        </div>
        <div class="scope-item-actions">
          <button onclick="event.stopPropagation(); deleteFile('${file.id}')" class="scope-action-btn scope-action-delete"><span class="material-symbols-outlined">delete</span></button>
        </div>
      `;
      tree.appendChild(el);
    });
  }
}

// ════════════════════════════════════════════════
// Scope Selection & View Router
// ════════════════════════════════════════════════
window.selectScope = function(type, id) {
  if (type === 'folder') {
    collapsedFolders[id] = !collapsedFolders[id];
    localStorage.setItem('collapsed_folders', JSON.stringify(collapsedFolders));
  }
  currentScopeType = type;
  currentScopeId = id;
  if (window.innerWidth < 768) {
    document.getElementById('main-drawer').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('visible');
  }
  renderSidebar();
  renderMainWorkspace();
};

async function renderMainWorkspace() {
  if (!currentScopeType || !currentScopeId) { renderPlaceholder(); return; }
  const actionsEl = document.getElementById('header-actions');
  actionsEl.innerHTML = '';

  if (currentScopeType === 'folder') {
    const folder = foldersList.find(f => f.id === currentScopeId);
    if (!folder) return;
    updateBreadcrumb(folder.name, null);
    document.getElementById('workspace-main-title').textContent = folder.name;
    document.getElementById('btn-add-expense-fab').classList.add('hidden');
    document.getElementById('quick-entry-bar').classList.add('hidden');
    document.getElementById('wallet-banner').classList.add('hidden');
    actionsEl.innerHTML = `
      <button onclick="openFolderModal('${folder.id}')" class="btn-icon" style="color: var(--accent);"><span class="material-symbols-outlined">edit_square</span></button>
      <button onclick="deleteFolder('${folder.id}')" class="btn-icon" style="color: var(--expense);"><span class="material-symbols-outlined">delete</span></button>
    `;
    renderFolderOverview();
  } else if (currentScopeType === 'file') {
    const file = filesList.find(f => f.id === currentScopeId);
    if (!file) return;
    const parentName = file.folderId ? (foldersList.find(f => f.id === file.folderId)?.name || 'Folder') : 'Unsorted';
    updateBreadcrumb(parentName, file.name);
    document.getElementById('workspace-main-title').textContent = file.name;
    document.getElementById('btn-add-expense-fab').classList.remove('hidden');
    document.getElementById('quick-entry-bar').classList.remove('hidden');
    actionsEl.innerHTML = `
      <button onclick="openFileModal(null, '${file.id}')" class="btn-icon" style="color: var(--accent);"><span class="material-symbols-outlined">edit_square</span></button>
      <button onclick="deleteFile('${file.id}')" class="btn-icon" style="color: var(--expense);"><span class="material-symbols-outlined">delete</span></button>
    `;
    renderFileFeed();
  }
}

function updateBreadcrumb(parent, child) {
  const nav = document.getElementById('breadcrumb-nav');
  if (child) {
    nav.innerHTML = `<span class="breadcrumb-link" onclick="if(currentScopeType==='file'){const f=filesList.find(x=>x.id===currentScopeId);if(f&&f.folderId)selectScope('folder',f.folderId);}">${esc(parent)}</span>
    <span class="material-symbols-outlined">chevron_right</span>
    <span class="breadcrumb-active">${esc(child)}</span>`;
  } else {
    nav.innerHTML = `<span class="breadcrumb-active">${esc(parent)}</span>`;
  }
}

function renderPlaceholder() {
  document.getElementById('workspace-main-title').textContent = 'Get Started';
  document.getElementById('breadcrumb-nav').innerHTML = '<span class="breadcrumb-active">Dashboard</span>';
  document.getElementById('wallet-banner').classList.add('hidden');
  document.getElementById('btn-add-expense-fab').classList.add('hidden');
  document.getElementById('quick-entry-bar').classList.add('hidden');
  document.getElementById('header-actions').innerHTML = '';

  document.getElementById('dynamic-content-area').innerHTML = `
    <div class="empty-state">
      <span class="material-symbols-outlined">account_balance_wallet</span>
      <h3>Welcome to Aware Workspace</h3>
      <p>Create a folder or file in the sidebar to start tracking expenses.</p>
      <button onclick="openFolderModal()" class="btn btn-primary">
        <span class="material-symbols-outlined">add_circle</span> Create Your First Project
      </button>
    </div>
  `;
}

// ════════════════════════════════════════════════
// Folder Overview (Bento Grid)
// ════════════════════════════════════════════════
async function renderFolderOverview() {
  const content = document.getElementById('dynamic-content-area');
  try {
    const sumRes = await authFetch(`${API_URL}/summary?scopeType=folder&scopeId=${currentScopeId}`);
    if (!sumRes.ok) throw new Error();
    const summary = await sumRes.json();
    const folder = foldersList.find(f => f.id === currentScopeId);
    const childFiles = filesList.filter(f => f.folderId === currentScopeId);

    let walletBar = '';
    let limitLabel = '';
    if (folder.walletLimit) {
      const pct = Math.min((summary.totalSpent / folder.walletLimit) * 100, 100);
      const fillClass = pct >= 100 ? 'progress-fill-danger' : pct >= 85 ? 'progress-fill-warning' : 'progress-fill-safe';
      limitLabel = `<span class="bento-limit-text">/ $${parseFloat(folder.walletLimit).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>`;
      walletBar = `
        <div class="bento-progress">
          <div class="bento-progress-header">
            <span class="text-muted">Wallet Limit Usage</span>
            <span style="font-weight: 700; color: var(--text-primary);">${Math.round(pct)}%</span>
          </div>
          <div class="progress-bar" style="height: 8px;">
            <div class="progress-fill ${fillClass}" style="width: ${pct}%;"></div>
          </div>
        </div>`;
    }

    // Build file rows
    const fileRows = await Promise.all(childFiles.map(async file => {
      const fRes = await authFetch(`${API_URL}/summary?scopeType=file&scopeId=${file.id}`);
      const fSum = fRes.ok ? await fRes.json() : { totalSpent: 0 };
      let fBar = '';
      if (file.walletLimit) {
        const fp = Math.min((fSum.totalSpent / file.walletLimit) * 100, 100);
        const fColor = fp >= 98 ? 'progress-fill-danger' : fp >= 85 ? 'progress-fill-warning' : 'progress-fill-safe';
        const spentColor = fp >= 90 ? 'text-expense' : 'text-accent';
        fBar = `
          <div class="file-mini-progress">
            <div class="file-mini-progress-header">
              <span class="text-muted">Wallet: $${parseFloat(file.walletLimit).toLocaleString()}</span>
              <span class="${spentColor}" style="font-weight: 700;">$${fSum.totalSpent.toFixed(2)} Spent</span>
            </div>
            <div class="file-mini-bar">
              <div class="file-mini-fill ${fColor}" style="width: ${fp}%;"></div>
            </div>
          </div>`;
      }
      const CAT_ICONS = { Food: 'restaurant', Shopping: 'shopping_bag', Transport: 'flight', Utilities: 'home', Health: 'health_and_safety', Other: 'more_horiz' };
      const icon = CAT_ICONS[file.name] || 'description';
      return `
        <div class="file-row-card" onclick="selectScope('file','${file.id}')">
          <div class="file-row-content">
            <div class="file-row-left">
              <div class="file-row-icon">
                <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">${icon}</span>
              </div>
              <div>
                <div class="file-row-name">${esc(file.name)}</div>
                <div class="file-row-sub">Click to view expenses</div>
              </div>
            </div>
            ${fBar}
            <div class="file-row-right">
              <div class="text-right">
                <div class="file-row-amount">$${fSum.totalSpent.toFixed(2)}</div>
                <div class="file-row-amount-label">Current Total</div>
              </div>
              <button onclick="event.stopPropagation(); deleteFile('${file.id}')" class="file-row-delete">
                <span class="material-symbols-outlined">delete_outline</span>
              </button>
              <span class="material-symbols-outlined file-row-chevron">chevron_right</span>
            </div>
          </div>
        </div>`;
    }));

    content.innerHTML = `
      <!-- Bento Grid Top -->
      <div class="bento-grid">
        <!-- Total Card -->
        <div class="bento-card">
          <div class="bento-label">Total Folder Spend</div>
          <div style="display: flex; align-items: baseline; gap: var(--space-sm);">
            <span class="bento-value">$${summary.totalSpent.toFixed(2)}</span>
            ${limitLabel}
          </div>
          ${walletBar}
        </div>
        <!-- Quick Actions -->
        <div class="bento-card bento-card-dark">
          <div class="bento-label">Active Files</div>
          <div class="bento-stat-lg">${childFiles.length} <span class="unit">entries</span></div>
          <div style="margin-top: var(--space-lg);">
            <button onclick="openFileModal('${folder.id}')" class="btn btn-primary btn-full btn-sm">
              <span class="material-symbols-outlined">add_circle</span> New Expense File
            </button>
          </div>
        </div>
      </div>
      <!-- File Breakdown -->
      <div class="section-title">File Breakdown</div>
      <div>
        ${fileRows.length > 0 ? fileRows.join('') : '<div class="empty-state" style="padding: var(--space-lg);"><p style="font-size: 14px; font-style: italic;">No files in this folder yet.</p></div>'}
      </div>
    `;
  } catch (err) {
    console.error(err);
    showToast('Failed to load folder dashboard', 'error');
  }
}

// ════════════════════════════════════════════════
// File Ledger Feed
// ════════════════════════════════════════════════
async function renderFileFeed() {
  const content = document.getElementById('dynamic-content-area');
  const banner = document.getElementById('wallet-banner');
  banner.classList.add('hidden');

  try {
    const file = filesList.find(f => f.id === currentScopeId);
    if (!file) return;

    const sumRes = await authFetch(`${API_URL}/summary?scopeType=file&scopeId=${file.id}`);
    if (!sumRes.ok) throw new Error();
    const summary = await sumRes.json();

    // Update wallet banner
    banner.classList.remove('hidden');
    if (file.walletLimit) {
      document.getElementById('wallet-scope-name').textContent = `${file.name} Wallet`;
      document.getElementById('wallet-spent-val').textContent = `$${summary.totalSpent.toFixed(2)}`;
      document.getElementById('wallet-limit-val').textContent = `$${parseFloat(file.walletLimit).toFixed(2)}`;
      document.getElementById('wallet-spent-label').textContent = `Spent: $${summary.totalSpent.toFixed(2)}`;

      // Show elements
      document.getElementById('wallet-limit-val').parentElement.style.display = 'inline';
      document.getElementById('wallet-badge-el').style.display = 'inline-block';
      const progressBar = document.querySelector('#wallet-banner .progress-bar');
      if (progressBar) progressBar.style.display = 'block';
      const walletFooter = document.querySelector('#wallet-banner .wallet-footer');
      if (walletFooter) walletFooter.style.display = 'flex';

      const pct = Math.min((summary.totalSpent / file.walletLimit) * 100, 100);
      const rem = file.walletLimit - summary.totalSpent;
      const fill = document.getElementById('wallet-progress-fill');
      const badge = document.getElementById('wallet-badge-el');

      fill.style.width = `${pct}%`;
      // Reset classes
      fill.className = 'progress-fill';

      const remLabel = document.getElementById('wallet-remaining-label');

      if (pct >= 100) {
        fill.classList.add('progress-fill-danger');
        badge.className = 'wallet-badge wallet-badge-danger';
        badge.textContent = 'Exceeded';
        remLabel.textContent = `Exceeded: $${Math.abs(rem).toFixed(2)}`;
        remLabel.className = 'wallet-remaining-danger';
      } else if (pct >= 85) {
        fill.classList.add('progress-fill-warning');
        badge.className = 'wallet-badge wallet-badge-warning';
        badge.textContent = 'Warning';
        remLabel.textContent = `Remaining: $${rem.toFixed(2)}`;
        remLabel.className = 'wallet-remaining-warning';
      } else {
        fill.classList.add('progress-fill-safe');
        badge.className = 'wallet-badge wallet-badge-safe';
        badge.textContent = 'Safe';
        remLabel.textContent = `Remaining: $${rem.toFixed(2)}`;
        remLabel.className = 'wallet-remaining';
      }
    } else {
      document.getElementById('wallet-scope-name').textContent = `${file.name} Total Spend`;
      document.getElementById('wallet-spent-val').textContent = `$${summary.totalSpent.toFixed(2)}`;

      // Hide elements
      document.getElementById('wallet-limit-val').parentElement.style.display = 'none';
      document.getElementById('wallet-badge-el').style.display = 'none';
      const progressBar = document.querySelector('#wallet-banner .progress-bar');
      if (progressBar) progressBar.style.display = 'none';
      const walletFooter = document.querySelector('#wallet-banner .wallet-footer');
      if (walletFooter) walletFooter.style.display = 'none';
    }

    // Fetch expenses
    const expRes = await authFetch(`${API_URL}/expenses?fileId=${currentScopeId}`);
    if (!expRes.ok) throw new Error();
    const expenses = await expRes.json();

    if (expenses.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <span class="material-symbols-outlined">inbox</span>
          <p style="font-weight: 600;">No expenses in this file yet.</p>
          <p style="font-size: 12px; margin-top: 4px;">Tap the + button or use the quick-entry bar to log your first expense!</p>
        </div>`;
      return;
    }

    // Group by date
    const grouped = {};
    expenses.forEach(e => {
      const dateStr = new Date(e.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      if (!grouped[dateStr]) grouped[dateStr] = [];
      grouped[dateStr].push(e);
    });

    const CAT_ICONS = { Food: 'restaurant', Shopping: 'shopping_bag', Transport: 'commute', Utilities: 'receipt_long', Health: 'health_and_safety', Other: 'more_horiz' };
    const CAT_CLASSES = { Food: 'cat-food', Shopping: 'cat-shopping', Transport: 'cat-transport', Utilities: 'cat-utilities', Health: 'cat-health', Other: 'cat-other' };

    let html = '';
    Object.keys(grouped).forEach(dateStr => {
      html += `<div class="date-divider"><span class="date-divider-badge">${dateStr}</span></div><div class="expense-group">`;

      grouped[dateStr].forEach(e => {
        const icon = CAT_ICONS[e.category] || CAT_ICONS.Other;
        const catClass = CAT_CLASSES[e.category] || CAT_CLASSES.Other;
        const time = new Date(e.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        html += `
          <div class="expense-card">
            <div class="expense-card-delete-bg" onclick="deleteExpense('${e.id}')">
              <span class="material-symbols-outlined">delete</span>
            </div>
            <div class="expense-card-inner swipe-action" onclick="openExpenseModal('${e.id}')">
              <div class="expense-left">
                <div class="expense-cat-icon ${catClass}">
                  <span class="material-symbols-outlined">${icon}</span>
                </div>
                <div class="expense-info">
                  <h4>${esc(e.description) || 'General Expense'}</h4>
                  <p>${e.category} • ${time}</p>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: var(--space-md);">
                <div class="expense-amount">- $${parseFloat(e.amount).toFixed(2)}</div>
                <button onclick="event.stopPropagation(); deleteExpense('${e.id}')" class="scope-action-btn scope-action-delete" title="Delete Expense">
                  <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
                </button>
              </div>
            </div>
          </div>`;
      });
      html += '</div>';
    });

    content.innerHTML = html;

    // Attach swipe gesture handlers
    document.querySelectorAll('.swipe-action').forEach(item => {
      let startX;
      item.addEventListener('touchstart', e => { startX = e.touches[0].clientX; });
      item.addEventListener('touchmove', e => {
        const diff = startX - e.touches[0].clientX;
        if (diff > 20 && diff < 100) item.style.transform = `translateX(-${diff}px)`;
      });
      item.addEventListener('touchend', () => { item.style.transform = ''; });
    });

  } catch (err) {
    console.error(err);
    showToast('Failed to load file transactions', 'error');
  }
}

// ════════════════════════════════════════════════
// Quick Add Expense (Chat bar)
// ════════════════════════════════════════════════
window.quickAddExpense = async function() {
  const input = document.getElementById('quick-expense-input');
  const text = input.value.trim();
  if (!text) return;

  // Parse: first number-like token = amount, rest = description
  const match = text.match(/^(\d+\.?\d*)\s*(.*)/);
  let amount = 0, description = text;
  if (match) {
    amount = parseFloat(match[1]);
    description = match[2] || 'Quick expense';
  } else {
    showToast('Start with an amount, e.g. "15.50 Coffee"', 'error');
    return;
  }

  try {
    const res = await authFetch(`${API_URL}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId: currentScopeId, amount, description, category: 'Other', date: new Date().toISOString() })
    });
    if (!res.ok) throw new Error();
    input.value = '';
    showToast('Expense logged!');
    renderFileFeed();
  } catch (err) { showToast('Failed to add expense', 'error'); }
};

// ════════════════════════════════════════════════
// Numpad
// ════════════════════════════════════════════════
window.pressNumpad = function(key) {
  const display = document.getElementById('expense-amount');
  if (key === 'backspace') {
    numpadVal = numpadVal.length > 1 ? numpadVal.slice(0, -1) : '0';
  } else if (key === '.') {
    if (!numpadVal.includes('.')) numpadVal += '.';
  } else {
    numpadVal = (numpadVal === '0' || numpadVal === '0.00') ? key : numpadVal + key;
  }
  const parsed = parseFloat(numpadVal);
  display.value = isNaN(parsed) ? '0.00' : (numpadVal.endsWith('.') ? numpadVal : parsed.toString());
};

// ════════════════════════════════════════════════
// Category Chip Selection
// ════════════════════════════════════════════════
window.selectCategoryChip = function(cat) {
  activeCategory = cat;
  document.querySelectorAll('.category-chip').forEach(el => el.classList.remove('active'));
  const active = document.querySelector(`.category-chip[data-cat="${cat}"]`);
  if (active) active.classList.add('active');
};

// ════════════════════════════════════════════════
// Expense Modal
// ════════════════════════════════════════════════
window.openExpenseModal = async function(expenseId = null) {
  const modal = document.getElementById('modal-expense');
  const title = document.getElementById('expense-modal-title');
  const idInput = document.getElementById('expense-id');
  const descInput = document.getElementById('expense-desc');
  const dateInput = document.getElementById('expense-datetime');

  numpadVal = '0.00';
  document.getElementById('expense-amount').value = '0.00';
  descInput.value = '';
  selectCategoryChip('Food');

  // Set current date/time
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  dateInput.value = now.toISOString().slice(0, 16);

  // Set reference labels
  const file = filesList.find(f => f.id === currentScopeId);
  if (file) {
    document.getElementById('expense-ref-name').textContent = file.name;
    const parent = file.folderId ? (foldersList.find(f => f.id === file.folderId)?.name || 'Folder') : 'Unsorted';
    document.getElementById('expense-ref-parent').textContent = parent;
  }

  if (expenseId) {
    title.textContent = 'Edit Expense';
    try {
      const res = await authFetch(`${API_URL}/expenses?fileId=${currentScopeId}`);
      if (!res.ok) throw new Error();
      const list = await res.json();
      const exp = list.find(e => e.id === expenseId);
      if (exp) {
        idInput.value = exp.id;
        numpadVal = parseFloat(exp.amount).toString();
        document.getElementById('expense-amount').value = parseFloat(exp.amount).toFixed(2);
        descInput.value = exp.description || '';
        selectCategoryChip(exp.category);
        const d = new Date(exp.date);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        dateInput.value = d.toISOString().slice(0, 16);
      }
    } catch (e) { showToast('Error loading expense', 'error'); }
  } else {
    title.textContent = 'New Expense';
    idInput.value = '';
  }
  modal.classList.remove('hidden');
};

window.closeExpenseModal = function() {
  document.getElementById('modal-expense').classList.add('hidden');
};

async function saveExpenseSubmit() {
  const id = document.getElementById('expense-id').value;
  const amount = parseFloat(document.getElementById('expense-amount').value);
  const description = document.getElementById('expense-desc').value.trim();
  const dateVal = document.getElementById('expense-datetime').value;

  if (isNaN(amount) || amount <= 0) { showToast('Enter a valid amount', 'error'); return; }
  if (!dateVal) { showToast('Select a date', 'error'); return; }

  try {
    const res = await authFetch(`${API_URL}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id || undefined, fileId: currentScopeId, amount, description, category: activeCategory, date: new Date(dateVal).toISOString() })
    });
    if (!res.ok) throw new Error();
    showToast(id ? 'Expense updated!' : 'Expense recorded!');
    closeExpenseModal();
    renderMainWorkspace();
  } catch (err) { showToast('Failed to save expense', 'error'); }
}

// ════════════════════════════════════════════════
// Folder Modal
// ════════════════════════════════════════════════
window.openFolderModal = function(folderId = null) {
  const modal = document.getElementById('modal-folder');
  const title = document.getElementById('folder-modal-title');
  const idInput = document.getElementById('modal-folder-id');
  const nameInput = document.getElementById('modal-folder-name');
  const walletInput = document.getElementById('modal-folder-wallet');

  if (folderId) {
    const folder = foldersList.find(f => f.id === folderId);
    title.textContent = 'Edit Folder';
    idInput.value = folder.id;
    nameInput.value = folder.name;
    walletInput.value = folder.walletLimit || '';
  } else {
    title.textContent = 'Create New Project';
    idInput.value = '';
    nameInput.value = '';
    walletInput.value = '';
  }
  modal.classList.remove('hidden');
  nameInput.focus();
};

window.closeFolderModal = function() {
  document.getElementById('modal-folder').classList.add('hidden');
};

async function handleFolderSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('modal-folder-id').value;
  const name = document.getElementById('modal-folder-name').value.trim();
  const walletLimit = document.getElementById('modal-folder-wallet').value;

  try {
    const res = await authFetch(`${API_URL}/folders`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id || undefined, name, walletLimit: walletLimit || null })
    });
    const data = await res.json();
    if (!res.ok) throw new Error();
    showToast(id ? 'Folder updated!' : 'Folder created!');
    closeFolderModal();
    await fetchFolders();
    renderSidebar();
    selectScope('folder', data.id);
  } catch (err) { showToast('Error saving folder', 'error'); }
}

// ════════════════════════════════════════════════
// File Modal
// ════════════════════════════════════════════════
window.openFileModal = function(folderId = null, fileId = null) {
  const modal = document.getElementById('modal-file');
  const title = document.getElementById('file-modal-title');
  const idInput = document.getElementById('modal-file-id');
  const folderInput = document.getElementById('modal-file-folder-id');
  const nameInput = document.getElementById('modal-file-name');
  const walletInput = document.getElementById('modal-file-wallet');

  if (fileId) {
    const file = filesList.find(f => f.id === fileId);
    title.textContent = 'Edit File';
    idInput.value = file.id;
    folderInput.value = file.folderId || '';
    nameInput.value = file.name;
    walletInput.value = file.walletLimit || '';
  } else {
    title.textContent = 'Create New File';
    idInput.value = '';
    folderInput.value = folderId || '';
    nameInput.value = '';
    walletInput.value = '';
  }
  modal.classList.remove('hidden');
  nameInput.focus();
};

window.closeFileModal = function() { document.getElementById('modal-file').classList.add('hidden'); };

async function handleFileSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('modal-file-id').value;
  const folderId = document.getElementById('modal-file-folder-id').value || null;
  const name = document.getElementById('modal-file-name').value.trim();
  const walletLimit = document.getElementById('modal-file-wallet').value;

  try {
    const res = await authFetch(`${API_URL}/files`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id || undefined, folderId, name, walletLimit: walletLimit || null })
    });
    const data = await res.json();
    if (!res.ok) throw new Error();
    showToast(id ? 'File updated!' : 'File created!');
    closeFileModal();
    await fetchFiles();
    renderSidebar();
    selectScope('file', data.id);
  } catch (err) { showToast('Error saving file', 'error'); }
}

// ════════════════════════════════════════════════
// Wallet Modal
// ════════════════════════════════════════════════
window.openWalletModal = function() {
  const scope = currentScopeType === 'file' ? filesList.find(f => f.id === currentScopeId) : foldersList.find(f => f.id === currentScopeId);
  if (!scope) return;
  document.getElementById('wallet-modal-scope-name').textContent = scope.name;
  document.getElementById('wallet-modal-limit').value = scope.walletLimit || 0;
  document.getElementById('modal-wallet').classList.remove('hidden');
};

window.closeWalletModal = function() { document.getElementById('modal-wallet').classList.add('hidden'); };

window.saveWalletLimit = async function() {
  const newLimit = document.getElementById('wallet-modal-limit').value;
  const endpoint = currentScopeType === 'file' ? `${API_URL}/files` : `${API_URL}/folders`;
  try {
    const res = await authFetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: currentScopeId, walletLimit: newLimit || null })
    });
    if (!res.ok) throw new Error();
    showToast('Wallet limit updated!');
    closeWalletModal();
    if (currentScopeType === 'file') { await fetchFiles(); } else { await fetchFolders(); }
    renderSidebar();
    renderMainWorkspace();
  } catch (err) { showToast('Failed to update wallet', 'error'); }
};

// ════════════════════════════════════════════════
// Delete Operations
// ════════════════════════════════════════════════
window.deleteFolder = async function(id) {
  if (!confirm('Delete this folder? All files and expenses inside will be permanently removed.')) return;
  try {
    const res = await authFetch(`${API_URL}/folders/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error();
    showToast('Folder deleted.');
    currentScopeType = null; currentScopeId = null;
    await initWorkspace();
  } catch (e) { showToast('Failed to delete folder', 'error'); }
};

window.deleteFile = async function(id) {
  if (!confirm('Delete this file and all its expenses?')) return;
  try {
    const res = await authFetch(`${API_URL}/files/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error();
    showToast('File deleted.');
    currentScopeType = null; currentScopeId = null;
    await initWorkspace();
  } catch (e) { showToast('Failed to delete file', 'error'); }
};

window.deleteExpense = async function(id) {
  if (!confirm('Delete this expense?')) return;
  try {
    const res = await authFetch(`${API_URL}/expenses/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error();
    showToast('Expense deleted.');
    renderMainWorkspace();
  } catch (e) { showToast('Failed to delete expense', 'error'); }
};

// ════════════════════════════════════════════════
// Utility
// ════════════════════════════════════════════════
function esc(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
