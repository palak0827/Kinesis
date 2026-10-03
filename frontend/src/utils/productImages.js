/**
 * Kinesis Sports Club - Product Image System
 * 
 * Strict Image-to-Product Architecture:
 * - 7 uploaded Gear Shop products map strictly to their uploaded assets in frontend/src/assets/products/
 * - Clean filenames supported:
 *     bullpadel-hack-03.webp
 *     dunlop-pro-squash-balls.jpeg
 *     yonex-mavis-350.webp
 *     head-speed-mp-2024.webp
 *     kinesis-pro-club-polo.jpeg
 *     kinesis-microfibre-towel.webp
 *     wilson-pro-staff-97-v14.jpeg
 *   as well as their exact upload names.
 * - Strict 1:1 image mapping: No product image is ever reused across different products.
 * - Gear Shop products without an uploaded image use a clean generic SVG placeholder.
 * - Café & Bar items use their dedicated café imagery and never show Gear Shop assets.
 */

// Dynamically discover all local product assets bundled in frontend/src/assets/products/
const localProductImages = import.meta.glob(
  '../assets/products/*.{webp,jpeg,jpg,png}',
  { eager: true, import: 'default' }
);

function resolveLocalAsset(possibleFilenames) {
  for (const [assetPath, assetUrl] of Object.entries(localProductImages)) {
    const filename = assetPath.split('/').pop().toLowerCase();
    for (const target of possibleFilenames) {
      if (filename === target.toLowerCase()) {
        return assetUrl;
      }
    }
  }
  return null;
}

// Clean neutral fallback placeholder for Gear Shop products without a custom photo
export const GENERIC_GEAR_PLACEHOLDER_SVG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300" fill="%23f8fafc"><rect width="400" height="300" fill="%23f8fafc"/><circle cx="200" cy="130" r="45" fill="%23e2e8f0"/><path d="M185 130 L215 130 M200 115 L200 145" stroke="%2394a3b8" stroke-width="3" stroke-linecap="round"/><text x="50%" y="220" dominant-baseline="middle" text-anchor="middle" fill="%2364748b" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="600" letter-spacing="1">KINESIS GEAR SHOP</text></svg>';

// 1. STRICT GEAR SHOP IMAGE REGISTRY
// Maps exact product names strictly to their matching assets
export const GEAR_SHOP_IMAGE_MAP = {
  'bullpadel hack 03 padel racket': resolveLocalAsset([
    'bullpadel-hack-03.webp',
    'Bullpadel Hack 03 Padel Racket.webp'
  ]),
  'dunlop pro squash balls': resolveLocalAsset([
    'dunlop-pro-squash-balls.jpeg',
    'Dunlop Pro Squash Balls (3-Pack).jpg.jpeg',
    'dunlop-pro-squash-balls.jpg.jpeg',
    'dunlop-pro-squash-balls.jpg'
  ]),
  'dunlop pro squash balls (3-pack)': resolveLocalAsset([
    'dunlop-pro-squash-balls.jpeg',
    'Dunlop Pro Squash Balls (3-Pack).jpg.jpeg',
    'dunlop-pro-squash-balls.jpg.jpeg',
    'dunlop-pro-squash-balls.jpg'
  ]),
  'yonex mavis 350 shuttlecocks': resolveLocalAsset([
    'yonex-mavis-350.webp',
    'Yonex Mavis 350 Shuttlecocks (6-Tube) (1).webp',
    'Yonex Mavis 350 Shuttlecocks (6-Tube).webp'
  ]),
  'yonex mavis 350 shuttlecocks (6-tube)': resolveLocalAsset([
    'yonex-mavis-350.webp',
    'Yonex Mavis 350 Shuttlecocks (6-Tube) (1).webp',
    'Yonex Mavis 350 Shuttlecocks (6-Tube).webp'
  ]),
  'head speed mp 2024': resolveLocalAsset([
    'head-speed-mp-2024.webp',
    'Head Speed MP 2024.webp'
  ]),
  'kinesis pro club tech polo': resolveLocalAsset([
    'kinesis-pro-club-polo.jpeg',
    'Kinesis Pro Club Tech Polo.jpg.jpeg',
    'kinesis-pro-club-polo.jpg'
  ]),
  'kinesis microfibre quick-dry towel': resolveLocalAsset([
    'kinesis-microfibre-towel.webp',
    'Kinesis Microfibre Quick-Dry Towel.webp'
  ]),
  'wilson pro staff 97 v14': resolveLocalAsset([
    'wilson-pro-staff-97-v14.jpeg',
    'Wilson Pro Staff 97 v14.jpg.jpeg',
    'wilson-pro-staff-97-v14.jpg'
  ])
};

