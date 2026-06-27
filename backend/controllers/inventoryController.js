const Inventory = require('../models/Inventory');
const Alert = require('../models/Alert');
const Notification = require('../models/Notification');

exports.createInventory = async (req, res, next) => {
  try {
    const { itemName, category, quantity, minimumThreshold, locationBase, unit, description } = req.body;
    const itemId = await Inventory.generateItemId();

    const inventory = await Inventory.create({
      itemId, itemName, category, quantity, minimumThreshold, locationBase, unit, description,
      createdBy: req.user.id
    });

    if (quantity <= minimumThreshold) {
      await Alert.create({
        inventoryId: inventory._id, itemName, currentQuantity: quantity,
        threshold: minimumThreshold, category, locationBase
      });
      await Notification.create({
        title: 'Low Stock Alert', message: `${itemName} is below minimum threshold at ${locationBase}`,
        type: 'warning', userId: req.user.id
      });
    }

    res.status(201).json({ success: true, message: 'Inventory created successfully', data: inventory });
  } catch (error) {
    next(error);
  }
};

exports.getInventory = async (req, res, next) => {
  try {
    const { search, category, locationBase, status, sort = '-createdAt', page = 1, limit = 10 } = req.query;
    const query = {};

    if (search) query.$or = [{ itemName: new RegExp(search, 'i') }, { itemId: new RegExp(search, 'i') }];
    if (category) query.category = category;
    if (locationBase) query.locationBase = locationBase;
    if (status) query.status = status;

    const total = await Inventory.countDocuments(query);
    const inventory = await Inventory.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('createdBy', 'fullName email');

    res.json({
      success: true,
      message: 'Inventory fetched successfully',
      data: { inventory, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) } }
    });
  } catch (error) {
    next(error);
  }
};

exports.getInventoryById = async (req, res, next) => {
  try {
    const inventory = await Inventory.findById(req.params.id).populate('createdBy', 'fullName email');
    if (!inventory) return res.status(404).json({ success: false, message: 'Inventory item not found' });
    res.json({ success: true, message: 'Inventory fetched successfully', data: inventory });
  } catch (error) {
    next(error);
  }
};

exports.updateInventory = async (req, res, next) => {
  try {
    let inventory = await Inventory.findById(req.params.id);
    if (!inventory) return res.status(404).json({ success: false, message: 'Inventory item not found' });

    const { quantity, minimumThreshold, itemName, category, locationBase, description } = req.body;
    if (itemName !== undefined) inventory.itemName = itemName;
    if (category !== undefined) inventory.category = category;
    if (locationBase !== undefined) inventory.locationBase = locationBase;
    if (description !== undefined) inventory.description = description;
    if (minimumThreshold !== undefined) inventory.minimumThreshold = minimumThreshold;
    if (quantity !== undefined) inventory.quantity = quantity;

    await inventory.save();

    if (inventory.quantity <= inventory.minimumThreshold) {
      const existingAlert = await Alert.findOne({ inventoryId: inventory._id, status: 'Active' });
      if (!existingAlert) {
        await Alert.create({
          inventoryId: inventory._id, itemName: inventory.itemName,
          currentQuantity: inventory.quantity, threshold: inventory.minimumThreshold,
          category: inventory.category, locationBase: inventory.locationBase
        });
        await Notification.create({
          title: 'Low Stock Alert', message: `${inventory.itemName} is below minimum threshold`,
          type: 'warning', userId: req.user.id
        });
      } else {
        existingAlert.currentQuantity = inventory.quantity;
        await existingAlert.save();
      }
    } else {
      await Alert.findOneAndUpdate({ inventoryId: inventory._id, status: 'Active' }, { status: 'Resolved', resolvedBy: req.user.id, resolvedAt: new Date() });
    }

    res.json({ success: true, message: 'Inventory updated successfully', data: inventory });
  } catch (error) {
    next(error);
  }
};

exports.deleteInventory = async (req, res, next) => {
  try {
    const inventory = await Inventory.findById(req.params.id);
    if (!inventory) return res.status(404).json({ success: false, message: 'Inventory item not found' });
    await Alert.deleteMany({ inventoryId: inventory._id });
    await inventory.deleteOne();
    res.json({ success: true, message: 'Inventory deleted successfully' });
  } catch (error) {
    next(error);
  }
};
