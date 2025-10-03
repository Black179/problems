const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  contactNo: {
    type: String,
    required: [true, 'Contact number is required'],
    trim: true
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: ['Working', 'Student', 'Neither'],
    default: 'Neither'
  },
  problem: {
    type: String,
    required: [true, 'Problem description is required'],
    trim: true
  },
  field: {
    type: String,
    required: [true, 'Field is required'],
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Problem', problemSchema);
