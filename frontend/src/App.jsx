import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Editor from './pages/Editor'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/doc/:id" element={<Editor />} />
    </Routes>
  )
}
