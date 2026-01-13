import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get set name from command line arguments
const setName = process.argv[2];

if (!setName) {
  console.error('Usage: node compile.js <setName>');
  console.error('Example: node compile.js xxvi');
  process.exit(1);
}

// Set up paths
const setDir = path.join(__dirname, 'set', setName);
const cardsCsvPath = path.join(setDir, 'cards.csv');
const setJsonPath = path.join(setDir, 'set.json');

// Check if set directory and CSV file exist
if (!fs.existsSync(setDir)) {
  console.error(`Error: Set directory "${setDir}" does not exist`);
  process.exit(1);
}

if (!fs.existsSync(cardsCsvPath)) {
  console.error(`Error: Cards CSV file "${cardsCsvPath}" does not exist`);
  process.exit(1);
}

// Read existing set metadata (if it exists)
// Only preserve metadata fields, not cards
let setMetadata = {};
if (fs.existsSync(setJsonPath)) {
  try {
    const existingContent = fs.readFileSync(setJsonPath, 'utf-8').trim();
    if (existingContent) {
      const parsed = JSON.parse(existingContent);
      // Extract only metadata fields (exclude 'cards')
      const { cards, ...metadata } = parsed;
      setMetadata = metadata;
    }
  } catch (error) {
    console.warn(`Warning: Could not parse existing set.json: ${error.message}`);
  }
}

// Get current set number from metadata
const currentSetNumber = setMetadata.setNumber;

// Read the CSV file
const csvContent = fs.readFileSync(cardsCsvPath, 'utf-8');
const lines = csvContent.trim().split('\n');

// Parse CSV header
const headers = lines[0].split(',').map(h => h.trim());
const dataLines = lines.slice(1);

// Map to store cards by base name and number
const cardsMap = new Map();

// Helper function to expand rarity code to full name
function expandRarity(rarityCode) {
  const rarityMap = {
    'C': 'Common',
    'H': 'Hero',
    'L': 'Legend',
    'R': 'Rare'
  };
  return rarityMap[rarityCode] || rarityCode;
}

// Helper function to get base product name (remove Full Art suffixes)
function getBaseProductName(productName) {
  return productName
    .replace(/\s*\(Full Art Signature\)\s*$/, '')
    .replace(/\s*\(Full Art Reprint\)\s*$/, '')
    .replace(/\s*\(Full Art\)\s*$/, '')
    .trim();
}

// Helper function to determine variation type
function getVariationType(productName, printing) {
  if (productName.includes('Full Art Signature')) {
    return 'Full Art Signature';
  }
  if (productName.includes('Full Art')) {
    return 'Full Art';
  }
  return printing; // Normal or Foil
}

// Helper function to parse price string ($1.99 -> 1.99)
function parsePrice(priceStr) {
  return parseFloat(priceStr.replace('$', '').trim());
}

// Helper function to parse a single card number (e.g., "26-045C" or "15-095C")
function parseSingleNumber(numberStr) {
  const match = numberStr.match(/^(\d+)-(\d+)([A-Z]+)$/);
  if (match) {
    return {
      set: parseInt(match[1], 10),
      number: parseInt(match[2], 10),
      rarity: match[3],
      localID: numberStr
    };
  }
  return null;
}

// Helper function to extract set and card number from Number field
// Returns: { set, number, localID, originalSetData (if reprint), isPromo }
function parseNumber(numberStr, productName, rarity) {
  let result = {
    set: null,
    number: null,
    localID: numberStr,
    isPromo: false,
    originalSetData: null
  };

  // Check for promo prefix (PR-XXX/...)
  if (numberStr.startsWith('PR-')) {
    result.isPromo = true;
    // Extract the base card number after the PR- part
    const slashIndex = numberStr.indexOf('/');
    if (slashIndex !== -1) {
      const baseNumber = numberStr.substring(slashIndex + 1);
      const parsed = parseSingleNumber(baseNumber);
      if (parsed) {
        result.set = parsed.set;
        result.number = parsed.number;
        result.localID = numberStr;
      }
    }
  }
  // Check for reprint format (26-093C/15-095C)
  else if (numberStr.includes('/')) {
    const parts = numberStr.split('/');
    if (parts.length === 2) {
      const currentPart = parseSingleNumber(parts[0]);
      const originalPart = parseSingleNumber(parts[1]);
      
      if (currentPart && originalPart) {
        result.set = currentPart.set;
        result.number = currentPart.number;
        result.localID = numberStr;
        result.originalSetData = {
          rarity: expandRarity(originalPart.rarity),
          set: originalPart.set,
          number: originalPart.number,
          localID: originalPart.localID
        };
      }
    }
  }
  // Standard format (26-045C)
  else {
    const parsed = parseSingleNumber(numberStr);
    if (parsed) {
      result.set = parsed.set;
      result.number = parsed.number;
      result.localID = numberStr;
    }
  }

  // Check for Promo rarity
  if (rarity === 'Promo') {
    result.isPromo = true;
  }

  return result;
}

