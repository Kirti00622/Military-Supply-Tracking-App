const { ROLES, checkPermission } = require('../config/roles');

// Check if user has one of the allowed roles
const role = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized for this action.`
      });
    }
    next();
  };
};

// Check if user has specific permission for a resource
const permission = (resource, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (!checkPermission(req.user.role, resource, action)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' does not have '${action}' permission on '${resource}'.`
      });
    }
    next();
  };
};

// Allow only admin
const adminOnly = role('admin');

// Allow management roles
const managementRoles = role('admin', 'supply-manager', 'inventory-manager');

// Allow operation roles
const operationRoles = role('admin', 'supply-manager', 'base-officer', 'logistics-officer', 'warehouse-officer', 'transport-officer', 'emergency-response-officer');

// Allow read-only roles
const readOnlyAccess = role('admin', 'supply-manager', 'base-officer', 'logistics-officer', 'warehouse-officer', 'transport-officer', 'inventory-manager', 'auditor', 'emergency-response-officer', 'viewer');

module.exports = { role, permission, adminOnly, managementRoles, operationRoles, readOnlyAccess };
