#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get set name from command line arguments
const setName = process.argv[2];

if (!setName) {
  console.error('Usage: node generate-html.js <setName>');
  console.error('Example: node generate-html.js xxvi');
  process.exit(1);
}

// Set up paths
const setDir = path.join(__dirname, 'set', setName);
const outputJsonPath = path.join(setDir, 'output.json');
const setJsonPath = path.join(setDir, 'set.json');
const wwwDir = path.join(setDir, 'www');
const cardsHtmlPath = path.join(wwwDir, 'cards.html');
const coverHtmlPath = path.join(wwwDir, 'cover.html');
const compiledHtmlPath = path.join(wwwDir, 'compiled.html');
const assetsDir = path.join(setDir, 'assets');
const coverPngPath = path.join(assetsDir, 'cover.png');
const coverJpgPath = path.join(assetsDir, 'cover.jpg');
const coverWebpPath = path.join(assetsDir, 'cover.webp');

// Check if files exist
if (!fs.existsSync(outputJsonPath)) {
  console.error(`Error: Output JSON file "${outputJsonPath}" does not exist`);
  console.error('Run compile.js first to generate the output.json file');
  process.exit(1);
}

// Read the data
const outputData = JSON.parse(fs.readFileSync(outputJsonPath, 'utf-8'));
const cards = outputData.cards;

let setMetadata = {};
if (fs.existsSync(setJsonPath)) {
  try {
    setMetadata = JSON.parse(fs.readFileSync(setJsonPath, 'utf-8'));
  } catch (error) {
    console.warn(`Warning: Could not parse set.json: ${error.message}`);
  }
}

// Helper function to extract rarity code from localID
function getRarityCode(localID) {
  const match = localID.match(/\d+-\d+([A-Z]+)/);
  return match ? match[1] : '';
}

// Flatten cards so each variation is a separate entry
const entries = [];
let id = 0;

cards.forEach(card => {
  card.variation.forEach(variant => {
    const rarityCode = getRarityCode(card.localID);
    const cardNumber = `${card.set}-${String(card.number).padStart(3, '0')}${rarityCode}`;
    entries.push({
      id: id++,
      cardNumber: cardNumber,
      cardName: card.product_name,
      variantType: variant.type,
      averagePrice: variant.marketPriceAvg,
      fullCardNumber: card.localID,
      rarity: card.rarity,
      isLegacy: card.isLegacy || false,
      isPromo: card.isPromo || false,
      isReprint: card.isReprint || false
    });
  });
});

// Sort entries by card number, then by variant type order
const variantOrder = { 'Normal': 0, 'Foil': 1, 'Full Art': 2, 'Full Art Signature': 3 };
entries.sort((a, b) => {
  // First sort by card number
  const numA = a.cardNumber.match(/(\d+)-(\d+)/);
  const numB = b.cardNumber.match(/(\d+)-(\d+)/);
  if (numA && numB) {
    const setA = parseInt(numA[1], 10);
    const setB = parseInt(numB[1], 10);
    if (setA !== setB) return setA - setB;
    const cardA = parseInt(numA[2], 10);
    const cardB = parseInt(numB[2], 10);
    if (cardA !== cardB) return cardA - cardB;
  }
  // Then sort by variant type
  const orderA = variantOrder[a.variantType] ?? 999;
  const orderB = variantOrder[b.variantType] ?? 999;
  return orderA - orderB;
});

