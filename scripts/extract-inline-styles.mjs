import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const htmlPath = path.join(rootDir, 'index.html');
const cssPath = path.join(rootDir, 'css', 'style.css');

const html = fs.readFileSync(htmlPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const eol = html.includes('\r\n') ? '\r\n' : '\n';

const slugify = (value) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const roleByTag = {
  a: 'link',
  div: 'group',
  footer: 'footer',
  h1: 'title',
  h2: 'title',
  h3: 'title',
  header: 'header',
  img: 'image',
  li: 'item',
  nav: 'nav',
  p: 'text',
  section: 'section',
  span: 'accent',
  ul: 'list',
};

const normalizeStyle = (style) => style
  .trim()
  .replace(/\s*;\s*/g, ';')
  .replace(/;$/, '');

const sectionStarts = [...html.matchAll(/<(nav|header|section|footer)\b[^>]*>/gi)].map((match) => {
  const tag = match[1].toLowerCase();
  const label = match[0].match(/data-screen-label=(['"])(.*?)\1/i)?.[2];
  const id = match[0].match(/id=(['"])(.*?)\1/i)?.[2];
  return {
    index: match.index,
    context: slugify(label || id || tag || 'page'),
  };
});

const contextAt = (index) => {
  let context = 'page';
  for (const section of sectionStarts) {
    if (section.index > index) break;
    context = section.context;
  }
  return context;
};

const tagPattern = /<([a-z][\w:-]*)\b[^<>]*?\sstyle=(['"])(.*?)\2[^<>]*?>/gis;
const occurrences = [...html.matchAll(tagPattern)].map((match) => ({
  index: match.index,
  tag: match[1].toLowerCase(),
  style: normalizeStyle(match[3]),
  context: contextAt(match.index),
}));

if (!occurrences.length) {
  console.log('No inline styles found.');
  process.exit(0);
}

const styleUsage = new Map();
for (const occurrence of occurrences) {
  const usage = styleUsage.get(occurrence.style) || {
    first: occurrence,
    contexts: new Set(),
  };
  usage.contexts.add(occurrence.context);
  styleUsage.set(occurrence.style, usage);
}

const counters = new Map();
const styleToClass = new Map();
for (const [style, usage] of styleUsage) {
  const shared = usage.contexts.size > 1;
  const context = shared ? 'shared' : usage.first.context;
  const role = roleByTag[usage.first.tag] || 'element';
  const counterKey = `${context}-${role}`;
  const count = (counters.get(counterKey) || 0) + 1;
  counters.set(counterKey, count);
  styleToClass.set(style, `${context}-${role}-${String(count).padStart(2, '0')}`);
}

const migratedHtml = html.replace(/<([a-z][\w:-]*)\b[^<>]*?\sstyle=(['"])(.*?)\2[^<>]*?>/gis, (tag) => {
  const styleMatch = tag.match(/\sstyle=(['"])(.*?)\1/is);
  if (!styleMatch) return tag;

  const className = styleToClass.get(normalizeStyle(styleMatch[2]));
  let migratedTag = tag.replace(styleMatch[0], '');
  const classMatch = migratedTag.match(/\sclass=(['"])(.*?)\1/is);

  if (classMatch) {
    const updatedClass = `${classMatch[2]} ${className}`.trim();
    migratedTag = migratedTag.replace(classMatch[0], ` class=${classMatch[1]}${updatedClass}${classMatch[1]}`);
  } else {
    migratedTag = migratedTag.replace(/^<([a-z][\w:-]*)/i, `<$1 class="${className}"`);
  }

  return migratedTag;
});

const startMarker = '/* === Extracted inline styles: start === */';
const endMarker = '/* === Extracted inline styles: end === */';
const oldBlockPattern = new RegExp(`${startMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${endMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'g');
const cleanCss = css.replace(oldBlockPattern, '').trimEnd();

const rules = [...styleUsage.entries()].map(([style]) => {
  const className = styleToClass.get(style);
  const declarations = style.split(';').filter(Boolean).map((declaration) => `  ${declaration.trim()};`).join(eol);
  return `:not(#inline-style-scope-a):not(#inline-style-scope-b) .${className} {${eol}${declarations}${eol}}`;
});

const extractedBlock = [
  startMarker,
  '/* Generated from index.html. The two impossible :not() IDs reproduce inline-style priority',
  '   over normal author rules while still allowing existing !important overrides to win. */',
  ...rules,
  endMarker,
].join(`${eol}${eol}`);

fs.writeFileSync(htmlPath, migratedHtml, 'utf8');
fs.writeFileSync(cssPath, `${cleanCss}${eol}${eol}${extractedBlock}${eol}`, 'utf8');

console.log(`Migrated ${occurrences.length} inline style attributes into ${styleUsage.size} CSS classes.`);
