import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

const appPage = fs.readFileSync(path.join(root, 'app/page.tsx'), 'utf8');
const productPage = fs.readFileSync(path.join(root, 'app/products/[slug]/page.tsx'), 'utf8');

const badPattern = /\/api\/products\/media\//;

test('public product images use stored media URL directly instead of querying the media proxy route', () => {
  assert.equal(badPattern.test(appPage), false, 'Homepage should not generate /api/products/media/... image URLs');
  assert.equal(badPattern.test(productPage), false, 'Product page should not generate /api/products/media/... image URLs');
});