// CSS content
const cssContent = `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background: white;
    padding: 20px;
    min-height: 100vh;
}

.container {
    max-width: 1400px;
    margin: 0 auto;
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    overflow: hidden;
}

header {
    background: #667eea;
    color: white;
    padding: 30px;
    text-align: center;
}

header h1 {
    font-size: 2.5em;
    margin-bottom: 10px;
    font-weight: 700;
}

header p {
    font-size: 1.1em;
    opacity: 0.9;
}

.stats {
    background: #f8f9fa;
    padding: 20px 30px;
    border-bottom: 2px solid #e9ecef;
    display: flex;
    justify-content: center;
    gap: 30px;
    flex-wrap: wrap;
}

.stat-item {
    text-align: center;
}

.stat-value {
    font-size: 2em;
    font-weight: 700;
    color: #667eea;
}

.stat-label {
    font-size: 0.9em;
    color: #6c757d;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.cards-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0;
    padding: 30px;
}

.binder-page {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    width: 100%;
    margin-bottom: 30px;
    page-break-inside: avoid;
    break-inside: avoid;
}

@media print {
    body {
        background: white;
        padding: 0;
    }
    
    header {
        background: white;
        color: #212529;
        border-bottom: 2px solid #e9ecef;
    }
    
    .container {
        box-shadow: none;
        border-radius: 0;
    }
    
    .binder-page {
        page-break-inside: avoid;
        break-inside: avoid;
        margin-bottom: 0;
    }
    
    .card-entry {
        page-break-inside: avoid;
        break-inside: avoid;
    }
}

.card-entry {
    background: #f8f9fa;
    border: 2px solid #e9ecef;
    border-radius: 8px;
    padding: 10px 15px;
    transition: all 0.3s ease;
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: auto;
}

.card-entry:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border-color: #667eea;
}

.card-id {
    background: #667eea;
    color: white;
    font-size: 0.75em;
    padding: 4px 8px;
    border-radius: 4px;
    font-weight: 600;
    flex-shrink: 0;
}

.card-number {
    font-size: 0.85em;
    color: #6c757d;
    font-weight: 600;
    font-family: 'Courier New', monospace;
    min-width: 80px;
}

.card-name {
    font-size: 1em;
    font-weight: 600;
    color: #212529;
    flex-grow: 1;
}

.card-variant {
    font-size: 1.2em;
}

.variant-tag {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 0.7em;
    font-weight: 700;
    margin-left: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.tag-legacy {
    background: #6c757d;
    color: white;
}

.tag-promo {
    background: #17a2b8;
    color: white;
}

.tag-reprint {
    background: #fd7e14;
    color: white;
}

.card-tags {
    display: inline-flex;
    gap: 4px;
    font-size: 0.9em;
}

.card-price {
    font-size: 1em;
    font-weight: 700;
    color: #28a745;
    min-width: 60px;
    text-align: right;
}

.card-price::before {
    content: '$';
    font-size: 0.9em;
}

@media (max-width: 1024px) {
    .cards-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 768px) {
    .cards-grid {
        grid-template-columns: 1fr;
    }
    
    header h1 {
        font-size: 2em;
    }
    
    .stats {
        flex-direction: column;
        gap: 15px;
    }
}
`;

// Check for cover image
const coverImagePath = fs.existsSync(coverPngPath) ? '../assets/cover.png' : 
                       fs.existsSync(coverJpgPath) ? '../assets/cover.jpg' : 
                       fs.existsSync(coverWebpPath) ? '../assets/cover.webp' : null;

// Generate HTML
const setTitle = setMetadata.title || setMetadata.alternateTitle || setName.toUpperCase();
const totalValue = entries.reduce((sum, e) => sum + e.averagePrice, 0).toFixed(2);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${setTitle} - Card Collection</title>
    <link rel="stylesheet" href="../../../assets/style.css">
</head>
<body>
    <div class="container">
        <header>
            <div class="header-left">
                <h1>${setTitle}</h1>
                <p>Card Collection Checklist</p>
            </div>
            <div class="header-right">
                <div class="variant-key">
                    <div class="variant-key-item">
                        <span>Foil</span>
                        <span class="variant-key-symbol">✨</span>
                    </div>
                    <div class="variant-key-item">
                        <span>Full Art</span>
                        <span class="variant-key-symbol">⭐</span>
                    </div>
                    <div class="variant-key-item">
                        <span>Full Art Signature</span>
                        <span class="variant-key-symbol">💎</span>
                    </div>
                    <div class="variant-key-item">
                        <span>Legacy</span>
                        <span class="variant-key-symbol">👑</span>
                    </div>
                    <div class="variant-key-item">
                        <span>Reprint</span>
                        <span class="variant-key-symbol">♻️</span>
                    </div>
                    <div class="variant-key-item">
                        <span>Promo</span>
                        <span class="variant-key-symbol">🎁</span>
                    </div>
                </div>
            </div>
        </header>
        
        <div class="cards-grid">
