import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const releasesPath = path.join(rootDir, 'releases.json');
const rel = JSON.parse(fs.readFileSync(releasesPath, 'utf8'));

const targetTag = (process.env.GITHUB_REF_NAME || process.argv[2] || '').replace(/^v/, '');
const data = (rel.latest && (!targetTag || rel.latest.version === targetTag))
  ? rel.latest
  : ((rel.history && rel.history.find(h => h.version === targetTag)) || rel.latest);

let md = `## ${data.title || 'Release ' + (targetTag || data.version)}\n\n`;
if (data.summary) {
  md += `${data.summary}\n\n`;
}

if (data.highlights && Array.isArray(data.highlights) && data.highlights.length > 0) {
  md += `### Highlights & Fixes\n`;
  for (const h of data.highlights) {
    const tagPrefix = h.tag ? `[${h.tag}] ` : '';
    md += `- **${tagPrefix}${h.title}**: ${h.description}\n`;
  }
  md += '\n';
}

md += `---\n*See the assets below to download and install for your platform.*`;

// If running in GitHub Actions, append to GITHUB_OUTPUT
if (process.env.GITHUB_OUTPUT) {
  const delimiter = `EOF_${Date.now()}`;
  fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    `body<<${delimiter}\n${md}\n${delimiter}\n`
  );
}

// Always print to stdout
console.log(md);
