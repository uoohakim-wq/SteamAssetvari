const sharp = require('sharp');
const path = require('path');
const { ASSET_SPECS, POSITIONS } = require('./assetSpecs');

async function processAsset(keyVisualPath, logoPath, assetKey, logoSettings) {
  const spec = ASSET_SPECS[assetKey];
  if (!spec) throw new Error(`Unknown asset: ${assetKey}`);

  const { w, h } = spec;
  const settings = { ...logoSettings, ...(logoSettings.perAsset?.[assetKey] || {}) };
  const scale = settings.scale ?? 0.4;
  const position = settings.position || 'BC';
  const padding = settings.padding ?? 40;

  // Resize key visual to target dimensions (cover)
  let base = sharp(keyVisualPath).resize(w, h, { fit: 'cover', position: 'centre' });

  // Page background: apply blur + darken, no logo
  if (assetKey === 'page_background') {
    base = base.blur(8).modulate({ brightness: 0.6 });
    return base.jpeg({ quality: 95 }).toBuffer();
  }

  const baseBuffer = await base.toBuffer();

  // Skip logo overlay if spec says no
  if (spec.logoOverlay === false) {
    return sharp(baseBuffer).jpeg({ quality: 95 }).toBuffer();
  }

  // Calculate logo size
  const logoMeta = await sharp(logoPath).metadata();
  const logoTargetW = Math.round(w * scale);
  const logoAspect = logoMeta.height / logoMeta.width;
  const logoTargetH = Math.round(logoTargetW * logoAspect);

  const logoBuffer = await sharp(logoPath)
    .resize(logoTargetW, logoTargetH, { fit: 'inside' })
    .toBuffer();

  const logoResizedMeta = await sharp(logoBuffer).metadata();
  const posCalc = POSITIONS[position] || POSITIONS.BC;
  const { x, y } = posCalc(w, h, logoResizedMeta.width, logoResizedMeta.height, padding);

  const result = await sharp(baseBuffer)
    .composite([{ input: logoBuffer, left: Math.max(0, x), top: Math.max(0, y) }])
    .jpeg({ quality: 95 })
    .toBuffer();

  return result;
}

async function processDerivatives(keyVisualPath, logoPath, logoSettings) {
  const derivatives = ASSET_SPECS.small_capsule.derivatives || [];
  const results = [];

  for (const d of derivatives) {
    const settings = { ...logoSettings, ...(logoSettings.perAsset?.small_capsule || {}) };
    const scale = settings.scale ?? 0.5;
    const position = settings.position || 'MC';
    const padding = settings.padding ?? 10;

    const baseBuffer = await sharp(keyVisualPath)
      .resize(d.w, d.h, { fit: 'cover', position: 'centre' })
      .toBuffer();

    const logoMeta = await sharp(logoPath).metadata();
    const logoTargetW = Math.round(d.w * scale);
    const logoAspect = logoMeta.height / logoMeta.width;
    const logoTargetH = Math.round(logoTargetW * logoAspect);

    const logoBuffer = await sharp(logoPath)
      .resize(logoTargetW, logoTargetH, { fit: 'inside' })
      .toBuffer();

    const logoResizedMeta = await sharp(logoBuffer).metadata();
    const posCalc = POSITIONS[position] || POSITIONS.MC;
    const { x, y } = posCalc(d.w, d.h, logoResizedMeta.width, logoResizedMeta.height, padding);

    const result = await sharp(baseBuffer)
      .composite([{ input: logoBuffer, left: Math.max(0, x), top: Math.max(0, y) }])
      .jpeg({ quality: 95 })
      .toBuffer();

    results.push({ buffer: result, width: d.w, height: d.h });
  }
  return results;
}

async function getImageInfo(filePath) {
  const meta = await sharp(filePath).metadata();
  return { width: meta.width, height: meta.height, format: meta.format };
}

module.exports = { processAsset, processDerivatives, getImageInfo };
