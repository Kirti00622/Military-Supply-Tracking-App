const Inventory = require('../models/Inventory');
const Alert = require('../models/Alert');
const Notification = require('../models/Notification');

exports.checkLowStock = async () => {
  try {
    const lowStockItems = await Inventory.find({
      $expr: { $lte: ['$quantity', '$minimumThreshold'] }
    });

    for (const item of lowStockItems) {
      const existingAlert = await Alert.findOne({
        inventoryId: item._id,
        status: 'Active'
      });

      if (!existingAlert) {
        await Alert.create({
          inventoryId: item._id,
          itemName: item.itemName,
          currentQuantity: item.quantity,
          threshold: item.minimumThreshold,
          category: item.category,
          locationBase: item.locationBase
        });

        await Notification.create({
          title: 'Low Stock Alert',
          message: `${item.itemName} at ${item.locationBase} is below threshold (${item.quantity}/${item.minimumThreshold})`,
          type: item.quantity <= item.minimumThreshold * 0.25 ? 'critical' : 'warning'
        });
      } else {
        existingAlert.currentQuantity = item.quantity;
        await existingAlert.save();
      }
    }

    console.log(`Low stock check complete. Found ${lowStockItems.length} items below threshold.`);
  } catch (error) {
    console.error('Low stock check error:', error.message);
  }
};

exports.getStockSummary = async () => {
  const summary = await Inventory.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 }, totalQty: { $sum: '$quantity' } } }
  ]);
  return summary;
};
