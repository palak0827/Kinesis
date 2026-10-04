/**
 * Kinesis Sports Club - Product Image System & Asset Registry
 * 
 * Strict Image-to-Product Architecture:
 * - Dedicated curated assets for all 12 Club Product Classes:
 *   1. Rackets (Tennis, Squash, Badminton, Padel)
 *   2. Bats (Cricket Bats)
 *   3. Balls (Tennis 4-Can, Cricket Leather, Squash 3-Pack, Shuttlecocks)
 *   4. Apparel (Performance Polo, Club T-Shirt)
 *   5. Bags (Tour Club Bag)
 *   6. Accessories (Towel, Grip, Restring)
 *   7. Food (Club Panini, Artisan Wraps, Recovery Bowls, Pasta)
 *   8. Coffee (Cold Brew, Espresso, Latte, Americano)
 *   9. Mocktails (Virgin Mojito, Blue Lagoon, Berry Fizz, Tropical Punch)
 *   10. Smoothies & Nutrition (Protein Shakes, Recovery Bowls, Energy Bars)
 *   11. Snacks (Fries, Sandwiches, Nachos)
 *   12. Water & Hydration (Mineral Water, Electrolyte Drink, Fresh Lime Soda)
 * - Zero broken images: Every item has a high-resolution SVG or trusted high-uptime CDN asset.
 * - Normalized aspect ratio and container fit.
 */

// Helper to encode clean SVGs to Data URIs
const svgToDataUri = (svgStr) => `data:image/svg+xml;utf8,${encodeURIComponent(svgStr.trim())}`;