// Helper function to detect if a card is a Legacy card
function isLegacyCard(numberInfo, productName, currentSetNumber) {
  if (!currentSetNumber) return false;
  
  // Cards labeled (Full Art Reprint) are always legacy
  if (productName.includes('(Full Art Reprint)')) {
    return true;
  }
  
  // Legacy cards have a set number that doesn't match the current set
  const setMismatch = numberInfo.set !== currentSetNumber;
  
  // And they have a Full Art suffix
  const hasFullArtSuffix = productName.includes('(Full Art)');
  
  return setMismatch && hasFullArtSuffix;
}

// Process each line
dataLines.forEach(line => {
  // Handle quoted fields that may contain commas
  const fields = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(currentField.trim());
      currentField = '';
    } else {
      currentField += char;
    }
  }
  fields.push(currentField.trim()); // Add last field
  
  if (fields.length < 6) return; // Skip malformed lines
  
  const productName = fields[0];
  const printing = fields[1];
  const condition = fields[2];
  const rarity = fields[3];
  const number = fields[4];
  const marketPrice = fields[5];
  
  const baseName = getBaseProductName(productName);
  const variationType = getVariationType(productName, printing);
  const price = parsePrice(marketPrice);
  const numberInfo = parseNumber(number, productName, rarity);
  
  if (!numberInfo.set || numberInfo.number === null) return; // Skip if we can't parse the number
  
  // Determine card type flags
  const isReprint = numberInfo.originalSetData !== null;
  const isLegacy = isLegacyCard(numberInfo, productName, currentSetNumber);
  
  // Create key for grouping (base name + localID)
  const key = `${baseName}|${numberInfo.localID}`;
  
  if (!cardsMap.has(key)) {
    cardsMap.set(key, {
      product_name: baseName,
      rarity: rarity,
      set: numberInfo.set,
      number: numberInfo.number,
      localID: numberInfo.localID,
      isReprint: isReprint,
      isLegacy: isLegacy,
      isPromo: numberInfo.isPromo,
      originalSetData: numberInfo.originalSetData,
      variations: {}
    });
  }
  
  const card = cardsMap.get(key);
  
  // Initialize variation if it doesn't exist
  if (!card.variations[variationType]) {
    card.variations[variationType] = {
      type: variationType,
      prices: []
    };
  }
  
  // Add price to the variation
  card.variations[variationType].prices.push(price);
});

// Convert to final format with price ranges
const cards = Array.from(cardsMap.values()).map(card => {
  const variations = Object.values(card.variations).map(variation => {
    const prices = variation.prices;
    const marketPriceLow = Math.min(...prices);
    const marketPriceHigh = Math.max(...prices);
    const marketPriceAvg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    
    return {
      type: variation.type,
      marketPriceLow: Math.round(marketPriceLow * 100) / 100,
      marketPriceHigh: Math.round(marketPriceHigh * 100) / 100,
      marketPriceAvg: Math.round(marketPriceAvg * 100) / 100
    };
  });
  
  // Sort variations by type order: Normal, Foil, Full Art, Full Art Signature
  const typeOrder = { 'Normal': 0, 'Foil': 1, 'Full Art': 2, 'Full Art Signature': 3 };
  variations.sort((a, b) => {
    const orderA = typeOrder[a.type] !== undefined ? typeOrder[a.type] : 999;
    const orderB = typeOrder[b.type] !== undefined ? typeOrder[b.type] : 999;
    return orderA - orderB;
  });
  
  // Build card output with variation last
  const cardOutput = {
    product_name: card.product_name,
    rarity: card.rarity,
    set: card.set,
    number: card.number,
    localID: card.localID
  };
  
  // Add flags and data conditionally
  if (card.isReprint) {
    cardOutput.isReprint = true;
    cardOutput.originalSetData = card.originalSetData;
  }
  
  if (card.isLegacy) {
    cardOutput.isLegacy = true;
    // For legacy cards, the originalSetData is the card's own set data
    if (!cardOutput.originalSetData) {
      cardOutput.originalSetData = {
        rarity: card.rarity,
        set: card.set,
        number: card.number,
        localID: card.localID
      };
    }
  }
  
  if (card.isPromo) {
    cardOutput.isPromo = true;
  }
  
  // Add variation last for readability
  cardOutput.variation = variations;
  
  return cardOutput;
});

// Sort cards by set number, then by card number
cards.sort((a, b) => {
  if (a.set !== b.set) return a.set - b.set;
  return a.number - b.number;
});

// Write output.json with cards data
const outputJsonPath = path.join(setDir, 'output.json');
const outputData = { cards };
const outputJson = JSON.stringify(outputData, null, 3);
fs.writeFileSync(outputJsonPath, outputJson, 'utf-8');

// Preserve set metadata in set.json (without cards)
const setJson = JSON.stringify(setMetadata, null, 3);
fs.writeFileSync(setJsonPath, setJson, 'utf-8');

console.log(`Successfully compiled ${cards.length} cards to ${outputJsonPath}`);
