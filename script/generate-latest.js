// scripts/generate-latest.js
// Usage: node scripts/generate-latest.js v1.0.0

const fs = require("fs");
const path = require("path");

const versionTag = process.argv[2];
if (!versionTag) {
  console.error("Usage: node scripts/generate-latest.js v1.0.0");
  process.exit(1);
}

const version = versionTag.replace(/^v/, "");

const bucket = process.env.S3_BUCKET || "edge-desktop-configuration-application";
const region = process.env.AWS_REGION || "us-east-2";

const distRoot = path.join(__dirname, "..", "dist");

// Supported bundle extensions (must have matching .sig)
const platformConfigs = [
  { key: "windows-x86_64", dir: "windows", exts: [".msi", ".msi.zip", ".exe"] },
  { key: "linux-x86_64", dir: "linux", exts: [".AppImage", ".AppImage.tar.gz"] },
  { key: "darwin-x86_64", dir: "macos", exts: [".dmg", ".app.tar.gz"] }
];

const baseUrl = `https://${bucket}.s3.${region}.amazonaws.com`;

const platforms = {};

function findSignedFile(files, exts = []) {
  for (const ext of exts) {
    const fileName = files.find((f) => f.endsWith(ext));
    if (fileName && files.includes(`${fileName}.sig`)) {
      return fileName;
    }
  }

  const sig = files.find((f) => f.endsWith(".sig"));
  if (sig) {
    const base = sig.slice(0, -4);
    if (files.includes(base)) return base;
  }

  return null;
}

for (const cfg of platformConfigs) {
  const pDir = path.join(distRoot, cfg.dir);
  if (!fs.existsSync(pDir)) {
    console.warn(`[warn] dist dir not found for ${cfg.key}: ${pDir}`);
    continue;
  }

  const files = fs.readdirSync(pDir);
  const fileName = findSignedFile(files, cfg.exts);

  if (!fileName) {
    console.warn(`[warn] no bundle+sig pair found in ${pDir} for ${cfg.key}`);
    continue;
  }

  const filePath = path.join(pDir, fileName);
  const sigPath = `${filePath}.sig`;

  if (!fs.existsSync(sigPath)) {
    console.error(`[error] sig file not found for ${cfg.key}: ${sigPath}`);
    continue;
  }

  const signature = fs.readFileSync(sigPath, "utf8").trim();

  const url = `${baseUrl}/releases/${versionTag}/${cfg.dir}/${encodeURIComponent(fileName)}`;

  platforms[cfg.key] = {
    signature,
    url
  };

  console.log(`[ok] added ${cfg.key}: ${url}`);
}

if (Object.keys(platforms).length === 0) {
  console.error("No platforms found, latest.json will not be generated.");
  process.exit(1);
}

const latestJson = {
  version,
  pub_date: new Date().toISOString(),
  platforms
};

const outPath = path.join(__dirname, "..", "latest.json");
fs.writeFileSync(outPath, JSON.stringify(latestJson, null, 2), "utf8");

console.log("\nlatest.json generated:");
console.log(JSON.stringify(latestJson, null, 2));