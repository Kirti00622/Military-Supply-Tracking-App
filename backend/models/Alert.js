const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  inventoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: true
  },
  itemName: {
    type: String,
    required: true
  },
  currentQuantity: {
    type: Number,
    required: true
  },
  threshold: {
    type: Number,
    required: true
  },
  alertLevel: {
    type: String,
    enum: ['Warning', 'Critical'],
    default: 'Warning'
  },
  category: String,
  locationBase: String,
  status: {
    type: String,
    enum: ['Active', 'Resolved', 'Ignored'],
    default: 'Active'
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: Date,
  notes: String
}, { timestamps: true });

alertSchema.pre('save', function (next) {
  if (this.currentQuantity === 0 || this.currentQuantity <= this.threshold * 0.25) {
    this.alertLevel = 'Critical';
  } else {
    this.alertLevel = 'Warning';
  }
  next();
});

module.exports = mongoose.model('Alert', alertSchema);
