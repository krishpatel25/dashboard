/*
  Sync Excel files from OneDrive to a local directory for the dashboard.

  Auth modes:
  - Device code (interactive, local dev): set ONEDRIVE_AUTH=device
  - Client credentials (daemon on Azure): set ONEDRIVE_AUTH=client and provide MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET

  Target selection:
  - If ONEDRIVE_DRIVE_ID is set, files are downloaded from /drives/{driveId}/root:/path:/content
  - Else, device mode falls back to /me/drive/root:/path:/content

  Config:
  - SOURCES_JSON: path to a JSON file listing files to sync (default: data/onedrive-sources.json)
    {
      "items": [
        { "path": "/MyData/MasterData.xlsx", "target": "MasterData.xlsx" },
        { "path": "/MyData/Transactions.xlsx", "target": "Transactions.xlsx" },
        { "path": "/MyData/PO_Combined.xlsx", "target": "PO_Combined.xlsx" }
      ],
      "intervalSeconds": 300
    }
  - EXCEL_DATA_DIR: local destination directory (defaults to data/connected-workbooks)

  Run once:  node scripts/sync-onedrive.js
  Watch loop: set intervalSeconds in JSON, or SYNC_INTERVAL_SECONDS env
*/

const fs = require('fs');
const path = require('path');
const { ConfidentialClientApplication, PublicClientApplication } = require('@azure/msal-node');

const EXCEL_DATA_DIR = process.env.EXCEL_DATA_DIR
  ? path.resolve(process.env.EXCEL_DATA_DIR)
  : path.resolve(__dirname, '..', 'data', 'connected-workbooks');
const SOURCES_JSON = process.env.SOURCES_JSON
  ? path.resolve(process.env.SOURCES_JSON)
  : path.resolve(__dirname, '..', 'data', 'onedrive-sources.json');
const AUTH_MODE = (process.env.ONEDRIVE_AUTH || 'device').toLowerCase();
const DRIVE_ID = process.env.ONEDRIVE_DRIVE_ID || '';
const TENANT = process.env.MS_TENANT_ID || 'common';
const CLIENT_ID = process.env.MS_CLIENT_ID || '';
const CLIENT_SECRET = process.env.MS_CLIENT_SECRET || '';
const SCOPE = 'https://graph.microsoft.com/.default';

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

function readConfig() {
  if (!fs.existsSync(SOURCES_JSON)) {
    // Create a starter file
    ensureDir(path.dirname(SOURCES_JSON));
    fs.writeFileSync(
      SOURCES_JSON,
      JSON.stringify({ items: [], intervalSeconds: 0 }, null, 2)
    );
    console.log('Created template', path.relative(process.cwd(), SOURCES_JSON));
  }
  return JSON.parse(fs.readFileSync(SOURCES_JSON, 'utf8'));
}

async function getToken() {
  if (AUTH_MODE === 'client') {
    if (!CLIENT_ID || !CLIENT_SECRET || !TENANT) {
      throw new Error('Client auth requires MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET');
    }
    const cca = new ConfidentialClientApplication({
      auth: { clientId: CLIENT_ID, authority: `https://login.microsoftonline.com/${TENANT}`, clientSecret: CLIENT_SECRET },
    });
    const result = await cca.acquireTokenByClientCredential({ scopes: [SCOPE] });
    return result?.accessToken;
  }
  // device code
  if (!CLIENT_ID) throw new Error('Device auth requires MS_CLIENT_ID');
  const pca = new PublicClientApplication({
    auth: { clientId: CLIENT_ID, authority: `https://login.microsoftonline.com/${TENANT}` },
  });
  const result = await pca.acquireTokenByDeviceCode({
    scopes: ['Files.Read', 'offline_access'],
    deviceCodeCallback: (info) => {
      console.log(info.message);
    },
  });
  return result?.accessToken;
}

async function downloadItem(token, item, destDir) {
  const base = DRIVE_ID
    ? `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(DRIVE_ID)}`
    : `https://graph.microsoft.com/v1.0/me/drive`;
  const url = `${base}/root:${encodeURI(item.path)}:/content`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Download failed ${res.status} ${res.statusText} for ${item.path}`);
  const buf = Buffer.from(await res.arrayBuffer());
  ensureDir(destDir);
  const target = path.join(destDir, item.target || path.basename(item.path));
  fs.writeFileSync(target, buf);
  console.log('Downloaded', item.path, '→', path.relative(process.cwd(), target));
}

async function runOnce() {
  const cfg = readConfig();
  const token = await getToken();
  for (const it of cfg.items || []) {
    await downloadItem(token, it, EXCEL_DATA_DIR);
  }
}

async function main() {
  const cfg = readConfig();
  const loopSecs = Number(process.env.SYNC_INTERVAL_SECONDS || cfg.intervalSeconds || 0);
  await runOnce();
  if (loopSecs > 0) {
    console.log('Entering sync loop, interval', loopSecs, 'seconds');
    setInterval(() => {
      runOnce().catch((e) => console.error('sync error:', e.message));
    }, loopSecs * 1000);
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

