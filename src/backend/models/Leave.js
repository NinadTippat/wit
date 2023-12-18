const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const leaveSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userName: {type:Schema.Types.String, ref: 'User', required: true},
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Denied'], default: 'Pending' },
});

const Leave = mongoose.model('Leave', leaveSchema);

module.exports = Leave;
