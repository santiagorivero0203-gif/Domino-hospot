const fs = require('fs');
const path = require('path');

const sizes = [192, 512];
const publicDir = path.join(__dirname, '..', 'public');

sizes.forEach((s) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="90" height="90" x="5" y="5" rx="10" fill="#faf3e0" stroke="#8b7355" stroke-width="3"/>
  <line x1="50" y1="10" x2="50" y2="90" stroke="#8b7355" stroke-width="2"/>
  <circle cx="30" cy="30" r="6" fill="#1a1a2e"/>
  <circle cx="70" cy="70" r="6" fill="#1a1a2e"/>
</svg>`;
  fs.writeFileSync(path.join(publicDir, `icon-${s}x${s}.svg`), svg);
  console.log(`Created icon-${s}x${s}.svg`);
});
