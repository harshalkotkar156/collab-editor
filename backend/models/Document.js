const mongoose = require('mongoose')

const documentSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    title: { type: String, default: 'Untitled Document' },
    content: { type: String, default: '' },
    // Yjs binary state stored as base64 string for persistence
    yState: { type: String, default: null },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Document', documentSchema)
