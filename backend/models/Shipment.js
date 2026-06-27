const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema({
  shipmentId: {
    type: String,
    unique: true,
    required: true
  },
  originBase: {
    type: String,
    required: [true, 'Origin base is required'],
    enum: ['Base Alpha', 'Base Bravo', 'Base Charlie', 'Base Delta', 'Base Echo']
  },
  destinationBase: {
    type: String,
    required: [true, 'Destination base is required'],
    enum: ['Base Alpha', 'Base Bravo', 'Base Charlie', 'Base Delta', 'Base Echo']
  },
  items: [{
    inventory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory'
    },
    itemName: String,
    quantity: Number
  }],
  totalQuantity: {
    type: Number,
    required: true
  },
  dispatchDate: {
    type: Date,
    required: [true, 'Dispatch date is required']
  },
  expectedDeliveryDate: Date,
  currentStatus: {
    type: String,
    enum: ['Packed', 'Dispatched', 'In Transit', 'Delivered'],
    default: 'Packed'
  },
  trackingHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String
  }],
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

shipmentSchema.statics.generateShipmentId = async function () {
  const count = await this.countDocuments();
  return `SH-${String(count + 1001).padStart(4, '0')}`;
};

module.exports = mongoose.model('Shipment', shipmentSchema);
