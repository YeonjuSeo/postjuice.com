import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const templatePath = path.join(root, 'dist/client/index.html');

function readSlugsFromDisk() {
  const dir = path.join(root, 'content/posts');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .map((name) => name.replace(/\.md$/, ''));
}

function renderHeadFromHelmet(helmet) {
  if (!helmet) return '';
  const parts = [
    helmet.title?.toString?.() ?? '',
    helmet.meta?.toString?.() ?? '',
    helmet.link?.toString?.() ?? '',
    helmet.script?.toString?.() ?? '',
    helmet.style?.toString?.() ?? '',
    helmet.base?.toString?.() ?? '',
    helmet.noscript?.toString?.() ?? '',
    helmet.priority?.toString?.() ?? '',
  ];
  return parts.filter(Boolean).join('\n');
}

function injectHtml(template, headHtml, appHtml) {
  let out = template.replace('<!--app-head-->', headHtml);
  const marker = '<div id="root"></div>';
  if (!out.includes(marker)) {
    throw new Error(
      `Expected "${marker}" in dist/client/index.html after client build.`,
    );
  }
  return out.replace(marker, `<div id="root">${appHtml}</div>`);
}

async function main() {
  const template = fs.readFileSync(templatePath, 'utf8');

  const entryServerUrl = pathToFileURL(
    path.join(root, 'dist/server/entry-server.js'),
  ).href;

  const { render } = await import(entryServerUrl);

  const slugs = readSlugsFromDisk();
  const routes = ['/', ...slugs.map((slug) => `/post/${slug}`)];

  for (const route of routes) {
    const helmetContext = {};
    const appHtml = render(route, helmetContext);
    const headHtml = renderHeadFromHelmet(helmetContext.helmet);
    const html = injectHtml(template, headHtml, appHtml);

    if (route === '/') {
      fs.writeFileSync(path.join(root, 'dist/client/index.html'), html);
      continue;
    }

    const relativeDir = route.replace(/^\//, '');
    const outDir = path.join(root, 'dist/client', relativeDir);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'index.html'), html);
  }

  console.log(`Prerendered ${routes.length} routes.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
