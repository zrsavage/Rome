// Photographic terrain textures (grass, forest canopy), loaded by art.js from assets/art and read by the battlefield painter in render.js.
// Kept in their own module so the two do not import each other.
const TEX = {};
export const setTexture = (k, img) => { TEX[k] = img; };
export const terrainTexture = (k) => TEX[k] || null;
