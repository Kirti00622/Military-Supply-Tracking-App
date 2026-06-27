const Inventory = require('../models/Inventory');
const Shipment = require('../models/Shipment');
const Alert = require('../models/Alert');
const User = require('../models/User');
const { getDashboardAccess, getRolePermissions, getRoleLabel } = require('../config/roles');

exports.getDashboardSummary = async (req, res, next) => {
  try {
    const totalSupplies = await Inventory.aggregate([
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);

    const activeShipments = await Shipment.countDocuments({
      currentStatus: { $in: ['Packed', 'Dispatched', 'In Transit'] }
    });

    const deliveredShipments = await Shipment.countDocuments({ currentStatus: 'Delivered' });

    const lowStockAlerts = await Alert.countDocuments({ status: 'Active' });

    const inventoryByCategory = await Inventory.aggregate([
      { $group: { _id: '$category', total: { $sum: '$quantity' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);

    const shipmentStatusDistribution = await Shipment.aggregate([
      { $group: { _id: '$currentStatus', count: { $sum: 1 } } }
    ]);

    const recentActivity = await Inventory.find()
      .sort('-updatedAt')
      .limit(5)
      .select('itemName category quantity status updatedAt');

    res.json({
      success: true,
      message: 'Dashboard summary fetched successfully',
      data: {
        totalSupplies: totalSupplies[0]?.total || 0,
        activeShipments,
        deliveredShipments,
        lowStockAlerts,
        inventoryByCategory: inventoryByCategory.map(i => ({ category: i._id, total: i.total, count: i.count })),
        shipmentStatusDistribution: shipmentStatusDistribution.map(s => ({ status: s._id, count: s.count })),
        recentActivity
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getRoleDashboard = async (req, res, next) => {
  try {
    const user = req.user;
    const dashboardAccess = getDashboardAccess(user.role);
    const permissions = getRolePermissions(user.role);

    let dashboardData = {};

    if (dashboardAccess.includes('inventory')) {
      const inventorySummary = await Inventory.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 }, totalQty: { $sum: '$quantity' } } }
      ]);
      dashboardData.inventory = inventorySummary;
    }

    if (dashboardAccess.includes('shipments')) {
      const shipmentSummary = await Shipment.aggregate([
        { $group: { _id: '$currentStatus', count: { $sum: 1 } } }
      ]);
      dashboardData.shipments = shipmentSummary;
    }

    if (dashboardAccess.includes('alerts')) {
      const alertSummary = await Alert.aggregate([
        { $group: { _id: { level: '$alertLevel', status: '$status' }, count: { $sum: 1 } } }
      ]);
      dashboardData.alerts = alertSummary;
    }

    if (dashboardAccess.includes('users')) {
      const userCount = await User.countDocuments();
      const roleDistribution = await User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]);
      dashboardData.users = { total: userCount, byRole: roleDistribution };
    }

    res.json({
      success: true,
      message: 'Role dashboard fetched successfully',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          role: user.role,
          roleLabel: getRoleLabel(user.role),
          assignedBase: user.assignedBase
        },
        dashboardAccess,
        permissions,
        dashboardData
      }
    });
  } catch (error) {
    next(error);
  }
};
