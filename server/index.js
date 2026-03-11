//intallations
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env, if present
dotenv.config();

const { initDB, pool } = require('./db');
initDB().catch((err) => {
  console.error('Database init failed:', err);
});

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
app.post('/api/upload', async (req, res) => {
  try {
    await new Promise((resolve, reject) => {
      upload(req, res, (err) => {
        if (!err) return resolve();
        return reject(err);
      });
    });

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const insertResult = await pool.query(
      `
        INSERT INTO uploads (filename, original_name, file_size)
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [req.file.filename, req.file.originalname, req.file.size]
    );

    return res.status(201).json({
      message: 'File uploaded successfully',
      id: insertResult.rows[0]?.id,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
    });
  } catch (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        error: 'File upload error',
        details: err.message,
      });
    }
//for known and unknow errors - err is there and what is its statuscode

    if (err && err.statusCode) {
      return res.status(err.statusCode).json({
        error: 'Upload failed',
        details: err.message,
      });
    }
//for unknow error - assign statuscode 500
    console.error('Upload handler failed:', err);
    return res.status(500).json({
      error: 'Upload failed',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
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

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

