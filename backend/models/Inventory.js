const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  itemId: {
    type: String,
    unique: true,
    required: true
  },
  itemName: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Food Packs', 'Medical Kits', 'Fuel Supplies', 'Uniforms', 'Equipment Parts']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: 0
  },
  minimumThreshold: {
    type: Number,
    required: [true, 'Minimum threshold is required'],
    min: 0
  },
  locationBase: {
    type: String,
    required: [true, 'Location base is required'],
    enum: ['Base Alpha', 'Base Bravo', 'Base Charlie', 'Base Delta', 'Base Echo']
  },
  status: {
    type: String,
    enum: ['In Stock', 'Low Stock', 'Out of Stock'],
    default: 'In Stock'
  },
  unit: {
    type: String,
    default: 'units'
  },
  description: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

inventorySchema.pre('save', function (next) {
  if (this.quantity === 0) this.status = 'Out of Stock';
  else if (this.quantity <= this.minimumThreshold) this.status = 'Low Stock';
  else this.status = 'In Stock';
  next();
});

inventorySchema.statics.generateItemId = async function () {
  const count = await this.countDocuments();
  return `INV-${String(count + 1).padStart(3, '0')}`;
};

module.exports = mongoose.model('Inventory', inventorySchema);
