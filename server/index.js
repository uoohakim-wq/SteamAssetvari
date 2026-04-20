const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const schedule = require('node-schedule');

// Load .env if exists
try {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const [key, ...vals] = line.split('=');
      if (key?.trim() && vals.length) {
        process.env[key.trim()] = vals.join('=').trim();
      }
    }
  }
} catch {}

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOADS = path.join(__dirname, '../uploads');

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS));
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/upload', require('./routes/upload'));
app.use('/api/generate', require('./routes/generate'));

// Download endpoint
app.get('/api/download/:filename', (req, res) => {
  const filePath = path.join(UPLOADS, req.params.filename);
  if (!filePath.startsWith(UPLOADS)) return res.status(403).end();
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  res.download(filePath);
});

// Auto-clean uploads older than 1 hour
schedule.scheduleJob('*/15 * * * *', () => {
  const now = Date.now();
  try {
    const files = fs.readdirSync(UPLOADS);
    for (const file of files) {
      const filePath = path.join(UPLOADS, file);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > 60 * 60 * 1000) {
        fs.unlinkSync(filePath);
      }
    }
  } catch {}
});

app.listen(PORT, () => {
  console.log(`Steam Asset Generator running at http://localhost:${PORT}`);
});
