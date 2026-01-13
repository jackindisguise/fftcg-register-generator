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
                       fs.existsSync(coverJpgPath) ? '../assets/cover.jpg' : null;

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
      
      return `                <div class="card-entry">
                    <div class="card-header">
                        <span class="card-id">#${entry.id}</span>
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
      
      return `                <div class="card-entry">
                    <div class="card-header">
                        <span class="card-id">#${entry.id}</span>
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
const top30Entries = [...entries].sort((a, b) => b.averagePrice - a.averagePrice).slice(0, 30);
const rarities = [...new Set(entries.map(e => e.rarity))].sort();
const normalEntries = entries.filter(e => e.variantType === 'Normal');
const top30Normal = [...normalEntries].sort((a, b) => b.averagePrice - a.averagePrice).slice(0, 30);
const foilEntries = entries.filter(e => e.variantType === 'Foil');
const topFoil = [...foilEntries].sort((a, b) => b.averagePrice - a.averagePrice).slice(0, 30);
const fullArtEntries = entries.filter(e => e.variantType === 'Full Art');
const fullArtCards = [...fullArtEntries].sort((a, b) => b.averagePrice - a.averagePrice);

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
        <div class="cards-page">
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
        <div class="cards-page">
            <header>
                <div class="header-left">
                    <h1>${setTitle}</h1>
                    <p>Top 30 Most Valuable Cards</p>
                </div>
            </header>
            <div class="cards-grid">
${generateCardGridHtml(top30Entries)}
            </div>
        </div>
${(() => {
  let html = '';
  rarities.forEach(rarity => {
    const rarityEntries = entries.filter(e => e.rarity === rarity);
    const top30 = [...rarityEntries].sort((a, b) => b.averagePrice - a.averagePrice).slice(0, 30);
    if (top30.length > 0) {
      html += `        <div class="cards-page">
            <header>
                <div class="header-left">
                    <h1>${setTitle}</h1>
                    <p>Top 30 Most Valuable ${rarity} Cards</p>
                </div>
            </header>
            <div class="cards-grid">
${generateCardGridHtml(top30)}
            </div>
        </div>
`;
    }
  });
  return html;
})()}
        <div class="cards-page">
            <header>
                <div class="header-left">
                    <h1>${setTitle}</h1>
                    <p>Top 30 Most Valuable Normal Cards</p>
                </div>
            </header>
            <div class="cards-grid">
${generateCardGridHtml(top30Normal)}
            </div>
        </div>
        <div class="cards-page">
            <header>
                <div class="header-left">
                    <h1>${setTitle}</h1>
                    <p>Top 30 Most Valuable Foil Cards (Non-Full Art)</p>
                </div>
            </header>
            <div class="cards-grid">
${generateCardGridHtml(topFoil)}
            </div>
        </div>
        <div class="cards-page">
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
    </div>
</body>
</html>`;

fs.writeFileSync(compiledHtmlPath, compiledHtml, 'utf-8');
console.log(`Successfully generated ${compiledHtmlPath}`);

// Generate Top 30 Most Valuable Cards
const top30Html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${setTitle} - Top 30 Most Valuable</title>
    <link rel="stylesheet" href="../../../assets/style.css">
</head>
<body>
    <div class="container">
        <header>
            <div class="header-left">
                <h1>${setTitle}</h1>
                <p>Top 50 Most Valuable Cards</p>
            </div>
        </header>
        <div class="cards-grid">
${generateCardGridHtml(top30Entries)}
        </div>
    </div>
</body>
</html>`;
fs.writeFileSync(path.join(wwwDir, 'top30.html'), top30Html, 'utf-8');
console.log(`Successfully generated ${path.join(wwwDir, 'top30.html')}`);

// Generate Top 30 per Rarity (using data already prepared above)
let top30PerRarityHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${setTitle} - Top 30 Per Rarity</title>
    <link rel="stylesheet" href="../../../assets/style.css">
</head>
<body>
    <div class="container">
        <header>
            <div class="header-left">
                <h1>${setTitle}</h1>
                <p>Top 10 Most Valuable Cards Per Rarity</p>
            </div>
        </header>
        <div class="cards-grid">
`;

rarities.forEach(rarity => {
  const rarityEntries = entries.filter(e => e.rarity === rarity);
  const top30 = [...rarityEntries].sort((a, b) => b.averagePrice - a.averagePrice).slice(0, 30);
  if (top30.length > 0) {
    top30PerRarityHtml += `            <h2 style="grid-column: 1 / -1; margin: 30px 0 20px 0; padding-bottom: 10px; border-bottom: 2px solid #e9ecef; font-size: 1.5em; color: #667eea;">${rarity}</h2>\n`;
    top30PerRarityHtml += generateCardGridHtml(top30);
  }
});

top30PerRarityHtml += `        </div>
    </div>
</body>
</html>`;
fs.writeFileSync(path.join(wwwDir, 'top30-per-rarity.html'), top30PerRarityHtml, 'utf-8');
console.log(`Successfully generated ${path.join(wwwDir, 'top30-per-rarity.html')}`);

// Generate Top 30 NORMAL Cards (using data already prepared above)
const top30NormalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${setTitle} - Top 30 Normal Cards</title>
    <link rel="stylesheet" href="../../../assets/style.css">
</head>
<body>
    <div class="container">
        <header>
            <div class="header-left">
                <h1>${setTitle}</h1>
                <p>Top 50 Most Valuable Normal Cards</p>
            </div>
        </header>
        <div class="cards-grid">
${generateCardGridHtml(top30Normal)}
        </div>
    </div>
</body>
</html>`;
fs.writeFileSync(path.join(wwwDir, 'top30-normal.html'), top30NormalHtml, 'utf-8');
console.log(`Successfully generated ${path.join(wwwDir, 'top30-normal.html')}`);

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
