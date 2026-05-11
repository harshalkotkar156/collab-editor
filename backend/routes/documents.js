const express = require('express')
const router = express.Router()
const { v4: uuidv4 } = require('uuid')
const Document = require('../models/Document')

// GET all documents (list view)
router.get('/', async (req, res) => {
  try {
    const docs = await Document.find({}, '_id title updatedAt').sort({ updatedAt: -1 })
    res.json(docs)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch documents' })
  }
})

// GET or CREATE a document by ID
router.get('/:id', async (req, res) => {
  try {
    let doc = await Document.findById(req.params.id)
    if (!doc) {
      doc = await Document.create({ _id: req.params.id, title: 'Untitled Document', content: '' })
    }
    res.json(doc)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch document' })
  }
})

// POST create a new document, returns its new ID
router.post('/', async (req, res) => {
  try {
    const id = uuidv4()
    const doc = await Document.create({ _id: id, title: 'Untitled Document', content: '' })
    res.status(201).json(doc)
  } catch (err) {
    res.status(500).json({ error: 'Failed to create document' })
  }
})

// PATCH update document title
router.patch('/:id/title', async (req, res) => {
  try {
    const { title } = req.body
    const doc = await Document.findByIdAndUpdate(req.params.id, { title }, { new: true })
    if (!doc) return res.status(404).json({ error: 'Document not found' })
    res.json(doc)
  } catch (err) {
    res.status(500).json({ error: 'Failed to update title' })
  }
})

// DELETE a document
router.delete('/:id', async (req, res) => {
  try {
    await Document.findByIdAndDelete(req.params.id)
    res.json({ message: 'Document deleted' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete document' })
  }
})

module.exports = router
