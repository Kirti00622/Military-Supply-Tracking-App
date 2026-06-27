// Permissions Matrix
// View, Create, Update, Delete, Approve

const ROLES = {
  admin: {
    label: 'Admin',
    dashboard: ['summary', 'inventory', 'shipments', 'alerts', 'reports', 'users', 'settings'],
    permissions: {
      inventory: { view: true, create: true, update: true, delete: true, approve: true },
      shipments: { view: true, create: true, update: true, delete: true, approve: true },
      alerts: { view: true, create: true, update: true, delete: true, approve: true },
      reports: { view: true, create: true, update: true, delete: true, approve: true },
      users: { view: true, create: true, update: true, delete: true, approve: true },
      settings: { view: true, create: true, update: true, delete: true, approve: true },
      dashboard: { view: true }
    }
  },
  'supply-manager': {
    label: 'Supply Manager',
    dashboard: ['summary', 'inventory', 'shipments', 'alerts', 'reports'],
    permissions: {
      inventory: { view: true, create: true, update: true, delete: false, approve: true },
      shipments: { view: true, create: true, update: true, delete: false, approve: true },
      alerts: { view: true, create: true, update: true, delete: false, approve: true },
      reports: { view: true, create: true, update: false, delete: false, approve: false },
      users: { view: false, create: false, update: false, delete: false, approve: false },
      settings: { view: true, create: false, update: true, delete: false, approve: false },
      dashboard: { view: true }
    }
  },
  'base-officer': {
    label: 'Base Officer',
    dashboard: ['summary', 'inventory', 'shipments', 'alerts'],
    permissions: {
      inventory: { view: true, create: false, update: true, delete: false, approve: false },
      shipments: { view: true, create: true, update: false, delete: false, approve: false },
      alerts: { view: true, create: false, update: false, delete: false, approve: false },
      reports: { view: true, create: false, update: false, delete: false, approve: false },
      users: { view: false, create: false, update: false, delete: false, approve: false },
      settings: { view: true, create: false, update: true, delete: false, approve: false },
      dashboard: { view: true }
    }
  },
  'logistics-officer': {
    label: 'Logistics Officer',
    dashboard: ['summary', 'shipments', 'alerts', 'reports'],
    permissions: {
      inventory: { view: true, create: false, update: false, delete: false, approve: false },
      shipments: { view: true, create: true, update: true, delete: false, approve: true },
      alerts: { view: true, create: true, update: true, delete: false, approve: false },
      reports: { view: true, create: true, update: false, delete: false, approve: false },
      users: { view: false, create: false, update: false, delete: false, approve: false },
      settings: { view: true, create: false, update: true, delete: false, approve: false },
      dashboard: { view: true }
    }
  },
  'warehouse-officer': {
    label: 'Warehouse Officer',
    dashboard: ['summary', 'inventory', 'alerts'],
    permissions: {
      inventory: { view: true, create: true, update: true, delete: false, approve: false },
      shipments: { view: true, create: false, update: false, delete: false, approve: false },
      alerts: { view: true, create: true, update: true, delete: false, approve: false },
      reports: { view: true, create: false, update: false, delete: false, approve: false },
      users: { view: false, create: false, update: false, delete: false, approve: false },
      settings: { view: true, create: false, update: true, delete: false, approve: false },
      dashboard: { view: true }
    }
  },
  'transport-officer': {
    label: 'Transport Officer',
    dashboard: ['summary', 'shipments'],
    permissions: {
      inventory: { view: true, create: false, update: false, delete: false, approve: false },
      shipments: { view: true, create: true, update: true, delete: false, approve: false },
      alerts: { view: true, create: false, update: false, delete: false, approve: false },
      reports: { view: true, create: false, update: false, delete: false, approve: false },
      users: { view: false, create: false, update: false, delete: false, approve: false },
      settings: { view: true, create: false, update: true, delete: false, approve: false },
      dashboard: { view: true }
    }
  },
  'inventory-manager': {
    label: 'Inventory Manager',
    dashboard: ['summary', 'inventory', 'alerts', 'reports'],
    permissions: {
      inventory: { view: true, create: true, update: true, delete: true, approve: false },
      shipments: { view: true, create: false, update: false, delete: false, approve: false },
      alerts: { view: true, create: true, update: true, delete: false, approve: true },
      reports: { view: true, create: true, update: false, delete: false, approve: false },
      users: { view: false, create: false, update: false, delete: false, approve: false },
      settings: { view: true, create: false, update: true, delete: false, approve: false },
      dashboard: { view: true }
    }
  },
  auditor: {
    label: 'Auditor',
    dashboard: ['summary', 'reports'],
    permissions: {
      inventory: { view: true, create: false, update: false, delete: false, approve: false },
      shipments: { view: true, create: false, update: false, delete: false, approve: false },
      alerts: { view: true, create: false, update: false, delete: false, approve: false },
      reports: { view: true, create: true, update: false, delete: false, approve: false },
      users: { view: true, create: false, update: false, delete: false, approve: false },
      settings: { view: true, create: false, update: false, delete: false, approve: false },
      dashboard: { view: true }
    }
  },
  'emergency-response-officer': {
    label: 'Emergency Response Officer',
    dashboard: ['summary', 'inventory', 'shipments', 'alerts'],
    permissions: {
      inventory: { view: true, create: true, update: true, delete: false, approve: true },
      shipments: { view: true, create: true, update: true, delete: false, approve: true },
      alerts: { view: true, create: true, update: true, delete: true, approve: true },
      reports: { view: true, create: false, update: false, delete: false, approve: false },
      users: { view: false, create: false, update: false, delete: false, approve: false },
      settings: { view: true, create: false, update: true, delete: false, approve: false },
      dashboard: { view: true }
    }
  },
  viewer: {
    label: 'Viewer',
    dashboard: ['summary'],
    permissions: {
      inventory: { view: true, create: false, update: false, delete: false, approve: false },
      shipments: { view: true, create: false, update: false, delete: false, approve: false },
      alerts: { view: true, create: false, update: false, delete: false, approve: false },
      reports: { view: true, create: false, update: false, delete: false, approve: false },
      users: { view: false, create: false, update: false, delete: false, approve: false },
      settings: { view: true, create: false, update: false, delete: false, approve: false },
      dashboard: { view: true }
    }
  }
};

const ROLE_LIST = Object.keys(ROLES);

const checkPermission = (role, resource, action) => {
  if (!ROLES[role]) return false;
  return ROLES[role].permissions[resource]?.[action] || false;
};

const getRoleLabel = (role) => ROLES[role]?.label || role;
const getRolePermissions = (role) => ROLES[role]?.permissions || {};
const getDashboardAccess = (role) => ROLES[role]?.dashboard || [];

module.exports = { ROLES, ROLE_LIST, checkPermission, getRoleLabel, getRolePermissions, getDashboardAccess };