${(() => {
  // Helper function to get rarity class name
  function getRarityClass(rarity) {
    if (!rarity) return 'card-id-rarity-common'; // Default to common if no rarity
    const rarityLower = rarity.toLowerCase();
    if (rarityLower.includes('common')) return 'card-id-rarity-common';
    if (rarityLower.includes('rare')) return 'card-id-rarity-rare';
    if (rarityLower.includes('hero')) return 'card-id-rarity-hero';
    if (rarityLower.includes('legend')) return 'card-id-rarity-legend';
    return 'card-id-rarity-common'; // Default fallback
  }
  
  // Emoji mapping for variants
  const variantEmoji = {
    'Normal': '⚪',
    'Foil': '✨',
    'Full Art': '⭐',
    'Full Art Signature': '💎'
  };
  
  let html = '';
  for (let i = 0; i < entries.length; i += 9) {
    const pageEntries = entries.slice(i, i + 9);
    html += '            <div class="binder-page">\n';
    html += pageEntries.map(entry => {
      let variantSymbol;
      const tags = [];
      
      if (entry.isLegacy) {
        // Legacy cards get a single symbol, replacing variant + reprint tags
        variantSymbol = '👑';
      } else {
        // Don't show symbol for Normal cards
        variantSymbol = entry.variantType === 'Normal' ? '' : (variantEmoji[entry.variantType] || '');
        if (entry.isReprint) tags.push('♻️');
      }
      
      if (entry.isPromo) tags.push('🎁');
      const tagsHtml = tags.length > 0 ? `<span class="card-tags">${tags.join('')}</span>` : '';
      const variantHtml = variantSymbol ? `<div class="card-variant">${variantSymbol}</div>` : '';
      const rarityClass = getRarityClass(entry.rarity);
      
      return `                <div class="card-entry">
                    <div class="card-header">
                        <span class="card-id ${rarityClass}">#${entry.id}</span>
                        <div class="card-number">${entry.cardNumber}</div>
                    </div>
                    <div class="card-name">${entry.cardName}</div>
                    ${variantHtml}
                    ${tagsHtml}
                    <div class="card-price">${entry.averagePrice.toFixed(2)}</div>
                </div>`;
    }).join('\n');
    html += '\n            </div>\n';
  }
  return html;
})()}
        </div>
    </div>
</body>
</html>`;

// Create www directory if it doesn't exist
if (!fs.existsSync(wwwDir)) {
  fs.mkdirSync(wwwDir, { recursive: true });
}

// Write cards HTML file
fs.writeFileSync(cardsHtmlPath, html, 'utf-8');
console.log(`Successfully generated ${cardsHtmlPath}`);
console.log(`Total entries: ${entries.length}`);

// Generate cover.html if cover image exists
const generatedDate = new Date().toLocaleDateString('en-US', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
});

let coverHtmlContent = '';
if (coverImagePath) {
  const coverTitle = setMetadata.title || setName.toUpperCase();
  const coverSubtitle = setMetadata.alternateTitle || null;
  coverHtmlContent = `
        <div class="cover-page">
            <div class="cover-art-container">
                <img src="${coverImagePath}" alt="${coverTitle}" class="cover-art">
            </div>
            <h1 class="cover-title">${coverTitle}</h1>
            ${coverSubtitle ? `<p class="cover-subtitle">${coverSubtitle}</p>` : ''}
            <div class="cover-stats-grid">
                <div class="cover-stat-box">
                    <div class="cover-stat-value">${cards.length}</div>
                    <div class="cover-stat-label">Unique Cards</div>
                </div>
                <div class="cover-stat-box">
                    <div class="cover-stat-value">${entries.length}</div>
                    <div class="cover-stat-label">Total Variations</div>
                </div>
                <div class="cover-stat-box">
                    <div class="cover-stat-value">$${totalValue}</div>
                    <div class="cover-stat-label">Total Value</div>
                </div>
            </div>
            <div class="cover-date">Generated ${generatedDate}</div>
        </div>`;
  
  const coverHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${setTitle} - Cover</title>
    <link rel="stylesheet" href="../../../assets/style.css">
</head>
<body>
    <div class="container">
${coverHtmlContent}
    </div>
</body>
</html>`;
  
  fs.writeFileSync(coverHtmlPath, coverHtml, 'utf-8');
  console.log(`Successfully generated ${coverHtmlPath}`);
}

