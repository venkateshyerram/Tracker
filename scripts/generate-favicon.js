const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const pngToIco = require('png-to-ico');

const sizes = [16, 32, 48, 64, 128, 192, 512];
const publicDir = path.join(__dirname, '../public');

// Generate PNG files
async function generatePNGs() {
  for (const size of sizes) {
    await sharp(path.join(publicDir, 'favicon.svg'))
      .resize(size, size)
      .png()
      .toFile(path.join(publicDir, `favicon-${size}x${size}.png`));
  }
}

// Generate ICO file using png-to-ico
async function generateICO() {
  const pngPaths = [16, 32, 48].map(size => path.join(publicDir, `favicon-${size}x${size}.png`));
  const icoBuffer = await pngToIco(pngPaths);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
}

// Generate all files
async function generateAll() {
  try {
    await generatePNGs();
    await generateICO();
    console.log('Favicon files generated successfully!');
  } catch (error) {
    console.error('Error generating favicon files:', error);
  }
}

generateAll(); 