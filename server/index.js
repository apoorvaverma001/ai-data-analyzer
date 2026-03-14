// installations
const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

// Load environment variables from server/.env (regardless of where node is started)
dotenv.config({ path: path.join(__dirname, '.env') });

const { generateInsights } = require('./openai');

const { initDB, pool } = require('./db');

initDB().catch((err) => {
  console.error('Database init failed:', err);
});

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

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
    // Run multer to handle the file upload
    await new Promise((resolve, reject) => {
      upload(req, res, (err) => {
        if (!err) return resolve();
        return reject(err);
      });
    });

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Insert basic upload metadata into uploads table
    const insertResult = await pool.query(
      `
        INSERT INTO uploads (filename, original_name, file_size)
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [req.file.filename, req.file.originalname, req.file.size]
    );

    const uploadId = insertResult.rows[0]?.id;
    if (!uploadId) {
      throw new Error('Failed to obtain upload id from database.');
    }

    // Send the saved file to the Python /analyze service
    const form = new FormData();
    form.append('file', fs.createReadStream(req.file.path), req.file.filename);

    const pythonResponse = await axios.post('http://localhost:7001/analyze', form, {
      headers: form.getHeaders(),
      timeout: 30000, 
    });

    let analysisResult = pythonResponse.data;

    // In some edge cases (e.g. double-encoded JSON) axios may give us a string.
    // Normalize so the rest of the app always sees an object.
    if (typeof analysisResult === 'string') {
      try {
        analysisResult = JSON.parse(analysisResult);
      } catch (e) {
        console.error('Failed to parse analysisResult JSON string:', e);
      }
    }

    console.log('analysisResult type at server:', typeof analysisResult);
    
    const insights = await generateInsights(analysisResult);
    

    // Persist analysis result in the analyses table
    await pool.query(
      `
        INSERT INTO analyses (upload_id, insights_json, insights_text)
        VALUES ($1, $2, $3)
      `,
      [uploadId, JSON.stringify(analysisResult), insights]
    );

    return res.status(201).json({
      message: 'File uploaded and analyzed successfully',
      upload_id: uploadId,
      analysisResult,
      insights,
    });
  } catch (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        error: 'File upload error',
        details: err.message,
      });
    }

    if (err && err.response && err.response.data) {
      // Error returned from Python analysis service
      return res.status(502).json({
        error: 'Analysis service error',
        details: err.response.data,
      });
    }

    if (err && err.statusCode) {
      return res.status(err.statusCode).json({
        error: 'Upload failed',
        details: err.message,
      });
    }

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
