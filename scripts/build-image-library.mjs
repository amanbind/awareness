// Regenerate assets/image-library/library.js from the files listed in
// assets/image-library/manifest.json. Run after adding/removing library images
// so the portable (data-URI) bundle the editor loads stays in sync.
//
//   npm run build:image-library

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildLibraryJs, LIBRARY_DIRNAME, BUNDLE_NAME } from './lib/image_library.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const libDir = path.join(ROOT, LIBRARY_DIRNAME);

const { count, skipped } = await buildLibraryJs(libDir);
console.log(`[image-library] wrote ${path.join(LIBRARY_DIRNAME, BUNDLE_NAME)} with ${count} image(s).`);
if (skipped.length) console.warn(`[image-library] skipped (missing/unsafe): ${skipped.join(', ')}`);
