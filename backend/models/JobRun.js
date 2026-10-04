const mongoose = require('mongoose');

// One row per (job key, IST date): makes daily scheduled jobs idempotent across restarts / instances
const jobRunSchema = new mongoose.Schema({
  key: { type: String, required: true },
  date: { type: String, required: true }, // 'YYYY-MM-DD' (IST)
  status: { type: String, enum: ['running', 'done', 'failed'], default: 'running' },
  startedAt: { type: Date, default: Date.now },
  finishedAt: { type: Date },
  result: { type: mongoose.Schema.Types.Mixed },
  error: { type: String },
}, { timestamps: true });

jobRunSchema.index({ key: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('JobRun', jobRunSchema);