// Helper function to get rarity class name
function getRarityClass(rarity) {
  if (!rarity) return 'card-id-rarity-common'; // Default to common if no rarity
  const rarityLower = rarity.toLowerCase();
  if (rarityLower.includes('common')) return 'card-id-rarity-common';
  if (rarityLower.includes('rare')) return 'card-id-rarity-rare';
  if (rarityLower.includes('hero')) return 'card-id-rarity-hero';
  if (rarityLower.includes('legend')) return 'card-id-rarity-legend';
  return 'card-id-rarity-common'; // Default fallback
}

// Helper function to generate card grid HTML
function generateCardGridHtml(entries) {
  const variantEmoji = {
    'Normal': '⚪',
    'Foil': '✨',
    'Full Art': '⭐',
    'Full Art Signature': '💎'
  };
  
  let html = '';
  for (let i = 0; i < entries.length; i += 9) {
    const pageEntries = entries.slice(i, i + 9);
    html += '            <div class="binder-page">\n';
    html += pageEntries.map(entry => {
      let variantSymbol;
      const tags = [];
      
      if (entry.isLegacy) {
        variantSymbol = '👑';
      } else {
        variantSymbol = entry.variantType === 'Normal' ? '' : (variantEmoji[entry.variantType] || '');
        if (entry.isReprint) tags.push('♻️');
      }
      
      if (entry.isPromo) tags.push('🎁');
      const tagsHtml = tags.length > 0 ? `<span class="card-tags">${tags.join('')}</span>` : '';
      const variantHtml = variantSymbol ? `<div class="card-variant">${variantSymbol}</div>` : '';
      const rarityClass = getRarityClass(entry.rarity);
      
      return `                <div class="card-entry">
                    <div class="card-header">
                        <span class="card-id ${rarityClass}">#${entry.id}</span>
                        <div class="card-number">${entry.cardNumber}</div>
                    </div>
                    <div class="card-name">${entry.cardName}</div>
                    ${variantHtml}
                    ${tagsHtml}
                    <div class="card-price">${entry.averagePrice.toFixed(2)}</div>
                </div>`;
    }).join('\n');
    html += '\n            </div>\n';
  }
  return html;
}

// Prepare data for compiled views
const top54Entries = [...entries].sort((a, b) => b.averagePrice - a.averagePrice).slice(0, 54);
const rarities = [...new Set(entries.map(e => e.rarity))].sort();
const normalEntries = entries.filter(e => e.variantType === 'Normal');
const top54Normal = [...normalEntries].sort((a, b) => b.averagePrice - a.averagePrice).slice(0, 54);
const foilEntries = entries.filter(e => e.variantType === 'Foil');
const topFoil = [...foilEntries].sort((a, b) => b.averagePrice - a.averagePrice).slice(0, 54);
const fullArtEntries = entries.filter(e => 
  e.variantType === 'Full Art' || 
  e.variantType === 'Full Art Signature' || 
  e.isLegacy === true
);
const fullArtCards = [...fullArtEntries].sort((a, b) => b.averagePrice - a.averagePrice);

// Variant key HTML (reusable across all headers)
const variantKeyHtml = `
                <div class="header-right">
                    <div class="variant-key">
                        <div class="variant-key-item">
                            <span>Foil</span>
                            <span class="variant-key-symbol">✨</span>
                        </div>
                        <div class="variant-key-item">
                            <span>Full Art</span>
                            <span class="variant-key-symbol">⭐</span>
                        </div>
                        <div class="variant-key-item">
                            <span>Full Art Signature</span>
                            <span class="variant-key-symbol">💎</span>
                        </div>
                        <div class="variant-key-item">
                            <span>Legacy</span>
                            <span class="variant-key-symbol">👑</span>
                        </div>
                        <div class="variant-key-item">
                            <span>Reprint</span>
                            <span class="variant-key-symbol">♻️</span>
                        </div>
                        <div class="variant-key-item">
                            <span>Promo</span>
                            <span class="variant-key-symbol">🎁</span>
                        </div>
                    </div>
                </div>`;

