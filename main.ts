import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from './parse.js';

// program/v1: one JSON array of { markdown } cases in, matching HTML strings out.
const inputDir = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const input = JSON.parse(readFileSync(join(inputDir, 'cases.json'), 'utf8'));
if (!Array.isArray(input)) throw new TypeError('cases.json must contain an array');
const html = input.map((item, index) => {
  if (!item || typeof item.markdown !== 'string') {
    throw new TypeError(`case ${index} must contain a markdown string`);
  }
  return parse(item.markdown);
});
mkdirSync(outputDir, { recursive: true });
writeFileSync(join(outputDir, 'html.json'), JSON.stringify(html));
