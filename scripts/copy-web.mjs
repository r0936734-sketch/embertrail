import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'www');
const entries = [
  'index.html', 'css', 'js', 'voices', 'favicon.svg', 'favicon.ico',
  'arrow.mp3', 'bgm.mp3', 'horse.mp3', 'rear.mp3', 'ticwin.mp3',
  'download.jpg', 'ganeshji.jpg', 'hanumanji.jpg', 'me.jpg', 'prashanndasji.jpg'
];

// OneDrive can expose this output directory as a managed reparse point.  It
// cannot be removed while Explorer or a preview has touched it, so mirror the
// known web inputs in place rather than deleting the output root first.
mkdirSync(output, { recursive: true });
for (const entry of entries) {
  const source = resolve(root, entry);
  if (existsSync(source)) cpSync(source, resolve(output, entry), { recursive: true, force: true });
}