// Generate compiled.html that combines cover and cards
const compiledHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${setTitle} - Compiled</title>
    <link rel="stylesheet" href="../../../assets/style.css">
</head>
<body>
    <div class="container">
${coverImagePath ? coverHtmlContent : ''}
        <div class="cards-page" id="card-collection-checklist">
            <header>
                <div class="header-left">
                    <h1>${setTitle}</h1>
                    <p>Card Collection Checklist</p>
                </div>
                <div class="header-right">
                    <div class="variant-key">
                        <div class="variant-key-item">
                            <span>Foil</span>
                            <span class="variant-key-symbol">✨</span>
                        </div>
                        <div class="variant-key-item">
                            <span>Full Art</span>
                            <span class="variant-key-symbol">⭐</span>
                        </div>
                        <div class="variant-key-item">
                            <span>Full Art Signature</span>
                            <span class="variant-key-symbol">💎</span>
                        </div>
                        <div class="variant-key-item">
                            <span>Legacy</span>
                            <span class="variant-key-symbol">👑</span>
                        </div>
                        <div class="variant-key-item">
                            <span>Reprint</span>
                            <span class="variant-key-symbol">♻️</span>
                        </div>
                        <div class="variant-key-item">
                            <span>Promo</span>
                            <span class="variant-key-symbol">🎁</span>
                        </div>
                    </div>
                </div>
            </header>
            
            <div class="cards-grid">
${generateCardGridHtml(entries)}
            </div>
        </div>
        <div class="cards-page" id="top-54-most-valuable">
            <header>
                <div class="header-left">
                    <h1>${setTitle}</h1>
                    <p>Top 54 Most Valuable Cards</p>
                </div>${variantKeyHtml}
            </header>
            <div class="cards-grid">
${generateCardGridHtml(top54Entries)}
            </div>
        </div>
${(() => {
  let html = '';
  rarities.forEach(rarity => {
    const rarityEntries = entries.filter(e => e.rarity === rarity);
    const top54 = [...rarityEntries].sort((a, b) => b.averagePrice - a.averagePrice).slice(0, 54);
    if (top54.length > 0) {
      const rarityId = `top-54-${rarity.toLowerCase().replace(/\s+/g, '-')}`;
      html += `        <div class="cards-page" id="${rarityId}">
            <header>
                <div class="header-left">
                    <h1>${setTitle}</h1>
                    <p>Top 54 Most Valuable ${rarity} Cards</p>
                </div>${variantKeyHtml}
            </header>
            <div class="cards-grid">
${generateCardGridHtml(top54)}
            </div>
        </div>
`;
    }
  });
  return html;
})()}
        <div class="cards-page" id="top-54-normal">
            <header>
                <div class="header-left">
                    <h1>${setTitle}</h1>
                    <p>Top 54 Most Valuable Normal Cards</p>
                </div>${variantKeyHtml}
            </header>
            <div class="cards-grid">
${generateCardGridHtml(top54Normal)}
            </div>
        </div>
        <div class="cards-page" id="top-54-foil">
            <header>
                <div class="header-left">
                    <h1>${setTitle}</h1>
                    <p>Top 54 Most Valuable Foil Cards (Non-Full Art)</p>
                </div>${variantKeyHtml}
            </header>
            <div class="cards-grid">
${generateCardGridHtml(topFoil)}
            </div>
        </div>
        <div class="cards-page" id="full-art-cards">
            <header>
                <div class="header-left">
                    <h1>${setTitle}</h1>
                    <p>All Full Art Cards (Sorted by Value)</p>
                </div>${variantKeyHtml}
            </header>
            <div class="cards-grid">
