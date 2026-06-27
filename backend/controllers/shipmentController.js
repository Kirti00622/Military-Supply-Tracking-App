const Shipment = require('../models/Shipment');
const Inventory = require('../models/Inventory');
const Notification = require('../models/Notification');

exports.createShipment = async (req, res, next) => {
  try {
    const { originBase, destinationBase, items, dispatchDate, expectedDeliveryDate, priority } = req.body;

    if (originBase === destinationBase) {
      return res.status(400).json({ success: false, message: 'Origin and destination cannot be the same.' });
    }

    const shipmentId = await Shipment.generateShipmentId();
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    const shipment = await Shipment.create({
      shipmentId, originBase, destinationBase, items, totalQuantity,
      dispatchDate, expectedDeliveryDate, priority,
      createdBy: req.user.id,
      trackingHistory: [{ status: 'Packed', timestamp: new Date(), updatedBy: req.user.id }]
    });

    await Notification.create({
      title: 'Shipment Created', message: `Shipment ${shipmentId} created from ${originBase} to ${destinationBase}`,
      type: 'info', userId: req.user.id
    });

    res.status(201).json({ success: true, message: 'Shipment created successfully', data: shipment });
  } catch (error) {
    next(error);
  }
};

exports.getShipments = async (req, res, next) => {
  try {
    const { search, originBase, destinationBase, status, priority, sort = '-createdAt', page = 1, limit = 10 } = req.query;
    const query = {};

    if (search) query.$or = [{ shipmentId: new RegExp(search, 'i') }];
    if (originBase) query.originBase = originBase;
    if (destinationBase) query.destinationBase = destinationBase;
    if (status) query.currentStatus = status;
    if (priority) query.priority = priority;

    const total = await Shipment.countDocuments(query);
    const shipments = await Shipment.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('createdBy', 'fullName');

    res.json({
      success: true,
      message: 'Shipments fetched successfully',
      data: { shipments, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) } }
    });
  } catch (error) {
    next(error);
  }
};

exports.getShipmentById = async (req, res, next) => {
  try {
    const shipment = await Shipment.findById(req.params.id)
      .populate('createdBy', 'fullName email')
      .populate('trackingHistory.updatedBy', 'fullName');
    if (!shipment) return res.status(404).json({ success: false, message: 'Shipment not found' });
    res.json({ success: true, message: 'Shipment fetched successfully', data: shipment });
  } catch (error) {
    next(error);
  }
};

exports.updateShipment = async (req, res, next) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) return res.status(404).json({ success: false, message: 'Shipment not found' });

    if (shipment.currentStatus === 'Delivered') {
      return res.status(400).json({ success: false, message: 'Cannot update a delivered shipment.' });
    }

    const allowedUpdates = ['destinationBase', 'expectedDeliveryDate', 'priority', 'items'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) shipment[field] = req.body[field];
    });

    if (req.body.items) {
      shipment.totalQuantity = req.body.items.reduce((sum, item) => sum + item.quantity, 0);
    }

    await shipment.save();
    res.json({ success: true, message: 'Shipment updated successfully', data: shipment });
  } catch (error) {
    next(error);
  }
};

exports.deleteShipment = async (req, res, next) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) return res.status(404).json({ success: false, message: 'Shipment not found' });
    if (['Dispatched', 'In Transit'].includes(shipment.currentStatus)) {
      return res.status(400).json({ success: false, message: 'Cannot delete an active shipment.' });
    }
    await shipment.deleteOne();
    res.json({ success: true, message: 'Shipment deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.updateShipmentStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) return res.status(404).json({ success: false, message: 'Shipment not found' });

    const validTransitions = {
      'Packed': ['Dispatched'],
      'Dispatched': ['In Transit'],
      'In Transit': ['Delivered'],
      'Delivered': []
    };

    if (!validTransitions[shipment.currentStatus].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from '${shipment.currentStatus}' to '${status}'`
      });
    }

    shipment.currentStatus = status;
    shipment.trackingHistory.push({ status, timestamp: new Date(), updatedBy: req.user.id, notes });
    await shipment.save();

    await Notification.create({
      title: 'Shipment Status Updated',
      message: `Shipment ${shipment.shipmentId} is now: ${status}`,
      type: status === 'Delivered' ? 'success' : 'info',
      userId: req.user.id
    });

    res.json({ success: true, message: `Shipment status updated to ${status}`, data: shipment });
  } catch (error) {
    next(error);
  }
};
