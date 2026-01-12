// Global state
let config = null;
let allIcons = [];
let currentIconType = 'light';
let editingId = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  await init();
});

// Initialize application
async function init() {
  try {
    // Load configuration
    const response = await window.api.getConfig();
    if (response.success) {
      config = response.config;
    } else {
      console.error('Failed to load config:', response.error);
      config = { shortcuts: [], settings: { runOnStartup: false } };
    }

    // Load icons list
    await loadIcons();

    // Render shortcuts list
    renderShortcutsList();

    // Setup event listeners
    setupEventListeners();

    console.log('Settings UI initialized');
  } catch (error) {
    console.error('Initialization error:', error);
  }
}

// Load available icons
async function loadIcons(iconType = 'light') {
  try {
    currentIconType = iconType;
    const response = await window.api.listIcons(iconType);
    if (response.success) {
      allIcons = response.icons;
      populateIconDropdown(allIcons);
      updateIconPreviewBackground();
    } else {
      console.error('Failed to load icons:', response.error);
      allIcons = [];
    }
  } catch (error) {
    console.error('Error loading icons:', error);
    allIcons = [];
  }
}

// Populate icon dropdown with all icons
function populateIconDropdown(icons) {
  const select = document.getElementById('iconSelect');
  select.innerHTML = '';

  if (icons.length === 0) {
    const option = document.createElement('option');
    option.textContent = 'No icons found';
    option.disabled = true;
    select.appendChild(option);
    return;
  }

  icons.forEach(icon => {
    const option = document.createElement('option');
    option.value = icon;
    option.textContent = cleanIconName(icon);
    option.dataset.iconName = icon;
    select.appendChild(option);
  });

  // Select first icon by default
  if (icons.length > 0) {
    select.selectedIndex = 0;
    updateIconPreview(icons[0]);
  }
}

// Clean icon name for display
function cleanIconName(filename) {
  return filename
    .replace(/\.png$/i, '')
    .replace(/_/g, ' ');
}

// Update icon preview
function updateIconPreview(filename) {
  const preview = document.getElementById('iconPreview');
  const name = document.getElementById('iconName');

  const iconFolder = currentIconType === 'light' ? 'icons' : 'icons-black';
  preview.src = `../${iconFolder}/${filename}`;
  name.textContent = cleanIconName(filename);
}

// Update icon preview background based on icon type
function updateIconPreviewBackground() {
  const preview = document.getElementById('iconPreview');

  // Remove both classes first
  preview.classList.remove('light-icons', 'dark-icons');

  // Add appropriate class based on current icon type
  if (currentIconType === 'light') {
    preview.classList.add('light-icons');
  } else {
    preview.classList.add('dark-icons');
  }
}

// Filter icons based on search term
function filterIcons(searchTerm) {
  const term = searchTerm.toLowerCase().trim();

  if (term === '') {
    // Show all icons
    populateIconDropdown(allIcons);
    return;
  }

  // Filter icons that match search term
  const filtered = allIcons.filter(icon => {
    const cleanName = cleanIconName(icon).toLowerCase();
    return cleanName.includes(term);
  });

  populateIconDropdown(filtered);
}

// Setup all event listeners
function setupEventListeners() {
  // Add shortcut button
  document.getElementById('addShortcutBtn').addEventListener('click', () => {
    openModal('add');
  });

  // Icon search
  document.getElementById('iconSearch').addEventListener('input', (e) => {
    filterIcons(e.target.value);
  });

  // Icon select change
  document.getElementById('iconSelect').addEventListener('change', (e) => {
    if (e.target.value) {
      updateIconPreview(e.target.value);
    }
  });

  // Icon type radio buttons
  document.querySelectorAll('input[name="iconType"]').forEach(radio => {
    radio.addEventListener('change', async (e) => {
      const iconType = e.target.value;
      await loadIcons(iconType);
    });
  });

  // Shortcut type change
  document.getElementById('shortcutType').addEventListener('change', (e) => {
    toggleConditionalFields(e.target.value);
  });

  // Modifier checkboxes and main key dropdown
  document.querySelectorAll('.modifier-key').forEach(checkbox => {
    checkbox.addEventListener('change', updateShortcutPreview);
  });
  document.getElementById('mainKey').addEventListener('change', updateShortcutPreview);

  // Browse executable button
  document.getElementById('browseExeBtn').addEventListener('click', browseForExe);

  // Form submit
  document.getElementById('shortcutForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveShortcut();
  });

  // Cancel button
  document.getElementById('cancelBtn').addEventListener('click', closeModal);

  // Modal overlay click
  document.querySelector('.modal-overlay').addEventListener('click', closeModal);

  // Escape key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.getElementById('editorModal').classList.contains('hidden')) {
      closeModal();
    }
  });
}

