// ===== API CONFIG =====
const API_URL = 'http://localhost:5000/api';
let authToken = localStorage.getItem('mst_token') || null;
let currentUser = null;
let allInventory = [];

// ===== API HELPER =====
async function api(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  let res;
  try {
    res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  } catch (err) {
    if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
      throw new Error('Server is unavailable. Please check your connection and try again.');
    }
    throw new Error('Network error. Please check your connection.');
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error('Server returned an invalid response.');
  }

  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
}

// ===== EMPTY STATE HELPERS =====
function emptyStateHTML(message, icon = 'fa-inbox') {
  return `<tr><td colspan="7" style="text-align:center;padding:40px 20px;color:var(--gray)">
    <i class="fas ${icon}" style="font-size:32px;margin-bottom:12px;display:block;opacity:0.5"></i>
    <p style="font-size:14px;margin:0">${message}</p>
  </td></tr>`;
}

function emptyStateHTML6(message, icon = 'fa-inbox') {
  return `<tr><td colspan="6" style="text-align:center;padding:40px 20px;color:var(--gray)">
    <i class="fas ${icon}" style="font-size:32px;margin-bottom:12px;display:block;opacity:0.5"></i>
    <p style="font-size:14px;margin:0">${message}</p>
  </td></tr>`;
}

// ===== AUTH & LOGIN =====
function togglePassword() {
  const pwd = document.getElementById('password');
  const icon = document.querySelector('.toggle-password i');
  if (pwd.type === 'password') {
    pwd.type = 'text';
    icon.classList.replace('fa-eye', 'fa-eye-slash');
  } else {
    pwd.type = 'password';
    icon.classList.replace('fa-eye-slash', 'fa-eye');
  }
}

document.getElementById('login-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const email = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    showToast('Please enter email and password', 'error');
    return;
  }

  const loginBtn = this.querySelector('.login-btn');
  loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
  loginBtn.disabled = true;

  try {
    const res = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    authToken = res.data.token;
    currentUser = res.data.user;
    localStorage.setItem('mst_token', authToken);
    localStorage.setItem('mst_user', JSON.stringify(currentUser));

    enterDashboard();
    showToast(`Welcome back, ${currentUser.fullName}!`);
  } catch (err) {
    showToast(err.message || 'Login failed. Check your email and password.', 'error');
  } finally {
    loginBtn.innerHTML = '<i class="fas fa-right-to-bracket"></i> Sign In';
    loginBtn.disabled = false;
  }
});

function enterDashboard() {
  const roleNames = {
    'admin': 'Administrator', 'supply-manager': 'Supply Manager', 'base-officer': 'Base Officer',
    'logistics-officer': 'Logistics Officer', 'warehouse-officer': 'Warehouse Officer',
    'transport-officer': 'Transport Officer', 'inventory-manager': 'Inventory Manager',
    'auditor': 'Auditor', 'emergency-response-officer': 'Emergency Response Officer', 'viewer': 'Viewer'
  };
  document.getElementById('sidebar-user-name').textContent = currentUser.fullName;
  document.getElementById('sidebar-user-role').textContent = roleNames[currentUser.role] || currentUser.role;
  document.getElementById('navbar-user-name').textContent = currentUser.fullName.split(' ')[0];
  document.getElementById('settings-role').textContent = roleNames[currentUser.role] || currentUser.role;

  document.getElementById('login-page').classList.add('hidden');
  document.getElementById('main-app').classList.remove('hidden');

  loadDashboard();
  loadInventory();
  loadShipments();
  loadAlerts();
  loadNotifications();
  applyRoleBasedUI();
  if (currentUser.role === 'admin') loadUsers();
}

function logout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('mst_token');
  localStorage.removeItem('mst_user');
  document.getElementById('main-app').classList.add('hidden');
  document.getElementById('login-page').classList.remove('hidden');
  document.getElementById('login-form').reset();
  closeAllDropdowns();
}

// Auto-login if token exists
window.addEventListener('DOMContentLoaded', async () => {
  const savedToken = localStorage.getItem('mst_token');
  const savedUser = localStorage.getItem('mst_user');

  if (savedToken && savedUser) {
    authToken = savedToken;
    try {
      const res = await api('/auth/profile');
      currentUser = res.data;
      enterDashboard();
    } catch {
      localStorage.removeItem('mst_token');
      localStorage.removeItem('mst_user');
      authToken = null;
      currentUser = null;
    }
  }
});

