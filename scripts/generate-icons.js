import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage, registerFont } from 'canvas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Icon sizes for different platforms
const ICON_SIZES = {
  // PWA Icons
  pwa: [16, 32, 48, 72, 96, 128, 144, 152, 192, 384, 512],
  
  // iOS Icons
  ios: [20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024],
  
  // Android Icons
  android: [36, 48, 72, 96, 144, 192],
  
  // Windows Icons
  windows: [70, 150, 310],
  
  // Favicon
  favicon: [16, 32, 48]
};

// Color scheme for FPL Live Tracker
const COLORS = {
  primary: '#1e40af',      // Blue
  secondary: '#059669',    // Green
  accent: '#dc2626',       // Red
  background: '#ffffff',   // White
  text: '#1f2937',        // Dark gray
  border: '#e5e7eb'       // Light gray
};

// Create base icon design
async function createBaseIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, size, size);
  
  // Border
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = Math.max(1, size / 64);
  ctx.strokeRect(size / 16, size / 16, size * 7 / 8, size * 7 / 8);
  
  // Primary circle
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.35;
  
  // Gradient background
  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  gradient.addColorStop(0, COLORS.primary);
  gradient.addColorStop(1, COLORS.secondary);
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.fill();
  
  // FPL text
  ctx.fillStyle = COLORS.background;
  ctx.font = `bold ${size * 0.25}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FPL', centerX, centerY - size * 0.05);
  
  // Live text
  ctx.font = `bold ${size * 0.15}px Arial`;
  ctx.fillText('LIVE', centerX, centerY + size * 0.15);
  
  // Football icon (simplified)
  ctx.strokeStyle = COLORS.background;
  ctx.lineWidth = Math.max(2, size / 32);
  
  // Draw a simple football pattern
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
  
  return canvas;
}

// Create iOS-specific icon (rounded corners)
async function createIOSIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Create base icon
  const baseCanvas = await createBaseIcon(size);
  ctx.drawImage(baseCanvas, 0, 0);
  
  // Add iOS-specific styling (rounded corners)
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = '#000000';
  
  const cornerRadius = size * 0.2;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, cornerRadius);
  ctx.fill();
  
  return canvas;
}

// Create Android-specific icon (adaptive)
async function createAndroidIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Create base icon
  const baseCanvas = await createBaseIcon(size);
  ctx.drawImage(baseCanvas, 0, 0);
  
  // Add Android-specific styling
  ctx.strokeStyle = COLORS.accent;
  ctx.lineWidth = Math.max(2, size / 32);
  ctx.strokeRect(size / 8, size / 8, size * 3 / 4, size * 3 / 4);
  
  return canvas;
}

// Save icon to file
async function saveIcon(canvas, filepath) {
  const buffer = canvas.toBuffer('image/png');
  await fs.writeFile(filepath, buffer);
}

// Generate all icons
async function generateAllIcons() {
  console.log('🎨 Generating PWA icons...');
  
  const iconsDir = path.join(__dirname, '../public/icons');
  await fs.mkdir(iconsDir, { recursive: true });
  
  // Generate PWA icons
  console.log('📱 Generating PWA icons...');
  for (const size of ICON_SIZES.pwa) {
    const canvas = await createBaseIcon(size);
    const filepath = path.join(iconsDir, `icon-${size}x${size}.png`);
    await saveIcon(canvas, filepath);
    console.log(`  ✅ Generated ${size}x${size} icon`);
  }
  
  // Generate iOS icons
  console.log('🍎 Generating iOS icons...');
  for (const size of ICON_SIZES.ios) {
    const canvas = await createIOSIcon(size);
    const filepath = path.join(iconsDir, `ios-icon-${size}x${size}.png`);
    await saveIcon(canvas, filepath);
    console.log(`  ✅ Generated iOS ${size}x${size} icon`);
  }
  
  // Generate Android icons
  console.log('🤖 Generating Android icons...');
  for (const size of ICON_SIZES.android) {
    const canvas = await createAndroidIcon(size);
    const filepath = path.join(iconsDir, `android-icon-${size}x${size}.png`);
    await saveIcon(canvas, filepath);
    console.log(`  ✅ Generated Android ${size}x${size} icon`);
  }
  
  // Generate Windows icons
  console.log('🪟 Generating Windows icons...');
  for (const size of ICON_SIZES.windows) {
    const canvas = await createBaseIcon(size);
    const filepath = path.join(iconsDir, `windows-icon-${size}x${size}.png`);
    await saveIcon(canvas, filepath);
    console.log(`  ✅ Generated Windows ${size}x${size} icon`);
  }
  
  // Generate favicon
  console.log('🔗 Generating favicon...');
  const faviconCanvas = await createBaseIcon(32);
  const faviconPath = path.join(__dirname, '../public/favicon.ico');
  await saveIcon(faviconCanvas, faviconPath);
  console.log(`  ✅ Generated favicon`);
  
  console.log('🎉 All icons generated successfully!');
}

// Generate screenshots for app store
async function generateScreenshots() {
  console.log('📸 Generating app store screenshots...');
  
  const screenshotsDir = path.join(__dirname, '../public/screenshots');
  await fs.mkdir(screenshotsDir, { recursive: true });
  
  // iPhone screenshots
  const iphoneSizes = [
    { width: 1170, height: 2532, name: 'iPhone-14-Pro' },
    { width: 1179, height: 2556, name: 'iPhone-14-Pro-Max' },
    { width: 1125, height: 2436, name: 'iPhone-X' }
  ];
  
  for (const size of iphoneSizes) {
    const canvas = createCanvas(size.width, size.height);
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, size.width, size.height);
    
    // Header
    ctx.fillStyle = COLORS.primary;
    ctx.fillRect(0, 0, size.width, size.height * 0.15);
    
    // App icon
    const iconSize = size.height * 0.08;
    const iconCanvas = await createBaseIcon(iconSize);
    ctx.drawImage(iconCanvas, size.width * 0.05, size.height * 0.035);
    
    // App name
    ctx.fillStyle = COLORS.background;
    ctx.font = `bold ${size.height * 0.04}px Arial`;
    ctx.textAlign = 'left';
    ctx.fillText('FPL Live Tracker', size.width * 0.15, size.height * 0.08);
    
    // Screenshot content
    ctx.fillStyle = COLORS.text;
    ctx.font = `bold ${size.height * 0.03}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('Live Draft & Scoring', size.width / 2, size.height * 0.25);
    
    // Mock UI elements
    ctx.fillStyle = COLORS.secondary;
    ctx.fillRect(size.width * 0.1, size.height * 0.3, size.width * 0.8, size.height * 0.1);
    
    ctx.fillStyle = COLORS.primary;
    ctx.fillRect(size.width * 0.1, size.height * 0.45, size.width * 0.8, size.height * 0.1);
    
    ctx.fillStyle = COLORS.accent;
    ctx.fillRect(size.width * 0.1, size.height * 0.6, size.width * 0.8, size.height * 0.1);
    
    // Save screenshot
    const filepath = path.join(screenshotsDir, `${size.name}.png`);
    await saveIcon(canvas, filepath);
    console.log(`  ✅ Generated ${size.name} screenshot`);
  }
  
  console.log('📸 All screenshots generated successfully!');
}

// Main execution
async function main() {
  try {
    await generateAllIcons();
    await generateScreenshots();
    console.log('\n🎉 PWA assets generation completed!');
    console.log('📁 Icons saved to: public/icons/');
    console.log('📸 Screenshots saved to: public/screenshots/');
    console.log('🔗 Favicon saved to: public/favicon.ico');
  } catch (error) {
    console.error('❌ Error generating PWA assets:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateAllIcons, generateScreenshots };

