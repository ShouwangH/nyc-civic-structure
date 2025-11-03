// ABOUTME: Frontend JavaScript for data backfill tool
// ABOUTME: Handles authentication, node listing, and editing with API calls

// State
let authToken = sessionStorage.getItem('adminToken') || '';
let nodes = [];
let currentNode = null;

// DOM Elements
const authSection = document.getElementById('authSection');
const mainContent = document.getElementById('mainContent');
const passwordInput = document.getElementById('passwordInput');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authError = document.getElementById('authError');
const scopeFilter = document.getElementById('scopeFilter');
const searchInput = document.getElementById('searchInput');
const nodeList = document.getElementById('nodeList');
const editModal = document.getElementById('editModal');
const closeModal = document.getElementById('closeModal');
const editForm = document.getElementById('editForm');
const cancelBtn = document.getElementById('cancelBtn');
const formError = document.getElementById('formError');
const formSuccess = document.getElementById('formSuccess');

// Initialize
if (authToken) {
  showMainContent();
  loadNodes();
}

// Auth
loginBtn.addEventListener('click', handleLogin);
passwordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleLogin();
});

logoutBtn.addEventListener('click', () => {
  authToken = '';
  sessionStorage.removeItem('adminToken');
  showAuthSection();
});

async function handleLogin() {
  const password = passwordInput.value.trim();
  if (!password) {
    authError.textContent = 'Please enter a password';
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = 'Verifying...';
  authError.textContent = '';

  try {
    // Test auth by calling API
    const response = await fetch('/api/admin/nodes', {
      headers: { 'Authorization': `Bearer ${password}` }
    });

    if (response.ok) {
      authToken = password;
      sessionStorage.setItem('adminToken', password);
      showMainContent();
      await loadNodes();
    } else {
      authError.textContent = 'Invalid password';
    }
  } catch (error) {
    authError.textContent = 'Connection error. Please try again.';
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Login';
  }
}

function showAuthSection() {
  authSection.classList.remove('hidden');
  mainContent.classList.add('hidden');
  logoutBtn.classList.add('hidden');
  passwordInput.value = '';
  authError.textContent = '';
}

function showMainContent() {
  authSection.classList.add('hidden');
  mainContent.classList.remove('hidden');
  logoutBtn.classList.remove('hidden');
}

// Load Nodes
async function loadNodes(scopeFilter = '') {
  try {
    const url = scopeFilter
      ? `/api/admin/nodes?scope=${scopeFilter}`
      : '/api/admin/nodes';

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to load nodes');
    }

    const result = await response.json();
    nodes = result.data || [];
    renderNodes();
  } catch (error) {
    console.error('Error loading nodes:', error);
    nodeList.innerHTML = '<p style="text-align: center; color: #dc2626;">Failed to load nodes. Please refresh.</p>';
  }
}

// Render Nodes
function renderNodes() {
  const searchTerm = searchInput.value.toLowerCase();
  const filteredNodes = nodes.filter(node => {
    const matchesSearch =
      node.label.toLowerCase().includes(searchTerm) ||
      node.factoid.toLowerCase().includes(searchTerm) ||
      node.id.toLowerCase().includes(searchTerm);
    return matchesSearch;
  });

  if (filteredNodes.length === 0) {
    nodeList.innerHTML = '<p style="text-align: center; color: #6b7280;">No nodes found</p>';
    return;
  }

  nodeList.innerHTML = filteredNodes
    .map(node => `
      <div class="node-card" data-id="${node.id}">
        <div class="node-card-header">
          <div class="node-label">${escapeHtml(node.label)}</div>
          <div class="node-meta">
            <span class="badge">${escapeHtml(node.scopeId)}</span>
            <span class="badge">${escapeHtml(node.type)}</span>
          </div>
        </div>
        <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">
          ${escapeHtml(node.branch)}
        </div>
        <div class="node-factoid">
          ${escapeHtml(node.factoid || '(No factoid)')}
        </div>
      </div>
    `)
    .join('');

  // Add click handlers
  document.querySelectorAll('.node-card').forEach(card => {
    card.addEventListener('click', () => {
      const nodeId = card.dataset.id;
      const node = nodes.find(n => n.id === nodeId);
      if (node) openEditModal(node);
    });
  });
}

// Filters
scopeFilter.addEventListener('change', (e) => {
  loadNodes(e.target.value);
});

searchInput.addEventListener('input', renderNodes);

// Edit Modal
function openEditModal(node) {
  currentNode = node;
  document.getElementById('nodeId').value = node.id;
  document.getElementById('nodeLabel').value = node.label;
  document.getElementById('nodeType').value = node.type;
  document.getElementById('nodeBranch').value = node.branch;
  document.getElementById('nodeFactoid').value = node.factoid || '';
  formError.textContent = '';
  formSuccess.textContent = '';
  editModal.classList.add('active');
}

function closeEditModal() {
  editModal.classList.remove('active');
  currentNode = null;
}

closeModal.addEventListener('click', closeEditModal);
cancelBtn.addEventListener('click', closeEditModal);

editModal.addEventListener('click', (e) => {
  if (e.target === editModal) closeEditModal();
});

// Submit Form
editForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!currentNode) return;

  const data = {
    label: document.getElementById('nodeLabel').value.trim(),
    type: document.getElementById('nodeType').value.trim(),
    branch: document.getElementById('nodeBranch').value.trim(),
    factoid: document.getElementById('nodeFactoid').value.trim(),
  };

  formError.textContent = '';
  formSuccess.textContent = '';
  const saveBtn = document.getElementById('saveBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const response = await fetch(`/api/admin/nodes/${currentNode.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to save');
    }

    formSuccess.textContent = 'Saved successfully!';

    // Update local data
    const index = nodes.findIndex(n => n.id === currentNode.id);
    if (index !== -1) {
      nodes[index] = { ...nodes[index], ...data };
      renderNodes();
    }

    setTimeout(() => {
      closeEditModal();
    }, 1000);
  } catch (error) {
    formError.textContent = error.message;
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Changes';
  }
});

// Utilities
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
