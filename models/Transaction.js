const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['expense', 'earning'], required: true },
  category: { type: String, required: [true, 'Category is required'], trim: true },
  reason: { type: String, required: [true, 'Reason is required'], trim: true, maxlength: [200, 'Reason too long'] },
  amount: { type: Number, required: [true, 'Amount is required'], min: [0.01, 'Amount must be positive'] },
  date: { type: Date, required: [true, 'Date is required'], default: Date.now },
  // Expense specific
  itemCount: { type: Number, default: 1 },
  items: [{ name: String, quantity: Number, price: Number }],
  // Earning specific
  source: { type: String, trim: true },
  sourceDetails: { type: String, trim: true },
  // UPI specific
  paymentMode: { type: String, enum: ['cash', 'upi', 'card', 'bank', 'other'], default: 'cash' },
  upiId: { type: String, trim: true },
  upiTransactionId: { type: String, trim: true },
  // Direction for UPI
  upiDirection: { type: String, enum: ['sent', 'received', 'na'], default: 'na' },
  notes: { type: String, maxlength: [500, 'Notes too long'] },
  tags: [String],
  createdAt: { type: Date, default: Date.now }
});

// Index for faster queries
transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, type: 1, date: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
