import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create SVG icon
function createSVGIcon(size) {
  const center = size / 2;
  const radius = size * 0.35;
  
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="grad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#1e40af;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#059669;stop-opacity:1" />
    </radialGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="#ffffff"/>
  
  <!-- Border -->
  <rect x="${size/16}" y="${size/16}" width="${size*7/8}" height="${size*7/8}" 
        fill="none" stroke="#e5e7eb" stroke-width="${Math.max(1, size/64)}"/>
  
  <!-- Main circle -->
  <circle cx="${center}" cy="${center}" r="${radius}" fill="url(#grad)"/>
  
  <!-- FPL text -->
  <text x="${center}" y="${center - size*0.05}" 
        font-family="Arial, sans-serif" font-size="${size*0.25}" 
        font-weight="bold" text-anchor="middle" fill="#ffffff">
    FPL
  </text>
  
  <!-- LIVE text -->
  <text x="${center}" y="${center + size*0.15}" 
        font-family="Arial, sans-serif" font-size="${size*0.15}" 
        font-weight="bold" text-anchor="middle" fill="#ffffff">
    LIVE
  </text>
  
  <!-- Football icon -->
  <circle cx="${center}" cy="${center}" r="${size*0.2}" 
          fill="none" stroke="#ffffff" stroke-width="${Math.max(2, size/32)}"/>
  
  <!-- Football lines -->
  <line x1="${center - size*0.2}" y1="${center}" x2="${center + size*0.2}" y2="${center}" 
        stroke="#ffffff" stroke-width="${Math.max(2, size/32)}"/>
  <line x1="${center}" y1="${center - size*0.2}" x2="${center}" y2="${center + size*0.2}" 
        stroke="#ffffff" stroke-width="${Math.max(2, size/32)}"/>
</svg>`;
}

// Create PNG icon using canvas (if available)
async function createPNGIcon(size) {
  try {
    const { createCanvas } = await import('canvas');
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    
    // Border
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = Math.max(1, size / 64);
    ctx.strokeRect(size / 16, size / 16, size * 7 / 8, size * 7 / 8);
    
    // Primary circle
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.35;
    
    // Gradient background
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, '#1e40af');
    gradient.addColorStop(1, '#059669');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fill();
    
    // FPL text
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${size * 0.25}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FPL', centerX, centerY - size * 0.05);
    
    // Live text
    ctx.font = `bold ${size * 0.15}px Arial`;
    ctx.fillText('LIVE', centerX, centerY + size * 0.15);
    
    // Football icon
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, size / 32);
    
    const ballSize = size * 0.2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, ballSize, 0, 2 * Math.PI);
    ctx.stroke();
    
    // Football lines
    ctx.beginPath();
    ctx.moveTo(centerX - ballSize, centerY);
    ctx.lineTo(centerX + ballSize, centerY);
    ctx.moveTo(centerX, centerY - ballSize);
    ctx.lineTo(centerX, centerY + ballSize);
    ctx.stroke();
    
    return canvas.toBuffer('image/png');
  } catch (error) {
    console.log(`Canvas not available, skipping PNG generation for ${size}x${size}`);
    return null;
  }
}

// Generate all icons
async function generateIcons() {
  console.log('🎨 Generating PWA icons...');
  
  const iconsDir = path.join(__dirname, '../client/public/icons');
  await fs.mkdir(iconsDir, { recursive: true });
  
  const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
  
  for (const size of sizes) {
    console.log(`  📱 Generating ${size}x${size} icon...`);
    
    // Create SVG
    const svgContent = createSVGIcon(size);
    const svgPath = path.join(iconsDir, `icon-${size}x${size}.svg`);
    await fs.writeFile(svgPath, svgContent);
    
    // Try to create PNG
    const pngBuffer = await createPNGIcon(size);
    if (pngBuffer) {
      const pngPath = path.join(iconsDir, `icon-${size}x${size}.png`);
      await fs.writeFile(pngPath, pngBuffer);
      console.log(`    ✅ Generated ${size}x${size} PNG`);
    }
    
    console.log(`    ✅ Generated ${size}x${size} SVG`);
  }
  
  // Create favicon
  console.log('🔗 Generating favicon...');
  const faviconContent = createSVGIcon(32);
  const faviconPath = path.join(__dirname, '../client/public/favicon.svg');
  await fs.writeFile(faviconPath, faviconContent);
  console.log('  ✅ Generated favicon.svg');
  
  console.log('🎉 All icons generated successfully!');
}

// Generate screenshots
async function generateScreenshots() {
  console.log('📸 Generating app store screenshots...');
  
  const screenshotsDir = path.join(__dirname, '../client/public/screenshots');
  await fs.mkdir(screenshotsDir, { recursive: true });
  
  // Create a simple screenshot SVG
  const screenshotSVG = `<svg width="1170" height="2532" viewBox="0 0 1170 2532" xmlns="http://www.w3.org/2000/svg">
    <rect width="1170" height="2532" fill="#ffffff"/>
    
    <!-- Header -->
    <rect x="0" y="0" width="1170" height="380" fill="#1e40af"/>
    
    <!-- App icon -->
    <circle cx="100" cy="190" r="60" fill="url(#grad)"/>
    <text x="100" y="180" font-family="Arial, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="#ffffff">FPL</text>
    <text x="100" y="210" font-family="Arial, sans-serif" font-size="14" font-weight="bold" text-anchor="middle" fill="#ffffff">LIVE</text>
    
    <!-- App name -->
    <text x="200" y="200" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#ffffff">FPL Live Tracker</text>
    
    <!-- Content -->
    <text x="585" y="600" font-family="Arial, sans-serif" font-size="36" font-weight="bold" text-anchor="middle" fill="#1f2937">Live Draft & Scoring</text>
    
    <!-- Mock UI -->
    <rect x="117" y="700" width="936" height="100" fill="#059669" rx="10"/>
    <text x="585" y="750" font-family="Arial, sans-serif" font-size="24" text-anchor="middle" fill="#ffffff">Draft Interface</text>
    
    <rect x="117" y="850" width="936" height="100" fill="#1e40af" rx="10"/>
    <text x="585" y="900" font-family="Arial, sans-serif" font-size="24" text-anchor="middle" fill="#ffffff">Live Scores</text>
    
    <rect x="117" y="1000" width="936" height="100" fill="#dc2626" rx="10"/>
    <text x="585" y="1050" font-family="Arial, sans-serif" font-size="24" text-anchor="middle" fill="#ffffff">Team Management</text>
    
    <!-- Features -->
    <text x="585" y="1200" font-family="Arial, sans-serif" font-size="28" font-weight="bold" text-anchor="middle" fill="#1f2937">Features</text>
    <text x="585" y="1250" font-family="Arial, sans-serif" font-size="20" text-anchor="middle" fill="#6b7280">• Real-time draft updates</text>
    <text x="585" y="1280" font-family="Arial, sans-serif" font-size="20" text-anchor="middle" fill="#6b7280">• Live gameweek scoring</text>
    <text x="585" y="1310" font-family="Arial, sans-serif" font-size="20" text-anchor="middle" fill="#6b7280">• Mobile-first design</text>
    <text x="585" y="1340" font-family="Arial, sans-serif" font-size="20" text-anchor="middle" fill="#6b7280">• Push notifications</text>
    
    <defs>
      <radialGradient id="grad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" style="stop-color:#1e40af;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#059669;stop-opacity:1" />
      </radialGradient>
    </defs>
  </svg>`;
  
  const screenshotPath = path.join(screenshotsDir, 'iPhone-14-Pro.png');
  await fs.writeFile(screenshotPath.replace('.png', '.svg'), screenshotSVG);
  console.log('  ✅ Generated iPhone screenshot');
  
  console.log('📸 Screenshots generated successfully!');
}

// Main execution
async function main() {
  try {
    await generateIcons();
    await generateScreenshots();
    console.log('\n🎉 PWA assets generation completed!');
    console.log('📁 Icons saved to: client/public/icons/');
    console.log('📸 Screenshots saved to: client/public/screenshots/');
    console.log('🔗 Favicon saved to: client/public/favicon.svg');
  } catch (error) {
    console.error('❌ Error generating PWA assets:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateIcons, generateScreenshots };