// 2. CAFÉ & BAR IMAGE REGISTRY (Kept completely independent of Gear Shop)
const CAFE_IMAGE_MAP = {
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
  'power berry': 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=600&q=80',
  'power berry smoothie': 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=600&q=80',
  'mango rush': 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?auto=format&fit=crop&w=600&q=80',
  'mango rush smoothie': 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?auto=format&fit=crop&w=600&q=80',
  'green fuel': 'https://images.unsplash.com/photo-1610970881699-44a5587cabec?auto=format&fit=crop&w=600&q=80',
  'green fuel detox': 'https://images.unsplash.com/photo-1610970881699-44a5587cabec?auto=format&fit=crop&w=600&q=80',
  'purewhey protein shake': 'https://images.unsplash.com/photo-1579722820308-d74e571900a9?auto=format&fit=crop&w=600&q=80',
  'protein shake': 'https://images.unsplash.com/photo-1579722820308-d74e571900a9?auto=format&fit=crop&w=600&q=80',
  'hydrofuel electrolyte performance 500ml': 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80',
  'purewhey high protein crisp bar': 'https://images.unsplash.com/photo-1622484212850-cab596d66e74?auto=format&fit=crop&w=600&q=80',
  'purewhey protein bar': 'https://images.unsplash.com/photo-1622484212850-cab596d66e74?auto=format&fit=crop&w=600&q=80',
  'virgin mojito': 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
  'blue lagoon': 'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=600&q=80',
  'berry fizz': 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
  'tropical punch': 'https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=600&q=80',
  'watermelon cooler': 'https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?auto=format&fit=crop&w=600&q=80',
  'mint smash': 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
  'citrus fizz': 'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=600&q=80',
  'berry spark': 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
  'club cooler': 'https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=600&q=80',
  'tropical lime': 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
  'french fries': 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&q=80',
  'veg sandwich': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80',
  'grilled sandwich': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80',
  'protein bar': 'https://images.unsplash.com/photo-1622484212850-cab596d66e74?auto=format&fit=crop&w=600&q=80',
  'nachos': 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&w=600&q=80',
  'veg panini': 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80',
  'chicken panini': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80',
  'paneer wrap': 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&q=80',
  'chicken wrap': 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&q=80',
  'pasta': 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=600&q=80',
  'healthy bowl': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
  'recovery bowl': 'https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=600&q=80',
  'club panini': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80',
  'club sourdough chicken panini': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80',
  'grilled wrap': 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&q=80',
  'grilled chicken wrap': 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&q=80',
  'veggie melt': 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80',
  'veggie melt panini': 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80',
  'protein bowl': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
  'protein harvest bowl': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
  'acai energy recovery bowl': 'https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=600&q=80',
  'almond energy bites': 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80',
  'energy bites': 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80',
  'fresh fruit cup': 'https://images.unsplash.com/photo-1519996529931-28324d5a630e?auto=format&fit=crop&w=600&q=80',
  'fruit cup': 'https://images.unsplash.com/photo-1519996529931-28324d5a630e?auto=format&fit=crop&w=600&q=80'
};

const CAFE_CATEGORY_FALLBACKS = {
  'café': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
  'cafe': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
  'drinks': 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80',
  'mocktails': 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
  'mocktail': 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
  'food': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80',
  'drinks & nutrition': 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=600&q=80',
  'snacks': 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80'
};

function isCafeProduct(product) {
  const cat = (product.category || '').toLowerCase();
  const name = (product.name || '').toLowerCase();
  return (
    cat.includes('drink') ||
    cat.includes('café') ||
    cat.includes('cafe') ||
    cat.includes('bar') ||
    cat.includes('food') ||
    cat.includes('nutrition') ||
    cat.includes('snack') ||
    name.includes('espresso') ||
    name.includes('americano') ||
    name.includes('latte') ||
    name.includes('brew') ||
    name.includes('smoothie') ||
    name.includes('rush') ||
    name.includes('shake') ||
    name.includes('fizz') ||
    name.includes('smash') ||
    name.includes('spark') ||
    name.includes('cooler') ||
    name.includes('panini') ||
    name.includes('wrap') ||
    name.includes('bowl') ||
    name.includes('bites')
  );
}

/**
 * Retrieve product image adhering strictly to FCFS / No-Guessing rules:
 * - Gear Shop products: ONLY returns their dedicated uploaded asset if present.
 * - If Gear Shop product has no uploaded asset, returns neutral placeholder.
 * - Café products: Returns dedicated café imagery. NEVER returns Gear Shop assets.
 */
export function getProductImage(product) {
  if (!product) return GENERIC_GEAR_PLACEHOLDER_SVG;

  // Explicit URL takes priority if present
  if (product.image_url) {
    return product.image_url;
  }

  const nameKey = (product.name || '').toLowerCase().trim();

  // A. CAFÉ & BAR ROUTE
  if (isCafeProduct(product)) {
    if (CAFE_IMAGE_MAP[nameKey]) {
      return CAFE_IMAGE_MAP[nameKey];
    }
    for (const [key, url] of Object.entries(CAFE_IMAGE_MAP)) {
      if (nameKey.includes(key) || key.includes(nameKey)) {
        return url;
      }
    }
    const catKey = (product.category || '').toLowerCase().trim();
    if (CAFE_CATEGORY_FALLBACKS[catKey]) {
      return CAFE_CATEGORY_FALLBACKS[catKey];
    }
    for (const [cat, url] of Object.entries(CAFE_CATEGORY_FALLBACKS)) {
      if (catKey.includes(cat)) {
        return url;
      }
    }
    return GENERIC_GEAR_PLACEHOLDER_SVG;
  }

  // B. GEAR SHOP ROUTE
  // Strict 1:1 image mapping. Only exact matching items get their dedicated photo.
  // Never guess, never reuse across products, never use category fallbacks for gear shop.
  if (GEAR_SHOP_IMAGE_MAP[nameKey]) {
    return GEAR_SHOP_IMAGE_MAP[nameKey];
  }

  // Fallback for gear products without uploaded asset (e.g. Babolat balls)
  return GENERIC_GEAR_PLACEHOLDER_SVG;
}
