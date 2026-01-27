import express from 'express'
import path from 'path'

const staticFiles = express.static('uploads', {
  setHeaders: (res, path) => {

    if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg')
    } else if (path.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png')
    } else if (path.endsWith('.gif')) {
      res.setHeader('Content-Type', 'image/gif')
    } else if (path.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/webp')
    }

    res.setHeader('Cache-Control', 'public, max-age=31536000') // 1 year
  }
})

export default staticFiles