// Render shortcuts list
function renderShortcutsList() {
  const container = document.getElementById('shortcutsList');
  container.innerHTML = '';

  if (!config.shortcuts || config.shortcuts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No shortcuts configured</h3>
        <p>Click "Add New Shortcut" to create your first tray icon shortcut</p>
      </div>
    `;
    return;
  }

  config.shortcuts.forEach(shortcut => {
    const item = createShortcutListItem(shortcut);
    container.appendChild(item);
  });
}

// Create shortcut list item element
function createShortcutListItem(shortcut) {
  const div = document.createElement('div');
  div.className = 'shortcut-item';

  // Use iconType if available, default to 'light' for backward compatibility
  const iconFolder = (shortcut.iconType === 'dark') ? 'icons-black' : 'icons';
  const iconSrc = `../${iconFolder}/${shortcut.icon}`;
  const iconClass = (shortcut.iconType === 'dark') ? 'dark-icon' : 'light-icon';

  let detailText = '';
  if (shortcut.type === 'keyboard') {
    detailText = `Keys: ${shortcut.action.keys.join(' + ')}`;
  } else if (shortcut.type === 'executable') {
    detailText = `Path: ${shortcut.action.path}`;
  }

  div.innerHTML = `
    <img src="${iconSrc}" class="${iconClass}" alt="${shortcut.name}" onerror="this.src='../tray-icon.png'">
    <div class="shortcut-info">
      <h3>${shortcut.name}</h3>
      <p class="shortcut-detail">
        ${detailText}
        <span class="shortcut-type">${shortcut.type}</span>
      </p>
    </div>
    <div class="shortcut-actions">
      <button class="btn btn-success" onclick="editShortcut('${shortcut.id}')">Edit</button>
      <button class="btn btn-danger" onclick="deleteShortcut('${shortcut.id}')">Delete</button>
    </div>
  `;

  return div;
}

// Open modal for add/edit
function openModal(mode, shortcut = null) {
  editingId = shortcut ? shortcut.id : null;
  const modal = document.getElementById('editorModal');
  const title = document.getElementById('modalTitle');

  title.textContent = mode === 'add' ? 'Add Shortcut' : 'Edit Shortcut';

  // Reset form
  document.getElementById('shortcutForm').reset();

  if (shortcut) {
    // Populate form with existing shortcut data
    document.getElementById('shortcutName').value = shortcut.name;
    document.getElementById('shortcutType').value = shortcut.type;

    // Set icon type radio button (default to 'light' if not specified)
    const iconType = shortcut.iconType || 'light';
    document.querySelector(`input[name="iconType"][value="${iconType}"]`).checked = true;

    // Load icons of the correct type
    loadIcons(iconType).then(() => {
      // Select the icon after icons are loaded
      const iconSelect = document.getElementById('iconSelect');
      iconSelect.value = shortcut.icon;
      updateIconPreview(shortcut.icon);
    });

    if (shortcut.type === 'keyboard') {
      const keys = shortcut.action.keys;
      const mainKey = keys[keys.length - 1];
      const modifiers = keys.slice(0, -1);

      // Check the modifier checkboxes
      modifiers.forEach(mod => {
        const checkbox = document.querySelector(`.modifier-key[value="${mod}"]`);
        if (checkbox) checkbox.checked = true;
      });

      // Select the main key
      document.getElementById('mainKey').value = mainKey;
      updateShortcutPreview();
    } else if (shortcut.type === 'executable') {
      document.getElementById('exePath').value = shortcut.action.path;
      document.getElementById('exeArgs').value = shortcut.action.args ? shortcut.action.args.join(' ') : '';
    }
  }

  toggleConditionalFields(document.getElementById('shortcutType').value);
  modal.classList.remove('hidden');
}

// Close modal
function closeModal() {
  const modal = document.getElementById('editorModal');
  modal.classList.add('hidden');
  editingId = null;
}

// Toggle conditional fields based on shortcut type
function toggleConditionalFields(type) {
  const keyboardFields = document.getElementById('keyboardFields');
  const executableFields = document.getElementById('executableFields');

  if (type === 'keyboard') {
    keyboardFields.classList.remove('hidden');
    executableFields.classList.add('hidden');
  } else {
    keyboardFields.classList.add('hidden');
    executableFields.classList.remove('hidden');
  }
}

// Update shortcut preview based on dropdown selections
function updateShortcutPreview() {
  const modifiers = Array.from(document.querySelectorAll('.modifier-key:checked'))
    .map(cb => cb.value);
  const mainKey = document.getElementById('mainKey').value;

  const preview = document.getElementById('shortcutPreview');
  if (!mainKey) {
    preview.textContent = 'No shortcut selected';
    return;
  }

  // Map internal key names to display names
  const keyNames = {
    'control': 'Ctrl',
    'shift': 'Shift',
    'alt': 'Alt',
    'command': 'Win',
    'escape': 'Escape',
    'tab': 'Tab',
    'enter': 'Enter',
    'space': 'Space',
    'backspace': 'Backspace',
    'delete': 'Delete',
    'insert': 'Insert',
    'printscreen': 'Print Screen',
    'home': 'Home',
    'end': 'End',
    'pageup': 'Page Up',
    'pagedown': 'Page Down',
    'up': 'Arrow Up',
    'down': 'Arrow Down',
    'left': 'Arrow Left',
    'right': 'Arrow Right',
    'numpad_0': 'Numpad 0',
    'numpad_1': 'Numpad 1',
    'numpad_2': 'Numpad 2',
    'numpad_3': 'Numpad 3',
    'numpad_4': 'Numpad 4',
    'numpad_5': 'Numpad 5',
    'numpad_6': 'Numpad 6',
    'numpad_7': 'Numpad 7',
    'numpad_8': 'Numpad 8',
    'numpad_9': 'Numpad 9'
  };

  const displayKeys = modifiers.map(m => keyNames[m] || m);
  displayKeys.push(keyNames[mainKey] || mainKey.toUpperCase());
  preview.textContent = displayKeys.join(' + ');
}

// Browse for executable
async function browseForExe() {
  const response = await window.api.selectExeFile();

  if (response.success && response.path) {
    document.getElementById('exePath').value = response.path;
  }
}

// Save shortcut
async function saveShortcut() {
  const name = document.getElementById('shortcutName').value.trim();
  const type = document.getElementById('shortcutType').value;
  const icon = document.getElementById('iconSelect').value;

  if (!name) {
    alert('Please enter a shortcut name');
    return;
  }

  if (!icon) {
    alert('Please select an icon');
    return;
  }

  let action = {};

  if (type === 'keyboard') {
    const modifiers = Array.from(document.querySelectorAll('.modifier-key:checked'))
      .map(cb => cb.value);
    const mainKey = document.getElementById('mainKey').value;

    if (!mainKey) {
      alert('Please select a main key');
      return;
    }

    action = { keys: [...modifiers, mainKey] };
  } else {
    const path = document.getElementById('exePath').value.trim();
    if (!path) {
      alert('Please select an executable');
      return;
    }

    const argsText = document.getElementById('exeArgs').value.trim();
    const args = argsText ? argsText.split(/\s+/) : [];

    action = { path, args };
  }

  // Get selected icon type
  const iconType = document.querySelector('input[name="iconType"]:checked').value;

  const shortcut = {
    name,
    type,
    icon,
    iconType,
    enabled: true,
    action
  };

  if (editingId) {
    // Update existing shortcut
    const index = config.shortcuts.findIndex(s => s.id === editingId);
    if (index !== -1) {
      config.shortcuts[index] = { ...shortcut, id: editingId };
    }
  } else {
    // Add new shortcut with generated ID
    shortcut.id = generateUUID();
    config.shortcuts.push(shortcut);
  }

  // Save config
  const response = await window.api.saveConfig(config);

  if (response.success) {
    // Reload config to get any server-side changes (like generated IDs)
    const newConfig = await window.api.getConfig();
    if (newConfig.success) {
      config = newConfig.config;
    }

    renderShortcutsList();
    closeModal();
  } else {
    alert('Failed to save shortcut: ' + (response.error || 'Unknown error'));
  }
}

// Edit shortcut (called from HTML onclick)
function editShortcut(id) {
  const shortcut = config.shortcuts.find(s => s.id === id);
  if (shortcut) {
    openModal('edit', shortcut);
  }
}

// Delete shortcut (called from HTML onclick)
async function deleteShortcut(id) {
  if (!confirm('Are you sure you want to delete this shortcut?')) {
    return;
  }

  config.shortcuts = config.shortcuts.filter(s => s.id !== id);

  const response = await window.api.saveConfig(config);

  if (response.success) {
    renderShortcutsList();
  } else {
    alert('Failed to delete shortcut: ' + (response.error || 'Unknown error'));
  }
}

// Generate UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
