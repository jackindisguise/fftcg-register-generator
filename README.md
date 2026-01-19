# TCG Player Set Compiler

A tool for compiling and generating HTML collections from TCG Player card data. Converts card CSV exports into collection checklists and value trackers.

![Hidden Legends - Opus XXIV](set/xxiv/assets/cover.png)

## Features

- CSV to JSON compilation - Process card data from TCG Player exports
- HTML generation - Create multiple views of your collection:
  - Full collection checklist with binder-style pages
  - Top 54 most valuable cards
  - Top cards by rarity
  - Full Art card collections
  - Compact checklist view
  - Card index
- Market price tracking - Uses lowest market price for valuations
- Variant support - Handles Normal, Foil, Full Art, Full Art Signature, Legacy, Reprint, and Promo cards
- Print-ready - Optimized for printing with proper page breaks
- Multiple set support - Build all sets at once or individually

## Quick Start

### Prerequisites

- Node.js (v14 or higher)

### Installation

1. Clone or download this repository
2. Navigate to the project directory

### Usage

#### Compile a Single Set

```bash
node compile.js <setName>
```

Example:
```bash
node compile.js xxiv
```

#### Generate HTML for a Set

```bash
node generate-html.js <setName>
```

Example:
```bash
node generate-html.js xxiv
```

#### Build All Sets

```bash
node build-all.js
```

This will automatically compile and generate HTML for all sets that have a `cards.csv` file.

## Project Structure

```
tcgplayer-set-compiler/
├── compile.js              # Compiles CSV to JSON
├── generate-html.js        # Generates HTML pages
├── build-all.js            # Builds all sets at once
├── variant-symbols.json    # Variant symbol configuration
├── assets/
│   └── style.css          # Shared styles
└── set/
    └── <setName>/
        ├── cards.csv       # Input: Card data from TCG Player
        ├── set.json        # Set metadata
        ├── output.json     # Compiled card data
        ├── assets/
        │   └── cover.png   # Set cover image
        └── www/            # Generated HTML files
            ├── cards.html
            ├── compiled.html
            ├── checklist.html
            ├── top54.html
            └── ...
```

## CSV Format

Your `cards.csv` file should have the following columns:

1. **Product Name** - Full card name (may include variant suffixes)
2. **Printing** - Normal or Foil
3. **Condition** - Card condition
4. **Rarity** - Card rarity
5. **Number** - Card number (e.g., "24-045C")
6. **Market Price** - Market price in $ format

Example:
```csv
Product Name,Printing,Condition,Rarity,Number,Market Price
"Lightning (Full Art)",Normal,Near Mint,Rare,"24-045R","$12.99"
```

## Generated Views

### Cards.html
The main collection view with all cards organized in binder-style pages (9 cards per page).

### Compiled.html
A comprehensive document combining:
- Cover page with set statistics
- Full collection checklist
- Top 54 most valuable cards
- Top cards by rarity
- Top Normal cards
- Top Foil cards
- All Full Art cards
- Card index

### Checklist.html
A compact checklist view for tracking your collection.

### Top54.html
The 54 most valuable cards in the set, sorted by market price.

### Full-Art.html
All Full Art, Full Art Signature, and Legacy cards sorted by value.

## Configuration

### Set Metadata (`set.json`)

```json
{
  "title": "Hidden Legends",
  "alternateTitle": "Opus XXIV",
  "setNumber": 24
}
```

### Variant Symbols (`variant-symbols.json`)

Customize the symbols used for different card variants:

```json
{
  "variants": {
    "Normal": "⚪",
    "Foil": "✨",
    "Full Art": "⭐",
    "Full Art Signature": "💎"
  },
  "special": {
    "Legacy": "👑",
    "Reprint": "♻️",
    "Promo": "🎁"
  }
}
```

## Features in Detail

### Market Price Calculation
The compiler uses the lowest market price from all available listings for each card variant, providing a conservative valuation of your collection.

### Card Variants
- **Normal** - Standard cards (no symbol displayed)
- **Foil** - Foil printing
- **Full Art** - Full art variant
- **Full Art Signature** - Signed full art cards
- **Legacy** - Legacy collection cards
- **Reprint** - Reprints from other sets
- **Promo** - Promotional cards

### Sorting & Organization
Cards are automatically sorted by:
1. Set number
2. Card number
3. Variant type (Normal → Foil → Full Art → Full Art Signature)

## License

This project is open source and available for personal use.

## Contributing

Feel free to submit issues or pull requests if you'd like to improve the compiler.