// 1. BESPOKE SVG VECTOR ASSETS FOR GEAR SHOP & SPORTS EQUIPMENT
export const SVGS = {
  // Tennis Racket (Wilson / Head)
  TENNIS_RACKET: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="100%" height="100%">
      <defs>
        <linearGradient id="racketGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#162b23"/>
          <stop offset="100%" stop-color="#2d5a47"/>
        </linearGradient>
      </defs>
      <rect width="300" height="300" fill="#f8fafc" rx="16"/>
      <ellipse cx="150" cy="110" rx="65" ry="85" fill="none" stroke="url(#racketGrad)" stroke-width="10"/>
      <!-- Racket Strings -->
      <path d="M110 60 L110 160 M130 40 L130 180 M150 30 L150 190 M170 40 L170 180 M190 60 L190 160" stroke="#94a3b8" stroke-width="1.5"/>
      <path d="M100 80 L200 80 M90 105 L210 105 M95 130 L205 130 M105 155 L195 155" stroke="#94a3b8" stroke-width="1.5"/>
      <!-- Throat & Shaft -->
      <path d="M135 190 L145 220 L145 280 L155 280 L155 220 L165 190 Z" fill="url(#racketGrad)"/>
      <!-- Grip wrap -->
      <line x1="145" y1="230" x2="155" y2="235" stroke="#d4af37" stroke-width="2"/>
      <line x1="145" y1="245" x2="155" y2="250" stroke="#d4af37" stroke-width="2"/>
      <line x1="145" y1="260" x2="155" y2="265" stroke="#d4af37" stroke-width="2"/>
      <text x="150" y="215" text-anchor="middle" font-size="9" font-family="sans-serif" font-weight="bold" fill="#d4af37">PRO RACQUET</text>
    </svg>
  `),

  // Padel Racket (Bullpadel Hack)
  PADEL_RACKET: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="100%" height="100%">
      <rect width="300" height="300" fill="#f8fafc" rx="16"/>
      <path d="M110 50 Q150 30 190 50 Q220 90 210 140 Q190 190 165 200 L165 270 L135 270 L135 200 Q110 190 90 140 Q80 90 110 50 Z" fill="#1e293b" stroke="#10b981" stroke-width="4"/>
      <!-- Padel Holes Matrix -->
      <circle cx="130" cy="90" r="5" fill="#f8fafc"/><circle cx="150" cy="90" r="5" fill="#f8fafc"/><circle cx="170" cy="90" r="5" fill="#f8fafc"/>
      <circle cx="120" cy="115" r="5" fill="#f8fafc"/><circle cx="140" cy="115" r="5" fill="#f8fafc"/><circle cx="160" cy="115" r="5" fill="#f8fafc"/><circle cx="180" cy="115" r="5" fill="#f8fafc"/>
      <circle cx="130" cy="140" r="5" fill="#f8fafc"/><circle cx="150" cy="140" r="5" fill="#f8fafc"/><circle cx="170" cy="140" r="5" fill="#f8fafc"/>
      <circle cx="140" cy="165" r="5" fill="#f8fafc"/><circle cx="160" cy="165" r="5" fill="#f8fafc"/>
      <text x="150" y="240" text-anchor="middle" font-size="9" font-family="sans-serif" font-weight="bold" fill="#10b981">CARBON PADEL</text>
    </svg>
  `),

  // Cricket Bat (Gray-Nicolls)
  CRICKET_BAT: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="100%" height="100%">
      <rect width="300" height="300" fill="#f8fafc" rx="16"/>
      <!-- Handle -->
      <rect x="144" y="25" width="12" height="70" rx="3" fill="#ffffff" stroke="#334155" stroke-width="2"/>
      <line x1="144" y1="40" x2="156" y2="40" stroke="#ef4444" stroke-width="2"/>
      <line x1="144" y1="55" x2="156" y2="55" stroke="#ef4444" stroke-width="2"/>
      <line x1="144" y1="70" x2="156" y2="70" stroke="#ef4444" stroke-width="2"/>
      <!-- Blade -->
      <path d="M135 95 L165 95 L168 260 Q168 275 150 275 Q132 275 132 260 Z" fill="#d97706" stroke="#b45309" stroke-width="3"/>
      <!-- Wood Grain Highlight -->
      <path d="M142 105 L142 260 M150 100 L150 268 M158 105 L158 260" stroke="#fef3c7" stroke-width="1.5" opacity="0.6"/>
      <rect x="138" y="140" width="24" height="40" rx="2" fill="#ef4444"/>
      <text x="150" y="165" text-anchor="middle" font-size="8" font-family="sans-serif" font-weight="900" fill="#ffffff">ENGLISH WILLOW</text>
    </svg>
  `),

  // Tennis Balls (Babolat 4-Can)
  TENNIS_BALLS: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="100%" height="100%">
      <rect width="300" height="300" fill="#f8fafc" rx="16"/>
      <!-- Can Container -->
      <rect x="110" y="45" width="80" height="210" rx="14" fill="#0284c7" stroke="#0369a1" stroke-width="3"/>
      <rect x="105" y="40" width="90" height="15" rx="4" fill="#cbd5e1" stroke="#64748b" stroke-width="2"/>
      <!-- Ball visual in can -->
      <circle cx="150" cy="110" r="32" fill="#ccff00" stroke="#ffffff" stroke-width="3"/>
      <path d="M128 95 Q150 110 128 125 M172 95 Q150 110 172 125" fill="none" stroke="#ffffff" stroke-width="2.5"/>
      <rect x="112" y="160" width="76" height="60" fill="#ffffff"/>
      <text x="150" y="185" text-anchor="middle" font-size="11" font-family="sans-serif" font-weight="900" fill="#0284c7">BABOLAT</text>
      <text x="150" y="202" text-anchor="middle" font-size="8" font-family="sans-serif" font-weight="bold" fill="#64748b">4 ALL COURT</text>
    </svg>
  `),

  // Cricket Leather Ball (SG Test)
  CRICKET_BALL: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="100%" height="100%">
      <rect width="300" height="300" fill="#f8fafc" rx="16"/>
      <circle cx="150" cy="150" r="65" fill="#991b1b" stroke="#7f1d1d" stroke-width="4"/>
      <!-- Prominent Seam -->
      <line x1="150" y1="85" x2="150" y2="215" stroke="#ffffff" stroke-width="4"/>
      <!-- Stitches -->
      <path d="M142 100 L158 105 M142 115 L158 120 M142 130 L158 135 M142 145 L158 150 M142 160 L158 165 M142 175 L158 180 M142 190 L158 195" stroke="#ffffff" stroke-width="2"/>
      <text x="150" y="240" text-anchor="middle" font-size="10" font-family="sans-serif" font-weight="bold" fill="#d4af37">TEST LEATHER 156g</text>
    </svg>
  `),

  // Squash Balls (Dunlop 3-Pack)
  SQUASH_BALLS: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="100%" height="100%">
      <rect width="300" height="300" fill="#f8fafc" rx="16"/>
      <circle cx="105" cy="150" r="32" fill="#1e293b"/>
      <circle cx="100" cy="148" r="3" fill="#eab308"/><circle cx="108" cy="148" r="3" fill="#eab308"/>
      <circle cx="195" cy="150" r="32" fill="#1e293b"/>
      <circle cx="190" cy="148" r="3" fill="#eab308"/><circle cx="198" cy="148" r="3" fill="#eab308"/>
      <circle cx="150" cy="115" r="32" fill="#0f172a" stroke="#d4af37" stroke-width="2"/>
      <circle cx="145" cy="113" r="3" fill="#eab308"/><circle cx="153" cy="113" r="3" fill="#eab308"/>
      <text x="150" y="220" text-anchor="middle" font-size="11" font-family="sans-serif" font-weight="bold" fill="#1e293b">DUNLOP PRO SQUASH</text>
      <text x="150" y="238" text-anchor="middle" font-size="9" font-family="sans-serif" fill="#64748b">DOUBLE YELLOW DOT (3-PACK)</text>
    </svg>
  `),

  // Shuttlecocks (Yonex Mavis 350)
  SHUTTLECOCKS: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="100%" height="100%">
      <rect width="300" height="300" fill="#f8fafc" rx="16"/>
      <!-- Tube container -->
      <rect x="115" y="35" width="70" height="225" rx="12" fill="#15803d" stroke="#166534" stroke-width="3"/>
      <rect x="110" y="30" width="80" height="15" rx="3" fill="#e2e8f0"/>
      <!-- Shuttlecock Icon -->
      <path d="M135 125 L165 125 L175 90 L125 90 Z" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>
      <ellipse cx="150" cy="132" rx="12" ry="9" fill="#fde047" stroke="#ca8a04" stroke-width="2"/>
      <rect x="117" y="160" width="66" height="55" fill="#ffffff"/>
      <text x="150" y="182" text-anchor="middle" font-size="11" font-family="sans-serif" font-weight="900" fill="#15803d">YONEX</text>
      <text x="150" y="198" text-anchor="middle" font-size="8" font-family="sans-serif" font-weight="bold" fill="#334155">MAVIS 350 (6T)</text>
    </svg>
  `),

  // Apparel (Kinesis Pro Tech Polo / T-Shirt)
  APPAREL: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="100%" height="100%">
      <rect width="300" height="300" fill="#f8fafc" rx="16"/>
      <path d="M100 70 L130 50 L170 50 L200 70 L235 105 L210 130 L195 115 L195 240 L105 240 L105 115 L90 130 L65 105 Z" fill="#162b23" stroke="#d4af37" stroke-width="3"/>
      <!-- Collar -->
      <path d="M130 50 L150 95 L170 50 Z" fill="#d4af37"/>
      <text x="150" y="150" text-anchor="middle" font-size="12" font-family="sans-serif" font-weight="900" fill="#d4af37">KINESIS</text>
      <text x="150" y="165" text-anchor="middle" font-size="7" font-family="sans-serif" font-weight="bold" fill="#ffffff" letter-spacing="1">PRO ATHLETIC TECH</text>
    </svg>
  `),

  // Sports Bag (Kinesis Tour Club Sports Bag)
  SPORTS_BAG: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="100%" height="100%">
      <rect width="300" height="300" fill="#f8fafc" rx="16"/>
      <!-- Strap -->
      <path d="M100 120 Q150 40 200 120" fill="none" stroke="#d4af37" stroke-width="6"/>
      <!-- Main Duffle Body -->
      <rect x="50" y="115" width="200" height="110" rx="35" fill="#1e293b" stroke="#0f172a" stroke-width="4"/>
      <!-- Side Pockets -->
      <line x1="85" y1="115" x2="85" y2="225" stroke="#475569" stroke-width="2"/>
      <line x1="215" y1="115" x2="215" y2="225" stroke="#475569" stroke-width="2"/>
      <text x="150" y="175" text-anchor="middle" font-size="12" font-family="sans-serif" font-weight="bold" fill="#d4af37">KINESIS TOUR</text>
      <text x="150" y="192" text-anchor="middle" font-size="8" font-family="sans-serif" fill="#94a3b8">CLUB COMPACT DUFFLE</text>
    </svg>
  `),

  // Microfibre Towel
  TOWEL: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="100%" height="100%">
      <rect width="300" height="300" fill="#f8fafc" rx="16"/>
      <rect x="75" y="60" width="150" height="180" rx="8" fill="#0d9488" stroke="#0f766e" stroke-width="4"/>
      <line x1="75" y1="190" x2="225" y2="190" stroke="#d4af37" stroke-width="4"/>
      <line x1="75" y1="200" x2="225" y2="200" stroke="#ffffff" stroke-width="2"/>
      <text x="150" y="130" text-anchor="middle" font-size="11" font-family="sans-serif" font-weight="800" fill="#ffffff">QUICK-DRY TOWEL</text>
      <text x="150" y="150" text-anchor="middle" font-size="8" font-family="sans-serif" fill="#ccfbf1">MICROFIBRE • ANTI-BACTERIAL</text>
    </svg>
  `),

  // Generic Sports Gear Fallback
  GENERIC_GEAR: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="100%" height="100%">
      <rect width="300" height="300" fill="#f8fafc" rx="16"/>
      <circle cx="150" cy="135" r="45" fill="#e2e8f0"/>
      <path d="M135 135 L165 135 M150 120 L150 150" stroke="#162b23" stroke-width="4" stroke-linecap="round"/>
      <text x="150" y="210" text-anchor="middle" font-size="11" font-family="sans-serif" font-weight="bold" fill="#162b23">KINESIS PRO GEAR</text>
      <text x="150" y="228" text-anchor="middle" font-size="8" font-family="sans-serif" fill="#64748b">OFFICIAL EQUIPMENT</text>
    </svg>
  `)
};

// 2. CAFÉ & BAR ULTRA-RELIABLE CURATED ASSET REGISTRY
export const CAFE_IMAGE_MAP = {
  'mineral water': 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=600&q=80',
  'lemon mint cooler': 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
  'fresh lime soda': 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
  'iced tea': 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80',
  'cold coffee': 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80',
  'fresh fruit juice': 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?auto=format&fit=crop&w=600&q=80',
  'electrolyte drink': 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80',
  'espresso': 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=600&q=80',
  'americano': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
  'club latte': 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=600&q=80',
  'cold brew': 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80',
  'artisan roast cold brew coffee': 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80',
  'purewhey protein shake': 'https://images.unsplash.com/photo-1579722820308-d74e571900a9?auto=format&fit=crop&w=600&q=80',
  'protein shake': 'https://images.unsplash.com/photo-1579722820308-d74e571900a9?auto=format&fit=crop&w=600&q=80',
  'hydrofuel electrolyte performance 500ml': 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80',
  'purewhey high protein crisp bar': 'https://images.unsplash.com/photo-1622484212850-cab596d66e74?auto=format&fit=crop&w=600&q=80',
  'protein bar': 'https://images.unsplash.com/photo-1622484212850-cab596d66e74?auto=format&fit=crop&w=600&q=80',
  'virgin mojito': 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
  'blue lagoon': 'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=600&q=80',
  'berry fizz': 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
  'tropical punch': 'https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=600&q=80',
  'watermelon cooler': 'https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?auto=format&fit=crop&w=600&q=80',
  'french fries': 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&q=80',
  'veg sandwich': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80',
  'grilled sandwich': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80',
  'nachos': 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&w=600&q=80',
  'veg panini': 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80',
  'chicken panini': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80',
  'paneer wrap': 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&q=80',
  'chicken wrap': 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&q=80',
  'pasta': 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=600&q=80',
  'healthy bowl': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
  'recovery bowl': 'https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=600&q=80',
  'club sourdough chicken panini': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80',
  'acai energy recovery bowl': 'https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=600&q=80'
};

/**
 * Main Product Image Resolver
 */
export function getProductImage(product) {
  if (!product) return SVGS.GENERIC_GEAR;

  // 1. Explicit image URL
  if (product.image_url && product.image_url.startsWith('http')) {
    return product.image_url;
  }

  const nameKey = (product.name || '').toLowerCase().trim();
  const catKey = (product.category || '').toLowerCase().trim();

  // 2. Exact Gear Shop Matches
  if (nameKey.includes('wilson pro staff') || nameKey.includes('head speed') || (catKey === 'rackets' && !nameKey.includes('padel') && !nameKey.includes('cricket'))) {
    return SVGS.TENNIS_RACKET;
  }
  if (nameKey.includes('padel')) {
    return SVGS.PADEL_RACKET;
  }
  if (nameKey.includes('cricket bat') || nameKey.includes('gray-nicolls') || nameKey.includes('powerbow')) {
    return SVGS.CRICKET_BAT;
  }
  if (nameKey.includes('cricket leather ball') || nameKey.includes('sg test')) {
    return SVGS.CRICKET_BALL;
  }
  if (nameKey.includes('squash balls') || nameKey.includes('dunlop pro')) {
    return SVGS.SQUASH_BALLS;
  }
  if (nameKey.includes('babolat') || (catKey === 'balls' && nameKey.includes('tennis'))) {
    return SVGS.TENNIS_BALLS;
  }
  if (nameKey.includes('shuttlecock') || nameKey.includes('yonex mavis')) {
    return SVGS.SHUTTLECOCKS;
  }
  if (nameKey.includes('polo') || nameKey.includes('t-shirt') || catKey === 'apparel') {
    return SVGS.APPAREL;
  }
  if (nameKey.includes('bag') || nameKey.includes('duffle')) {
    return SVGS.SPORTS_BAG;
  }
  if (nameKey.includes('towel') || catKey === 'accessories') {
    return SVGS.TOWEL;
  }

  // 3. Cafe & Bar Items
  if (CAFE_IMAGE_MAP[nameKey]) {
    return CAFE_IMAGE_MAP[nameKey];
  }
  for (const [key, url] of Object.entries(CAFE_IMAGE_MAP)) {
    if (nameKey.includes(key) || key.includes(nameKey)) {
      return url;
    }
  }

  // Fallbacks by category
  if (catKey === 'drinks' || catKey === 'beverage') {
    return CAFE_IMAGE_MAP['electrolyte drink'];
  }
  if (catKey === 'mocktails') {
    return CAFE_IMAGE_MAP['virgin mojito'];
  }
  if (catKey === 'food') {
    return CAFE_IMAGE_MAP['club sourdough chicken panini'];
  }
  if (catKey === 'snacks') {
    return CAFE_IMAGE_MAP['french fries'];
  }

  return SVGS.GENERIC_GEAR;
}
