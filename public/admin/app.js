// ABOUTME: Frontend JavaScript for data backfill tool
// ABOUTME: Handles authentication, node listing, and editing with API calls

// State
let authToken = sessionStorage.getItem('adminToken') || '';
let entities = [];
let currentEntity = null;
let currentEntityType = 'nodes';

// DOM Elements
const authSection = document.getElementById('authSection');
const mainContent = document.getElementById('mainContent');
const passwordInput = document.getElementById('passwordInput');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authError = document.getElementById('authError');
const entityTypeFilter = document.getElementById('entityTypeFilter');
const scopeFilter = document.getElementById('scopeFilter');
const searchInput = document.getElementById('searchInput');
const entityList = document.getElementById('entityList');
const editModal = document.getElementById('editModal');
const modalTitle = document.getElementById('modalTitle');
const closeModal = document.getElementById('closeModal');
const editForm = document.getElementById('editForm');
const cancelBtn = document.getElementById('cancelBtn');
const formError = document.getElementById('formError');
const formSuccess = document.getElementById('formSuccess');

// Initialize
if (authToken) {
  showMainContent();
  loadEntities();
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
      await loadEntities();
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

// Load Entities (nodes or processes)
async function loadEntities(scopeFilterValue = '') {
  try {
    const url = scopeFilterValue
      ? `/api/admin/${currentEntityType}?scope=${scopeFilterValue}`
      : `/api/admin/${currentEntityType}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to load ${currentEntityType}`);
    }

    const result = await response.json();
    entities = result.data || [];
    renderEntities();
  } catch (error) {
    console.error(`Error loading ${currentEntityType}:`, error);
    entityList.innerHTML = `<p style="text-align: center; color: #dc2626;">Failed to load ${currentEntityType}. Please refresh.</p>`;
  }
}

// Render Entities
function renderEntities() {
  const searchTerm = searchInput.value.toLowerCase();
  const filteredEntities = entities.filter(entity => {
    const matchesSearch =
      entity.label.toLowerCase().includes(searchTerm) ||
      entity.id.toLowerCase().includes(searchTerm) ||
      (entity.factoid && entity.factoid.toLowerCase().includes(searchTerm)) ||
      (entity.description && entity.description.toLowerCase().includes(searchTerm));
    return matchesSearch;
  });

  if (filteredEntities.length === 0) {
    entityList.innerHTML = `<p style="text-align: center; color: #6b7280;">No ${currentEntityType} found</p>`;
    return;
  }

  if (currentEntityType === 'nodes') {
    entityList.innerHTML = filteredEntities
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
  } else {
    // Render processes
    entityList.innerHTML = filteredEntities
      .map(process => `
        <div class="node-card" data-id="${process.id}">
          <div class="node-card-header">
            <div class="node-label">${escapeHtml(process.label)}</div>
            <div class="node-meta">
              <span class="badge">${escapeHtml(process.scopeId)}</span>
            </div>
          </div>
          <div class="node-factoid">
            ${escapeHtml(process.description || '(No description)')}
          </div>
        </div>
      `)
      .join('');
  }

  // Add click handlers
  document.querySelectorAll('.node-card').forEach(card => {
    card.addEventListener('click', () => {
      const entityId = card.dataset.id;
      const entity = entities.find(e => e.id === entityId);
      if (entity) openEditModal(entity);
    });
  });
}

// Filters
entityTypeFilter.addEventListener('change', (e) => {
  currentEntityType = e.target.value;
  loadEntities(scopeFilter.value);
});

scopeFilter.addEventListener('change', (e) => {
  loadEntities(e.target.value);
});

searchInput.addEventListener('input', renderEntities);

// Edit Modal
function openEditModal(entity) {
  currentEntity = entity;

  // Set common fields
  document.getElementById('entityId').value = entity.id;
  document.getElementById('entityLabel').value = entity.label;

  // Show/hide fields based on entity type
  const nodeFields = document.querySelectorAll('.node-field');
  const processFields = document.querySelectorAll('.process-field');

  if (currentEntityType === 'nodes') {
    modalTitle.textContent = 'Edit Node';
    nodeFields.forEach(field => field.style.display = 'block');
    processFields.forEach(field => field.style.display = 'none');

    // Enable required validation for node fields
    document.getElementById('nodeType').required = true;
    document.getElementById('nodeBranch').required = true;
    document.getElementById('processDescription').required = false;

    document.getElementById('nodeType').value = entity.type;
    document.getElementById('nodeBranch').value = entity.branch;
    document.getElementById('nodeFactoid').value = entity.factoid || '';
  } else {
    modalTitle.textContent = 'Edit Process';
    nodeFields.forEach(field => field.style.display = 'none');
    processFields.forEach(field => field.style.display = 'block');

    // Enable required validation for process fields
    document.getElementById('nodeType').required = false;
    document.getElementById('nodeBranch').required = false;
    document.getElementById('processDescription').required = true;

    document.getElementById('processDescription').value = entity.description || '';
  }

  formError.textContent = '';
  formSuccess.textContent = '';
  editModal.classList.add('active');
}

function closeEditModal() {
  editModal.classList.remove('active');
  currentEntity = null;
}

closeModal.addEventListener('click', closeEditModal);
cancelBtn.addEventListener('click', closeEditModal);

editModal.addEventListener('click', (e) => {
  if (e.target === editModal) closeEditModal();
});

// Submit Form
editForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!currentEntity) return;

  let data;
  if (currentEntityType === 'nodes') {
    data = {
      label: document.getElementById('entityLabel').value.trim(),
      type: document.getElementById('nodeType').value.trim(),
      branch: document.getElementById('nodeBranch').value.trim(),
      factoid: document.getElementById('nodeFactoid').value.trim(),
    };
  } else {
    data = {
      label: document.getElementById('entityLabel').value.trim(),
      description: document.getElementById('processDescription').value.trim(),
    };
  }

  formError.textContent = '';
  formSuccess.textContent = '';
  const saveBtn = document.getElementById('saveBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const response = await fetch(`/api/admin/${currentEntityType}/${currentEntity.id}`, {
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
    const index = entities.findIndex(e => e.id === currentEntity.id);
    if (index !== -1) {
      entities[index] = { ...entities[index], ...data };
      renderEntities();
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
