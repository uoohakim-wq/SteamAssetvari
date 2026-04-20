const express = require('express');
const path = require('path');
const archiver = require('archiver');
const { ASSET_SPECS } = require('../services/assetSpecs');
const { processAsset, processDerivatives } = require('../services/imageProcessor');

const router = express.Router();
const UPLOADS = path.join(__dirname, '../../uploads');

router.post('/', async (req, res) => {
  try {
    const { keyVisualId, logoId, selectedAssets, logoSettings, aiExpand } = req.body;

    if (!keyVisualId || !logoId || !selectedAssets?.length) {
      return res.status(400).json({ error: '필수 파라미터가 누락되었습니다.' });
    }

    const kvPath = path.join(UPLOADS, keyVisualId);
    const logoPath = path.join(UPLOADS, logoId);

    // SSE for progress
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendProgress = (asset, status, preview) => {
      res.write(`data: ${JSON.stringify({ asset, status, preview })}\n\n`);
    };

    const results = [];

    for (const assetKey of selectedAssets) {
      const spec = ASSET_SPECS[assetKey];
      if (!spec) continue;

      sendProgress(assetKey, 'processing');

      try {
        let buffer;
        buffer = await processAsset(kvPath, logoPath, assetKey, logoSettings || {});

        const filename = `${assetKey}.jpg`;
        const preview = `data:image/jpeg;base64,${buffer.toString('base64')}`;
        results.push({ filename, buffer });
        sendProgress(assetKey, 'done', preview);

        // Handle derivatives (small capsule)
        if (spec.derivatives) {
          const derivs = await processDerivatives(kvPath, logoPath, logoSettings || {});
          for (const d of derivs) {
            const dFilename = `small_capsule_${d.width}x${d.height}.jpg`;
            const dPreview = `data:image/jpeg;base64,${d.buffer.toString('base64')}`;
            results.push({ filename: dFilename, buffer: d.buffer });
            sendProgress(dFilename, 'done', dPreview);
          }
        }
      } catch (err) {
        sendProgress(assetKey, 'error');
        console.error(`Error processing ${assetKey}:`, err);
      }
    }

    // Signal completion with download URL
    const zipId = `steam_assets_${Date.now()}.zip`;
    const zipPath = path.join(UPLOADS, zipId);

    const fs = require('fs');
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(output);

    for (const r of results) {
      archive.append(r.buffer, { name: r.filename });
    }

    await archive.finalize();
    await new Promise(resolve => output.on('close', resolve));

    sendProgress('__complete__', 'done', `/api/download/${zipId}`);
    res.end();
  } catch (err) {
    console.error('Generate error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ asset: '__error__', status: 'error' })}\n\n`);
      res.end();
    }
  }
});

module.exports = router;
