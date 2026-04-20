const sharp = require('sharp');

let falClient = null;

async function initFal() {
  if (falClient) return falClient;
  try {
    if (!process.env.FAL_API_KEY) return null;
    const fal = require('@fal-ai/client');
    fal.config({ credentials: process.env.FAL_API_KEY });
    falClient = fal;
    return falClient;
  } catch {
    return null;
  }
}

/**
 * Expand a landscape image to portrait ratio using AI or blur-fill fallback.
 * @param {string} imagePath - Source image path
 * @param {number} targetW - Target width
 * @param {number} targetH - Target height
 * @returns {Buffer} - Expanded image buffer
 */
async function expandImage(imagePath, targetW, targetH) {
  const fal = await initFal();

  if (fal) {
    try {
      return await expandWithFal(fal, imagePath, targetW, targetH);
    } catch (err) {
      console.warn('AI expansion failed, using fallback:', err.message);
    }
  }

  return await blurFillFallback(imagePath, targetW, targetH);
}

async function expandWithFal(fal, imagePath, targetW, targetH) {
  const imageBuffer = await sharp(imagePath)
    .resize(targetW, targetW, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer();

  const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;

  // Create mask: white areas = fill, black = keep
  const maskH = targetH - targetW;
  const mask = await sharp({
    create: { width: targetW, height: targetH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 255 } }
  })
    .composite([{
      input: await sharp({
        create: { width: targetW, height: Math.round(maskH / 2), channels: 4, background: { r: 255, g: 255, b: 255, alpha: 255 } }
      }).png().toBuffer(),
      top: 0, left: 0
    }, {
      input: await sharp({
        create: { width: targetW, height: Math.round(maskH / 2), channels: 4, background: { r: 255, g: 255, b: 255, alpha: 255 } }
      }).png().toBuffer(),
      top: targetH - Math.round(maskH / 2), left: 0
    }])
    .png()
    .toBuffer();

  const base64Mask = `data:image/png;base64,${mask.toString('base64')}`;

  const result = await fal.run("fal-ai/flux-pro/v1/fill", {
    input: {
      image_url: base64Image,
      mask_url: base64Mask,
      prompt: "seamless background extension, same style and lighting",
      image_size: { width: targetW, height: targetH }
    }
  });

  if (result?.data?.images?.[0]?.url) {
    const response = await fetch(result.data.images[0].url);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  throw new Error('No image returned from fal.ai');
}

async function blurFillFallback(imagePath, targetW, targetH) {
  const meta = await sharp(imagePath).metadata();
  const sourceAspect = meta.width / meta.height;
  const targetAspect = targetW / targetH;

  // Create blurred background at full target size
  const blurredBg = await sharp(imagePath)
    .resize(targetW, targetH, { fit: 'cover', position: 'centre' })
    .blur(30)
    .modulate({ brightness: 0.7 })
    .toBuffer();

  // Fit the original image inside the target dimensions
  let fitW, fitH;
  if (sourceAspect > targetAspect) {
    fitW = targetW;
    fitH = Math.round(targetW / sourceAspect);
  } else {
    fitH = targetH;
    fitW = Math.round(targetH * sourceAspect);
  }

  const fittedImage = await sharp(imagePath)
    .resize(fitW, fitH, { fit: 'inside' })
    .toBuffer();

  const top = Math.round((targetH - fitH) / 2);
  const left = Math.round((targetW - fitW) / 2);

  return sharp(blurredBg)
    .composite([{ input: fittedImage, top, left }])
    .toBuffer();
}

module.exports = { expandImage };
