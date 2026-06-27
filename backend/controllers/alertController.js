const Alert = require('../models/Alert');

exports.getAlerts = async (req, res, next) => {
  try {
    const { status, alertLevel, category, locationBase, sort = '-createdAt', page = 1, limit = 10 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (alertLevel) query.alertLevel = alertLevel;
    if (category) query.category = category;
    if (locationBase) query.locationBase = locationBase;

    const total = await Alert.countDocuments(query);
    const alerts = await Alert.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('inventoryId', 'itemId itemName category')
      .populate('resolvedBy', 'fullName');

    res.json({
      success: true,
      message: 'Alerts fetched successfully',
      data: { alerts, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) } }
    });
  } catch (error) {
    next(error);
  }
};

exports.getCriticalAlerts = async (req, res, next) => {
  try {
    const alerts = await Alert.find({ alertLevel: 'Critical', status: 'Active' })
      .sort('-createdAt')
      .populate('inventoryId', 'itemId itemName category locationBase');

    res.json({ success: true, message: 'Critical alerts fetched successfully', data: alerts });
  } catch (error) {
    next(error);
  }
};

exports.resolveAlert = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const alert = await Alert.findById(req.params.id);
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });

    alert.status = 'Resolved';
    alert.resolvedBy = req.user.id;
    alert.resolvedAt = new Date();
    if (notes) alert.notes = notes;
    await alert.save();

    res.json({ success: true, message: 'Alert resolved successfully', data: alert });
  } catch (error) {
    next(error);
  }
};
