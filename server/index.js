//intallations
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env, if present
dotenv.config();

const { initDB } = require('./db');
initDB();

const app = express();

// Middleware
app.use(cors()); // allows requests from other origins/ports
app.use(express.json()); // translates to js object for understanding for Nodejs

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname) || '.csv';
    const baseName = path.basename(file.originalname, ext);
    cb(null, `${baseName}-${timestamp}${ext}`);
  },
});

// File filter to accept only CSV
const fileFilter = (req, file, cb) => {
  const isCsv =
    file.mimetype === 'text/csv' ||
    file.mimetype === 'application/vnd.ms-excel' ||
    file.originalname.toLowerCase().endsWith('.csv');

  if (!isCsv) {
    const err = new Error('Only CSV files are allowed');
    err.statusCode = 400;
    return cb(err);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
}).single('file'); // Expect field name "file"

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// POST /api/upload endpoint
app.post('/api/upload', (req, res, next) => {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      // Multer-specific errors (e.g., file too large)
      return res.status(400).json({
        error: 'File upload error',
        details: err.message,
      });
    }

    if (err) {
      // Custom or unexpected errors from fileFilter or others
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: 'Upload failed',
        details: err.message,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
      });
    }

    return res.status(201).json({
      message: 'File uploaded successfully',
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
    });
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  const status = err.statusCode || 500;
  res.status(status).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