// ===== NAVIGATION =====
function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const navLink = document.querySelector(`.nav-link[data-page="${page}"]`);
  if (navLink) navLink.classList.add('active');
  closeAllDropdowns();
  if (page === 'reports') setTimeout(initReportCharts, 100);
  if (page === 'dashboard') loadDashboard();
  if (page === 'alerts') loadAlerts();
  if (page === 'users' && currentUser?.role === 'admin') loadUsers();
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }
function toggleUserDropdown() { document.getElementById('user-dropdown-menu').classList.toggle('show'); }
function toggleNotifications() { document.getElementById('notification-panel').classList.toggle('hidden'); }

function closeAllDropdowns() {
  document.getElementById('user-dropdown-menu').classList.remove('show');
  document.getElementById('notification-panel').classList.add('hidden');
}

document.addEventListener('click', function(e) {
  if (!e.target.closest('.user-dropdown')) document.getElementById('user-dropdown-menu').classList.remove('show');
  if (!e.target.closest('.notification-panel') && !e.target.closest('.nav-icon-btn')) document.getElementById('notification-panel').classList.add('hidden');
});

// ===== MODALS =====
function openModal(id) { document.getElementById(id).classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); document.body.style.overflow = ''; }

// ===== TOAST =====
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const icon = toast.querySelector('i');
  document.getElementById('toast-message').textContent = message;
  icon.className = type === 'success' ? 'fas fa-check-circle' : type === 'error' ? 'fas fa-times-circle' : 'fas fa-info-circle';
  icon.style.color = type === 'success' ? 'var(--green)' : type === 'error' ? 'var(--red)' : 'var(--blue)';
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3500);
}

// ===== DASHBOARD =====
async function loadDashboard() {
  try {
    const res = await api('/dashboard/summary');
    const d = res.data;

    const cards = document.querySelectorAll('.stat-card');
    if (cards.length >= 4) {
      cards[0].querySelector('h3').textContent = d.totalSupplies?.toLocaleString() || '0';
      cards[1].querySelector('h3').textContent = d.activeShipments || '0';
      cards[2].querySelector('h3').textContent = d.deliveredShipments?.toLocaleString() || '0';
      cards[3].querySelector('h3').textContent = d.lowStockAlerts || '0';
    }

    const navBadge = document.querySelector('.nav-badge');
    if (navBadge) navBadge.textContent = d.lowStockAlerts || 0;

    initCharts(d);
    renderRecentActivity(d.recentActivity || []);
  } catch (err) {
    console.error('Dashboard load error:', err);
    showEmptyDashboard();
  }
}

function showEmptyDashboard() {
  const cards = document.querySelectorAll('.stat-card h3');
  cards.forEach(c => c.textContent = '0');
  initCharts({ inventoryByCategory: [], shipmentStatusDistribution: [], recentActivity: [] });
  renderRecentActivity([]);
}

function renderRecentActivity(activities) {
  const list = document.querySelector('.activity-list');
  if (!list) return;
  if (!activities.length) {
    list.innerHTML = '<div class="activity-item" style="justify-content:center;color:var(--gray)"><p>No recent activity</p></div>';
    return;
  }
  list.innerHTML = activities.map(a => {
    const icon = a.status === 'Low Stock' ? 'fa-exclamation' : a.status === 'Out of Stock' ? 'fa-times' : 'fa-box';
    const bg = a.status === 'Low Stock' ? 'bg-red' : a.status === 'Out of Stock' ? 'bg-red' : 'bg-blue';
    return `<div class="activity-item">
      <div class="activity-icon ${bg}"><i class="fas ${icon}"></i></div>
      <div class="activity-info">
        <p>${a.itemName} - ${a.quantity} units (${a.status})</p>
        <span>${a.updatedAt ? new Date(a.updatedAt).toLocaleDateString() : ''}</span>
      </div>
    </div>`;
  }).join('');
}

