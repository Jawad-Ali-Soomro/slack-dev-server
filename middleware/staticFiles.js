import express from 'express'
import path from 'path'

// Serve static files from uploads directory
const staticFiles = express.static('uploads', {
  setHeaders: (res, path) => {
    // Set appropriate headers for images
    if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg')
    } else if (path.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png')
    } else if (path.endsWith('.gif')) {
      res.setHeader('Content-Type', 'image/gif')
    } else if (path.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/webp')
    }
    
    // Set cache headers for better performance
    res.setHeader('Cache-Control', 'public, max-age=31536000') // 1 year
  }
})

export default staticFiles

