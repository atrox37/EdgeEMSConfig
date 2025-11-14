// scripts/generate-latest.js
// 用法：node scripts/generate-latest.js v1.0.0

const fs = require("fs");
const path = require("path");

const versionTag = process.argv[2]; // 比如 v1.0.0
if (!versionTag) {
  console.error("Usage: node scripts/generate-latest.js v1.0.0");
  process.exit(1);
}

const version = versionTag.replace(/^v/, "");

const bucket = process.env.S3_BUCKET || "edge-desktop-configuration-application";
const region = process.env.AWS_REGION || "us-east-2";

// 和 workflow 中的 dist 目录对应
const distRoot = path.join(__dirname, "..", "dist");

// 根据实际打包产物扩展名配置
const platformConfigs = [
  {
    key: "windows-x86_64",
    dir: "windows",
    ext: ".msi"
  },
  {
    key: "linux-x86_64",
    dir: "linux",
    ext: ".AppImage"
  },
  {
    key: "darwin-x86_64", // Intel mac，若有 arm 再加一个 darwin-aarch64
    dir: "macos",
    ext: ".dmg"
  }
];

const baseUrl = `https://${bucket}.s3.${region}.amazonaws.com`;

const platforms = {};

for (const cfg of platformConfigs) {
  const pDir = path.join(distRoot, cfg.dir);
  if (!fs.existsSync(pDir)) {
    console.warn(`[warn] dist dir not found for ${cfg.key}: ${pDir}`);
    continue;
  }

  const files = fs
    .readdirSync(pDir)
    .filter((f) => f.endsWith(cfg.ext));

  if (files.length === 0) {
    console.warn(`[warn] no ${cfg.ext} file found in ${pDir} for ${cfg.key}`);
    continue;
  }

  const fileName = files[0];
  const sigFileName = fileName + ".sig";

  const filePath = path.join(pDir, fileName);
  const sigPath = path.join(pDir, sigFileName);

  if (!fs.existsSync(sigPath)) {
    console.error(`[error] sig file not found for ${cfg.key}: ${sigPath}`);
    continue;
  }

  const signature = fs.readFileSync(sigPath, "utf8").trim();

  // S3 中存放路径：releases/{tag}/{dir}/{fileName}
  const url = `${baseUrl}/releases/${versionTag}/${cfg.dir}/${encodeURIComponent(
    fileName
  )}`;

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