// ===== INVENTORY =====
async function loadInventory() {
  try {
    const res = await api('/inventory?limit=50');
    allInventory = res.data.inventory || [];
    renderInventoryTable(allInventory);
  } catch (err) {
    console.error('Inventory load error:', err);
    allInventory = [];
    renderInventoryTable([]);
  }
}

function renderInventoryTable(data) {
  const tbody = document.getElementById('inventory-tbody');
  if (!data || data.length === 0) {
    tbody.innerHTML = emptyStateHTML('No Inventory Found', 'fa-boxes-stacked');
    return;
  }
  tbody.innerHTML = data.map(item => {
    const statusClass = item.status === 'In Stock' ? 'in-stock' : item.status === 'Low Stock' ? 'low-stock' : 'out-of-stock';
    const updated = item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : '-';
    return `
      <tr>
        <td><strong>${item.itemId}</strong></td>
        <td>${item.itemName}</td>
        <td>${item.category}</td>
        <td>${item.quantity.toLocaleString()}</td>
        <td><span class="status-badge ${statusClass}">${item.status}</span></td>
        <td>${updated}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="editInventory('${item._id}')" title="Edit"><i class="fas fa-pen"></i></button>
          <button class="btn btn-sm btn-outline" onclick="deleteInventory('${item._id}')" title="Delete" style="margin-left:4px;color:var(--red)"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`;
  }).join('');
}

function filterInventory() {
  const search = document.getElementById('inventory-search').value.toLowerCase();
  const category = document.getElementById('category-filter').value;
  const status = document.getElementById('status-filter').value;
  const filtered = allInventory.filter(item => {
    const matchSearch = !search || item.itemId.toLowerCase().includes(search) || item.itemName.toLowerCase().includes(search);
    const matchCategory = !category || item.category === category;
    const matchStatus = !status || item.status === status;
    return matchSearch && matchCategory && matchStatus;
  });
  renderInventoryTable(filtered);
}

