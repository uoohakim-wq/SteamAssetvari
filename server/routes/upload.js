const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getImageInfo } = require('../services/imageProcessor');

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('PNG, JPG, WEBP만 허용됩니다.'));
  }
});

router.post('/', upload.fields([
  { name: 'keyVisual', maxCount: 1 },
  { name: 'logo', maxCount: 1 }
]), async (req, res) => {
  try {
    const kv = req.files?.keyVisual?.[0];
    const logo = req.files?.logo?.[0];
    if (!kv || !logo) {
      return res.status(400).json({ error: '키 비주얼과 로고 이미지가 모두 필요합니다.' });
    }

    const kvInfo = await getImageInfo(kv.path);
    const logoInfo = await getImageInfo(logo.path);

    const warnings = [];
    if (kvInfo.width < 1920) {
      warnings.push(`키 비주얼 해상도가 낮습니다 (${kvInfo.width}px). 1920px 이상 권장.`);
    }

    res.json({
      keyVisualId: kv.filename,
      logoId: logo.filename,
      keyVisualInfo: kvInfo,
      logoInfo: logoInfo,
      warnings,
      previewUrls: {
        keyVisual: `/uploads/${kv.filename}`,
        logo: `/uploads/${logo.filename}`
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