${generateCardGridHtml(fullArtCards)}
            </div>
        </div>
        <div class="cards-page" id="card-index">
            <header>
                <div class="header-left">
                    <h1>${setTitle}</h1>
                    <p>Card Index</p>
                </div>${variantKeyHtml}
            </header>
            <div class="card-index">
                ${generateCardIndexHtml(entries)}
            </div>
        </div>
    </div>
</body>
</html>`;

fs.writeFileSync(compiledHtmlPath, compiledHtml, 'utf-8');
console.log(`Successfully generated ${compiledHtmlPath}`);

// Generate Top 54 Most Valuable Cards
const top54Html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${setTitle} - Top 54 Most Valuable</title>
    <link rel="stylesheet" href="../../../assets/style.css">
</head>
<body>
    <div class="container">
        <header>
            <div class="header-left">
                <h1>${setTitle}</h1>
                <p>Top 54 Most Valuable Cards</p>
            </div>
        </header>
        <div class="cards-grid">
${generateCardGridHtml(top54Entries)}
        </div>
    </div>
</body>
</html>`;
fs.writeFileSync(path.join(wwwDir, 'top54.html'), top54Html, 'utf-8');
console.log(`Successfully generated ${path.join(wwwDir, 'top54.html')}`);

// Generate Top 54 per Rarity (using data already prepared above)
let top54PerRarityHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${setTitle} - Top 54 Per Rarity</title>
    <link rel="stylesheet" href="../../../assets/style.css">
</head>
<body>
    <div class="container">
        <header>
            <div class="header-left">
                <h1>${setTitle}</h1>
                <p>Top 54 Most Valuable Cards Per Rarity</p>
            </div>
        </header>
        <div class="cards-grid">
`;

rarities.forEach(rarity => {
  const rarityEntries = entries.filter(e => e.rarity === rarity && e.variantType === 'Normal');
  const top54 = [...rarityEntries].sort((a, b) => b.averagePrice - a.averagePrice).slice(0, 54);
  if (top54.length > 0) {
    top54PerRarityHtml += `            <h2 style="grid-column: 1 / -1; margin: 30px 0 20px 0; padding-bottom: 10px; border-bottom: 2px solid #e9ecef; font-size: 1.5em; color: #667eea;">${rarity}</h2>\n`;
    top54PerRarityHtml += generateCardGridHtml(top54);
  }
});

top54PerRarityHtml += `        </div>
    </div>
</body>
</html>`;
fs.writeFileSync(path.join(wwwDir, 'top54-per-rarity.html'), top54PerRarityHtml, 'utf-8');
console.log(`Successfully generated ${path.join(wwwDir, 'top54-per-rarity.html')}`);

// Generate Top 54 NORMAL Cards (using data already prepared above)
const top54NormalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${setTitle} - Top 54 Normal Cards</title>
    <link rel="stylesheet" href="../../../assets/style.css">
</head>
<body>
    <div class="container">
        <header>
            <div class="header-left">
                <h1>${setTitle}</h1>
                <p>Top 54 Most Valuable Normal Cards</p>
            </div>
        </header>
        <div class="cards-grid">
${generateCardGridHtml(top54Normal)}
        </div>
    </div>
</body>
</html>`;
fs.writeFileSync(path.join(wwwDir, 'top54-normal.html'), top54NormalHtml, 'utf-8');
console.log(`Successfully generated ${path.join(wwwDir, 'top54-normal.html')}`);

// Generate Top Foil Non-Full Art Cards (using data already prepared above)
const topFoilHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${setTitle} - Top Foil Cards</title>
    <link rel="stylesheet" href="../../../assets/style.css">
</head>
<body>
    <div class="container">
        <header>
            <div class="header-left">
                <h1>${setTitle}</h1>
                <p>Most Valuable Foil Cards (Non-Full Art)</p>
            </div>
        </header>
        <div class="cards-grid">
${generateCardGridHtml(topFoil)}
        </div>
    </div>
