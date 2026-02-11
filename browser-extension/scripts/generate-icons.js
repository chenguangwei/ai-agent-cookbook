// Generate PNG icons from SVG using Playwright
import { chromium } from 'playwright';

async function generateIcons() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#3b82f6"/>
          <stop offset="100%" style="stop-color:#1d4ed8"/>
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="24" fill="url(#bg)"/>
      <text x="64" y="80" font-family="system-ui, -apple-system, sans-serif"
            font-size="48" font-weight="bold" fill="white" text-anchor="middle">AH</text>
      <circle cx="96" cy="32" r="12" fill="#fbbf24"/>
    </svg>
  `;

  const sizes = [
    { name: 'icon16.png', scale: 0.125 },
    { name: 'icon48.png', scale: 0.375 },
    { name: 'icon128.png', scale: 1 },
  ];

  const basePath = '/Users/chenguangwei/Documents/workspaceself/ai-agent-cookbook/browser-extension/icons';

  for (const { name, scale } of sizes) {
    const width = Math.round(128 * scale);
    const height = Math.round(128 * scale);

    await page.setContent(svgContent, { waitUntil: 'networkidle' });
    await page.setViewportSize({ width, height });

    const buffer = await page.screenshot({ type: 'png' });
    const fs = await import('fs');
    fs.writeFileSync(`${basePath}/${name}`, buffer);
    console.log(`Generated ${name} (${width}x${height})`);
  }

  await browser.close();
}

generateIcons().catch(console.error);
