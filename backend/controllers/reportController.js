const Inventory = require('../models/Inventory');
const Shipment = require('../models/Shipment');
const mongoose = require('mongoose');

exports.getInventoryReport = async (req, res, next) => {
  try {
    const { category, locationBase } = req.query;
    const match = {};
    if (category) match.category = category;
    if (locationBase) match.locationBase = locationBase;

    const report = await Inventory.aggregate([
      { $match: match },
      { $group: { _id: { category: '$category', base: '$locationBase' }, totalQty: { $sum: '$quantity' }, items: { $sum: 1 }, avgThreshold: { $avg: '$minimumThreshold' } } },
      { $sort: { '_id.category': 1 } }
    ]);

    const summary = await Inventory.aggregate([
      { $match: match },
      { $group: { _id: '$category', totalQuantity: { $sum: '$quantity' }, itemCount: { $sum: 1 }, lowStock: { $sum: { $cond: [{ $lte: ['$quantity', '$minimumThreshold'] }, 1, 0] } } } }
    ]);

    res.json({ success: true, message: 'Inventory report generated', data: { detailed: report, summary } });
  } catch (error) {
    next(error);
  }
};

exports.getShipmentReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const match = {};
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    const statusReport = await Shipment.aggregate([
      { $match: match },
      { $group: { _id: '$currentStatus', count: { $sum: 1 }, totalQty: { $sum: '$totalQuantity' } } }
    ]);

    const baseReport = await Shipment.aggregate([
      { $match: match },
      { $group: { _id: { origin: '$originBase', dest: '$destinationBase' }, count: { $sum: 1 }, totalQty: { $sum: '$totalQuantity' } } }
    ]);

    const priorityReport = await Shipment.aggregate([
      { $match: match },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    res.json({ success: true, message: 'Shipment report generated', data: { statusReport, baseReport, priorityReport } });
  } catch (error) {
    next(error);
  }
};

exports.getUsageReport = async (req, res, next) => {
  try {
    const monthlyUsage = await Shipment.aggregate([
      { $match: { currentStatus: 'Delivered' } },
      { $unwind: '$items' },
      { $group: { _id: { month: { $month: '$dispatchDate' }, year: { $year: '$dispatchDate' }, item: '$items.itemName' }, totalDispatched: { $sum: '$items.quantity' }, shipmentCount: { $sum: 1 } } },
      { $sort: { '_id.year': -1, '_id.month': -1 } }
    ]);

    const categoryUsage = await Shipment.aggregate([
      { $match: { currentStatus: 'Delivered' } },
      { $unwind: '$items' },
      { $lookup: { from: 'inventories', localField: 'items.inventory', foreignField: '_id', as: 'invData' } },
      { $unwind: { path: '$invData', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$invData.category', totalQuantity: { $sum: '$items.quantity' } } }
    ]);

    res.json({ success: true, message: 'Usage report generated', data: { monthlyUsage, categoryUsage } });
  } catch (error) {
    next(error);
  }
};

exports.exportCSV = async (req, res, next) => {
  try {
    const { type } = req.params;
    let data, headers, csvContent;

    if (type === 'inventory') {
      data = await Inventory.find().sort('category');
      headers = ['Item ID', 'Name', 'Category', 'Quantity', 'Threshold', 'Base', 'Status'];
      csvContent = headers.join(',') + '\n';
      data.forEach(row => {
        csvContent += [row.itemId, row.itemName, row.category, row.quantity, row.minimumThreshold, row.locationBase, row.status].join(',') + '\n';
      });
    } else if (type === 'shipments') {
      data = await Shipment.find().sort('-createdAt');
      headers = ['Shipment ID', 'Origin', 'Destination', 'Quantity', 'Status', 'Dispatch Date', 'Priority'];
      csvContent = headers.join(',') + '\n';
      data.forEach(row => {
        csvContent += [row.shipmentId, row.originBase, row.destinationBase, row.totalQuantity, row.currentStatus, row.dispatchDate?.toISOString().split('T')[0], row.priority].join(',') + '\n';
      });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_report.csv`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
};