</body>
</html>`;
fs.writeFileSync(path.join(wwwDir, 'top-foil.html'), topFoilHtml, 'utf-8');
console.log(`Successfully generated ${path.join(wwwDir, 'top-foil.html')}`);

// Generate All Full Art Cards (using data already prepared above)
const fullArtHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${setTitle} - Full Art Cards</title>
    <link rel="stylesheet" href="../../../assets/style.css">
</head>
<body>
    <div class="container">
        <header>
            <div class="header-left">
                <h1>${setTitle}</h1>
                <p>All Full Art Cards (Sorted by Value)</p>
            </div>
        </header>
        <div class="cards-grid">
${generateCardGridHtml(fullArtCards)}
        </div>
    </div>
</body>
</html>`;
fs.writeFileSync(path.join(wwwDir, 'full-art.html'), fullArtHtml, 'utf-8');
console.log(`Successfully generated ${path.join(wwwDir, 'full-art.html')}`);

// Helper function to generate card index inline HTML
function generateCardIndexHtml(entries) {
  const variantEmoji = {
    'Normal': '',
    'Foil': '✨',
    'Full Art': '⭐',
    'Full Art Signature': '💎'
  };
  
  return entries.map(entry => {
    const variantSymbol = entry.isLegacy ? '👑' : (variantEmoji[entry.variantType] || '');
    const price = entry.averagePrice.toFixed(2);
    return `<span class="index-entry"><span class="index-name"><strong>${entry.cardName}</strong></span> <span class="index-variant">${variantSymbol}</span> <span class="index-number">(#${entry.id}, ${entry.cardNumber})</span> <span class="index-price">$${price}</span></span>`;
  }).join(', ');
}

// Generate Card Index (hyper-compressed inline view)
const cardIndexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${setTitle} - Card Index</title>
    <link rel="stylesheet" href="../../../assets/style.css">
</head>
<body>
    <div class="container">
        <header>
            <div class="header-left">
                <h1>${setTitle}</h1>
                <p>Card Index</p>
            </div>
        </header>
        <div class="card-index">
            ${generateCardIndexHtml(entries)}
        </div>
    </div>
</body>
</html>`;
fs.writeFileSync(path.join(wwwDir, 'index.html'), cardIndexHtml, 'utf-8');
console.log(`Successfully generated ${path.join(wwwDir, 'index.html')}`);

// Generate Checklist (compact checklist view)
const sortedEntriesForChecklist = [...entries].sort((a, b) => {
  // Sort by card number
  if (a.cardNumber !== b.cardNumber) {
    return a.cardNumber.localeCompare(b.cardNumber);
  }
  // Then by variant type order
  const variantOrder = { 'Normal': 0, 'Foil': 1, 'Full Art': 2, 'Full Art Signature': 3 };
  const orderA = variantOrder[a.variantType] ?? 999;
  const orderB = variantOrder[b.variantType] ?? 999;
  return orderA - orderB;
});

const checklistHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${setTitle} - Checklist</title>
    <link rel="stylesheet" href="../../../assets/style.css">
</head>
<body>
    <div class="checklist-container">
        <header>
            <div class="header-left">
                <h1>${setTitle}</h1>
                <p>Card Checklist</p>
            </div>
        </header>
        <div class="checklist-grid">
${(() => {
  const variantEmoji = {
    'Normal': '',
    'Foil': '✨',
    'Full Art': '⭐',
    'Full Art Signature': '💎'
  };
  
  return sortedEntriesForChecklist.map(entry => {
    const variantSymbol = entry.isLegacy ? '👑' : (variantEmoji[entry.variantType] || '');
    const variantHtml = variantSymbol ? `<span class="checklist-variant">${variantSymbol}</span>` : '';
    
    return `            <div class="checklist-item">
                <span class="checklist-id">#${entry.id}</span>
                <span class="checklist-number">${entry.cardNumber}</span>
                <span class="checklist-name">${entry.cardName}${variantHtml}</span>
                <input type="checkbox" class="checklist-checkbox">
            </div>`;
  }).join('\n');
})()}
        </div>
    </div>
</body>
</html>`;
fs.writeFileSync(path.join(wwwDir, 'checklist.html'), checklistHtml, 'utf-8');
console.log(`Successfully generated ${path.join(wwwDir, 'checklist.html')}`);
