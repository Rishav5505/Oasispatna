const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  category: { type: String, enum: ['rent', 'utilities', 'marketing', 'supplies', 'salary', 'other'], default: 'other' },
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, default: Date.now },
  note: { type: String },
  receiptUrl: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

expenseSchema.index({ date: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