async function addInventory(e) {
  e.preventDefault();
  const form = e.target;
  const inputs = form.querySelectorAll('input, select, textarea');
  const body = {};
  inputs.forEach(inp => { if (inp.name) body[inp.name] = inp.value; });

  try {
    await api('/inventory', { method: 'POST', body: JSON.stringify(body) });
    closeModal('add-inventory-modal');
    showToast('Inventory item added successfully');
    form.reset();
    loadInventory();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteInventory(id) {
  if (!confirm('Are you sure you want to delete this item?')) return;
  try {
    await api(`/inventory/${id}`, { method: 'DELETE' });
    showToast('Inventory item deleted');
    loadInventory();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function editInventory(id) {
  const item = allInventory.find(i => i._id === id);
  if (!item) return;
  const newQty = prompt(`Update quantity for ${item.itemName}:`, item.quantity);
  if (newQty === null) return;
  try {
    await api(`/inventory/${id}`, { method: 'PUT', body: JSON.stringify({ quantity: parseInt(newQty) }) });
    showToast('Inventory updated');
    loadInventory();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ===== SHIPMENTS =====
async function loadShipments() {
  try {
    const res = await api('/shipments?limit=50');
    const shipments = res.data.shipments || [];
    renderShipmentTable(shipments);
    updateShipmentStats(shipments);
    renderTimeline(shipments);
  } catch (err) {
    console.error('Shipments load error:', err);
    renderShipmentTable([]);
    updateShipmentStats([]);
    renderTimeline([]);
  }
}

function renderShipmentTable(shipments) {
  const tbody = document.getElementById('shipment-tbody');
  if (!shipments || shipments.length === 0) {
    tbody.innerHTML = emptyStateHTML('No Shipments Found', 'fa-truck');
    return;
  }
  tbody.innerHTML = shipments.map(s => {
    const statusClass = s.currentStatus.toLowerCase().replace(/\s/g, '-');
    const date = s.dispatchDate ? new Date(s.dispatchDate).toLocaleDateString() : '-';
    return `
      <tr>
        <td><strong>${s.shipmentId}</strong></td>
        <td>${date}</td>
        <td>${s.originBase}</td>
        <td>${s.destinationBase}</td>
        <td>${s.totalQuantity.toLocaleString()}</td>
        <td><span class="status-badge ${statusClass}">${s.currentStatus}</span></td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="viewShipment('${s._id}')" title="View"><i class="fas fa-eye"></i></button>
          ${s.currentStatus !== 'Delivered' ? `<button class="btn btn-sm btn-outline" onclick="advanceStatus('${s._id}','${s.currentStatus}')" title="Advance Status" style="margin-left:4px;color:var(--green)"><i class="fas fa-arrow-right"></i></button>` : ''}
        </td>
      </tr>`;
  }).join('');
}

function updateShipmentStats(shipments) {
  const stats = { Packed: 0, Dispatched: 0, 'In Transit': 0, Delivered: 0 };
  (shipments || []).forEach(s => { if (stats[s.currentStatus] !== undefined) stats[s.currentStatus]++; });
  const cards = document.querySelectorAll('.shipment-stat-card .ss-info h4');
  if (cards.length >= 4) {
    cards[0].textContent = stats.Packed;
    cards[1].textContent = stats.Dispatched;
    cards[2].textContent = stats['In Transit'];
    cards[3].textContent = stats.Delivered;
  }
}

function renderTimeline(shipments) {
  const timeline = document.querySelector('.timeline');
  if (!timeline) return;
  const active = (shipments || []).filter(s => s.currentStatus !== 'Delivered').slice(0, 5);
  if (!active.length) {
    timeline.innerHTML = '<div class="timeline-item" style="text-align:center;color:var(--gray);padding:20px"><p>No active shipments in timeline</p></div>';
    return;
  }
  timeline.innerHTML = active.map(s => {
    const statusClass = s.currentStatus.toLowerCase().replace(/\s/g, '');
    const date = s.dispatchDate ? new Date(s.dispatchDate).toLocaleDateString() : '';
    return `
      <div class="timeline-item">
        <div class="timeline-dot ${statusClass}"></div>
        <div class="timeline-content">
          <div class="timeline-header">
            <span class="timeline-id">${s.shipmentId}</span>
            <span class="status-badge ${statusClass}">${s.currentStatus}</span>
          </div>
          <p>${s.items?.[0]?.itemName || 'Supplies'} (${s.totalQuantity} units) - ${s.originBase} to ${s.destinationBase}</p>
          <span class="timeline-date">${s.currentStatus}: ${date}</span>
        </div>
      </div>`;
  }).join('');
}

async function advanceStatus(id, currentStatus) {
  const transitions = { 'Packed': 'Dispatched', 'Dispatched': 'In Transit', 'In Transit': 'Delivered' };
  const next = transitions[currentStatus];
  if (!next) return;
  try {
    await api(`/shipments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: next }) });
    showToast(`Shipment updated to ${next}`);
    loadShipments();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function viewShipment(id) {
  try {
    const res = await api(`/shipments/${id}`);
    const s = res.data;
    const history = s.trackingHistory?.map(t => `${t.status} - ${new Date(t.timestamp).toLocaleString()}`).join('\n') || 'No tracking history';
    alert(`${s.shipmentId}\nRoute: ${s.originBase} → ${s.destinationBase}\nStatus: ${s.currentStatus}\nQuantity: ${s.totalQuantity}\n\nTracking:\n${history}`);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function addShipment(e) {
  e.preventDefault();
  const form = e.target;
  const inputs = form.querySelectorAll('select, input');
  const body = {
    originBase: inputs[0].value,
    destinationBase: inputs[1].value,
    items: [{ itemName: inputs[2].value, quantity: parseInt(inputs[3].value) }],
    totalQuantity: parseInt(inputs[3].value),
    dispatchDate: inputs[4].value || new Date().toISOString()
  };
  try {
    await api('/shipments', { method: 'POST', body: JSON.stringify(body) });
    closeModal('add-shipment-modal');
    showToast('Shipment created successfully');
    form.reset();
    loadShipments();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ===== ALERTS =====
async function loadAlerts() {
  try {
    const res = await api('/alerts?limit=20');
    const alerts = res.data.alerts || [];

    let critical = 0, warning = 0, safe = 0;
    alerts.forEach(a => {
      if (a.alertLevel === 'Critical') critical++;
      else if (a.alertLevel === 'Warning') warning++;
      else safe++;
    });

    const summaryCards = document.querySelectorAll('.alert-summary-card h3');
    if (summaryCards.length >= 3) {
      summaryCards[0].textContent = critical;
      summaryCards[1].textContent = warning;
      summaryCards[2].textContent = safe;
    }

    const tbody = document.querySelector('#page-alerts tbody');
    if (tbody) {
      if (!alerts.length) {
        tbody.innerHTML = emptyStateHTML6('No Alerts Available', 'fa-triangle-exclamation');
        return;
      }
      tbody.innerHTML = alerts.map(a => {
        const levelClass = a.alertLevel.toLowerCase();
        const actionBtn = a.status === 'Active'
          ? `<button class="btn btn-sm btn-${levelClass === 'critical' ? 'red' : 'orange'}" onclick="resolveAlert('${a._id}')">Reorder</button>`
          : `<span class="text-green">Resolved</span>`;
        return `
          <tr>
            <td>${a.itemName}</td>
            <td>${a.category}</td>
            <td class="text-${a.alertLevel === 'Critical' ? 'red' : 'orange'}">${a.currentQuantity}</td>
            <td>${a.threshold}</td>
            <td><span class="alert-level ${levelClass}">${a.alertLevel}</span></td>
            <td>${actionBtn}</td>
          </tr>`;
      }).join('');
    }
  } catch (err) {
    console.error('Alerts load error:', err);
  }
}

async function resolveAlert(id) {
  try {
    await api(`/alerts/${id}/resolve`, { method: 'PATCH', body: JSON.stringify({ notes: 'Resolved via dashboard' }) });
    showToast('Alert resolved');
    loadAlerts();
    loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ===== NOTIFICATIONS =====
async function loadNotifications() {
  try {
    const res = await api('/notifications?limit=10');
    const notifications = res.data.notifications || [];
    const notifList = document.querySelector('.notif-list');
    if (notifList) {
      if (!notifications.length) {
        notifList.innerHTML = '<div class="notif-item"><p style="color:var(--gray);text-align:center">No notifications</p></div>';
        return;
      }
      notifList.innerHTML = notifications.map(n => {
        const typeClass = n.type === 'critical' ? 'notif-critical' : n.type === 'warning' ? 'notif-warning' : n.type === 'success' ? 'notif-success' : 'notif-info';
        const icon = n.type === 'critical' ? 'fa-triangle-exclamation' : n.type === 'warning' ? 'fa-exclamation-circle' : n.type === 'success' ? 'fa-check-circle' : 'fa-info-circle';
        const time = new Date(n.createdAt).toLocaleString();
        return `
          <div class="notif-item ${typeClass}" onclick="markNotifRead('${n._id}')">
            <i class="fas ${icon}"></i>
            <div>
              <p>${n.message}</p>
              <span>${time}</span>
            </div>
          </div>`;
      }).join('');
    }
  } catch (err) {
    console.error('Notifications load error:', err);
  }
}

async function markNotifRead(id) {
  try {
    await api(`/notifications/${id}/read`, { method: 'PATCH' });
  } catch {}
}

// ===== CHARTS =====
let inventoryChart, shipmentChart;

function initCharts(dashboardData) {
  Chart.defaults.color = '#8b949e';
  Chart.defaults.borderColor = '#30363d';

  const catData = dashboardData?.inventoryByCategory || [];
  const statusData = dashboardData?.shipmentStatusDistribution || [];

  const catLabels = catData.map(c => c.category);
  const catValues = catData.map(c => c.total);
  const statusLabels = statusData.map(s => s.status);
  const statusValues = statusData.map(s => s.count);

  const invCtx = document.getElementById('inventoryChart').getContext('2d');
  if (inventoryChart) inventoryChart.destroy();

  if (!catLabels.length) {
    inventoryChart = new Chart(invCtx, {
      type: 'bar',
      data: { labels: ['No Data'], datasets: [{ label: 'Quantity', data: [0], backgroundColor: ['rgba(139,148,158,0.3)'], borderWidth: 0, borderRadius: 6, barThickness: 40 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(48,54,61,0.5)' } }, x: { grid: { display: false } } } }
    });
  } else {
    inventoryChart = new Chart(invCtx, {
      type: 'bar',
      data: {
        labels: catLabels,
        datasets: [{
          label: 'Quantity', data: catValues,
          backgroundColor: ['rgba(88,166,255,0.7)', 'rgba(248,81,73,0.7)', 'rgba(227,179,65,0.7)', 'rgba(63,185,80,0.7)', 'rgba(139,92,246,0.7)'],
          borderColor: ['#58a6ff', '#f85149', '#e3b341', '#3fb950', '#a78bfa'],
          borderWidth: 1, borderRadius: 6, barThickness: 40
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(48,54,61,0.5)' } }, x: { grid: { display: false } } } }
    });
  }

  const shipCtx = document.getElementById('shipmentChart').getContext('2d');
  if (shipmentChart) shipmentChart.destroy();

  if (!statusLabels.length) {
    shipmentChart = new Chart(shipCtx, {
      type: 'doughnut',
      data: { labels: ['No Data'], datasets: [{ data: [1], backgroundColor: ['rgba(139,148,158,0.3)'], borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyleWidth: 10 } } } }
    });
  } else {
    shipmentChart = new Chart(shipCtx, {
      type: 'doughnut',
      data: {
        labels: statusLabels,
        datasets: [{ data: statusValues, backgroundColor: ['#58a6ff', '#e3b341', '#a78bfa', '#3fb950'], borderWidth: 0, hoverOffset: 8 }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyleWidth: 10 } } } }
    });
  }
}

// ===== REPORT CHARTS =====
let reportInventoryChart, reportUsageChart;

async function initReportCharts() {
  try {
    const [invRes, usageRes] = await Promise.all([
      api('/reports/inventory'),
      api('/reports/usage')
    ]);

    const summary = invRes.data.summary || [];
    const catUsage = usageRes.data.categoryUsage || [];

    const rInvCtx = document.getElementById('reportInventoryChart');
    if (!rInvCtx) return;
    if (reportInventoryChart) reportInventoryChart.destroy();

    if (!summary.length) {
      reportInventoryChart = new Chart(rInvCtx.getContext('2d'), {
        type: 'bar',
        data: { labels: ['No Data'], datasets: [{ label: 'Quantity', data: [0], backgroundColor: 'rgba(139,148,158,0.3)', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true } } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(48,54,61,0.5)' } }, x: { grid: { display: false } } } }
      });
    } else {
      reportInventoryChart = new Chart(rInvCtx.getContext('2d'), {
        type: 'bar',
        data: {
          labels: summary.map(s => s._id),
          datasets: [{
            label: 'Quantity', data: summary.map(s => s.totalQuantity),
            backgroundColor: ['rgba(88,166,255,0.7)', 'rgba(248,81,73,0.7)', 'rgba(227,179,65,0.7)', 'rgba(63,185,80,0.7)', 'rgba(139,92,246,0.7)'],
            borderRadius: 6
          }, {
            label: 'Low Stock Items', data: summary.map(s => s.lowStock),
            backgroundColor: 'rgba(248,81,73,0.4)', borderRadius: 6
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true } } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(48,54,61,0.5)' } }, x: { grid: { display: false } } } }
      });
    }

    const rUsageCtx = document.getElementById('reportUsageChart');
    if (reportUsageChart) reportUsageChart.destroy();

    if (!catUsage.length) {
      reportUsageChart = new Chart(rUsageCtx.getContext('2d'), {
        type: 'polarArea',
        data: { labels: ['No Data'], datasets: [{ data: [1], backgroundColor: ['rgba(139,148,158,0.3)'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 12 } } }, scales: { r: { grid: { color: 'rgba(48,54,61,0.5)' }, ticks: { display: false } } } }
      });
    } else {
      reportUsageChart = new Chart(rUsageCtx.getContext('2d'), {
        type: 'polarArea',
        data: {
          labels: catUsage.map(c => c._id || 'Unknown'),
          datasets: [{
            data: catUsage.map(c => c.totalQuantity),
            backgroundColor: ['rgba(88,166,255,0.6)', 'rgba(248,81,73,0.6)', 'rgba(227,179,65,0.6)', 'rgba(63,185,80,0.6)', 'rgba(139,92,246,0.6)'],
            borderWidth: 0
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 12 } } }, scales: { r: { grid: { color: 'rgba(48,54,61,0.5)' }, ticks: { display: false } } } }
      });
    }
  } catch (err) {
    console.error('Report charts error:', err);
  }
}

// ===== REPORT ACTIONS =====
async function generateReport(type) {
  showToast(`Generating ${type} report...`);
}

async function downloadPDF() {
  showToast('PDF export coming soon - use CSV for now', 'info');
}

async function exportCSV() {
  try {
    const token = authToken;
    let res;
    try {
      res = await fetch(`${API_URL}/reports/export/inventory`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch {
      throw new Error('Server is unavailable. Please try again later.');
    }
    if (!res.ok) throw new Error('No data to export');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'inventory_report.csv'; a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported successfully');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function refreshDashboard() { loadDashboard(); showToast('Dashboard refreshed'); }

// ===== FULLSCREEN =====
document.querySelector('.fa-expand')?.parentElement?.addEventListener('click', function() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen();
  else document.exitFullscreen();
});

// ===== ESC CLOSE =====
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    document.body.style.overflow = '';
  }
});

// ===== ROLE CONSTANTS =====
const ROLE_LABELS = {
  'admin': 'Admin',
  'supply-manager': 'Supply Manager',
  'base-officer': 'Base Officer',
  'logistics-officer': 'Logistics Officer',
  'warehouse-officer': 'Warehouse Officer',
  'transport-officer': 'Transport Officer',
  'inventory-manager': 'Inventory Manager',
  'auditor': 'Auditor',
  'emergency-response-officer': 'Emergency Response Officer',
  'viewer': 'Viewer'
};

const PERMISSIONS_MATRIX = {
  'admin':                   { inventory: 'CRUD+A', shipments: 'CRUD+A', alerts: 'CRUD+A', reports: 'CRUD+A', users: 'CRUD+A', dashboard: 'Full' },
  'supply-manager':          { inventory: 'CRU+A', shipments: 'CRU+A', alerts: 'CRU+A', reports: 'CR', users: '---', dashboard: 'Standard' },
  'base-officer':            { inventory: 'R+U', shipments: 'CR', alerts: 'R', reports: 'R', users: '---', dashboard: 'Standard' },
  'logistics-officer':       { inventory: 'R', shipments: 'CRU+A', alerts: 'CRU', reports: 'CR', users: '---', dashboard: 'Logistics' },
  'warehouse-officer':       { inventory: 'CRU', shipments: 'R', alerts: 'CRU', reports: 'R', users: '---', dashboard: 'Warehouse' },
  'transport-officer':       { inventory: 'R', shipments: 'CRU', alerts: 'R', reports: 'R', users: '---', dashboard: 'Transport' },
  'inventory-manager':       { inventory: 'CRUD', shipments: 'R', alerts: 'CRU+A', reports: 'CR', users: '---', dashboard: 'Inventory' },
  'auditor':                 { inventory: 'R', shipments: 'R', alerts: 'R', reports: 'CR', users: 'R', dashboard: 'Audit' },
  'emergency-response-officer': { inventory: 'CRU+A', shipments: 'CRU+A', alerts: 'CRUD+A', reports: 'R', users: '---', dashboard: 'Emergency' },
  'viewer':                  { inventory: 'R', shipments: 'R', alerts: 'R', reports: 'R', users: '---', dashboard: 'View Only' }
};

function hasPermission(resource, action) {
  if (!currentUser) return false;
  const perms = PERMISSIONS_MATRIX[currentUser.role]?.[resource];
  if (!perms) return false;
  if (action === 'view') return perms.includes('R');
  if (action === 'create') return perms.includes('C');
  if (action === 'update') return perms.includes('U');
  if (action === 'delete') return perms.includes('D');
  if (action === 'approve') return perms.includes('A');
  return false;
}

function applyRoleBasedUI() {
  if (!currentUser) return;

  document.querySelectorAll('.nav-link').forEach(link => {
    const page = link.dataset.page;
    const requiredPerms = {
      'inventory': 'inventory', 'shipments': 'shipments',
      'alerts': 'alerts', 'reports': 'reports', 'users': 'users'
    };
    if (requiredPerms[page] && !hasPermission(requiredPerms[page], 'view')) {
      link.style.display = 'none';
    } else {
      link.style.display = '';
    }
  });

  const addInvBtn = document.querySelector('#page-inventory .btn-primary');
  if (addInvBtn && !hasPermission('inventory', 'create')) addInvBtn.style.display = 'none';

  const addShipBtn = document.querySelector('#page-shipments .btn-primary');
  if (addShipBtn && !hasPermission('shipments', 'create')) addShipBtn.style.display = 'none';

  const addUserBtn = document.querySelector('#page-users .btn-primary');
  if (addUserBtn && !hasPermission('users', 'create')) addUserBtn.style.display = 'none';
}

// ===== USER MANAGEMENT =====
let allUsers = [];

async function loadUsers() {
  try {
    const roleFilter = document.getElementById('user-role-filter')?.value || '';
    const query = roleFilter ? `?role=${roleFilter}` : '';
    const res = await api(`/auth/users${query}`);
    allUsers = res.data.users || [];
    renderUsersTable(allUsers);
    renderPermissionsMatrix();
  } catch (err) {
    console.error('Users load error:', err);
    allUsers = [];
    renderUsersTable([]);
    renderPermissionsMatrix();
  }
}

function renderUsersTable(users) {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;
  if (!users || !users.length) {
    tbody.innerHTML = emptyStateHTML7('No Users Found', 'fa-users');
    return;
  }
  tbody.innerHTML = users.map(u => {
    const lastLogin = u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never';
    return `
      <tr>
        <td><strong>${u.fullName}</strong></td>
        <td>${u.email}</td>
        <td><span class="status-badge in-stock">${ROLE_LABELS[u.role] || u.role}</span></td>
        <td>${u.assignedBase}</td>
        <td><span class="status-badge ${u.isActive ? 'in-stock' : 'out-of-stock'}">${u.isActive ? 'Active' : 'Inactive'}</span></td>
        <td>${lastLogin}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="openChangeRoleModal('${u.id}', '${u.fullName}', '${u.role}')" title="Change Role">
            <i class="fas fa-user-shield"></i>
          </button>
        </td>
      </tr>`;
  }).join('');
}

function emptyStateHTML7(message, icon = 'fa-inbox') {
  return `<tr><td colspan="7" style="text-align:center;padding:40px 20px;color:var(--gray)">
    <i class="fas ${icon}" style="font-size:32px;margin-bottom:12px;display:block;opacity:0.5"></i>
    <p style="font-size:14px;margin:0">${message}</p>
  </td></tr>`;
}

function renderPermissionsMatrix() {
  const tbody = document.getElementById('permissions-matrix');
  if (!tbody) return;

  tbody.innerHTML = Object.entries(PERMISSIONS_MATRIX).map(([role, perms]) => `
    <tr>
      <td><strong>${ROLE_LABELS[role]}</strong></td>
      <td>${perms.inventory}</td>
      <td>${perms.shipments}</td>
      <td>${perms.alerts}</td>
      <td>${perms.reports}</td>
      <td>${perms.users}</td>
      <td>${perms.dashboard}</td>
    </tr>
  `).join('');
}

async function addUser(e) {
  e.preventDefault();
  const form = e.target;
  const body = {};
  form.querySelectorAll('input, select').forEach(inp => { if (inp.name) body[inp.name] = inp.value; });

  try {
    await api('/auth/register', { method: 'POST', body: JSON.stringify(body) });
    closeModal('add-user-modal');
    showToast('User created successfully');
    form.reset();
    loadUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openChangeRoleModal(userId, userName, currentRole) {
  document.getElementById('change-role-user-id').value = userId;
  document.getElementById('change-role-user-name').textContent = userName;
  document.getElementById('new-role-select').value = currentRole;
  openModal('change-role-modal');
}

async function updateUserRole(e) {
  e.preventDefault();
  const userId = document.getElementById('change-role-user-id').value;
  const newRole = document.getElementById('new-role-select').value;
  try {
    await api(`/auth/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role: newRole }) });
    closeModal('change-role-modal');
    showToast('User role updated successfully');
    loadUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
