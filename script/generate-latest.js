// scripts/generate-latest.js (ESM)
// Usage: node script/generate-latest.js v1.0.0

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const versionTag = process.argv[2];
if (!versionTag) {
  console.error("Usage: node script/generate-latest.js v1.0.0");
  process.exit(1);
}

const version = versionTag.replace(/^v/, "");

const bucket = process.env.S3_BUCKET || "edge-desktop-configuration-application";
const region = process.env.AWS_REGION || "us-east-2";

const distRoot = path.join(__dirname, "..", "dist");
const changelogPath = path.join(__dirname, "..", "CHANGELOG.md");

/**
 * 从 CHANGELOG.md 中提取指定版本的更新日志
 * @param {string} targetVersion - 目标版本号（如 "0.1.7"）
 * @returns {string} 更新日志内容，如果找不到则返回空字符串
 */
function extractChangelogForVersion(targetVersion) {
  if (!fs.existsSync(changelogPath)) {
    console.warn(`[warn] CHANGELOG.md not found at ${changelogPath}`);
    return "";
  }

  const changelogContent = fs.readFileSync(changelogPath, "utf8");
  
  // 匹配版本标题，格式：## [版本号] - 日期
  // 支持多种格式：## [0.1.7]、## [0.1.7] - 2025-01-XX、## [v0.1.7]
  const versionPattern = new RegExp(
    `##\\s*\\[v?${targetVersion.replace(/\./g, "\\.")}\\][^\\n]*(?:\\n|$)`,
    "i"
  );
  
  const versionMatch = changelogContent.match(versionPattern);
  if (!versionMatch) {
    console.warn(`[warn] No changelog entry found for version ${targetVersion}`);
    return "";
  }

  const startIndex = changelogContent.indexOf(versionMatch[0]);
  if (startIndex === -1) {
    return "";
  }

  // 查找下一个版本标题或文档结束
  const remainingContent = changelogContent.substring(startIndex);
  const nextVersionPattern = /^##\s*\[v?\d+\.\d+\.\d+\]/m;
  const nextVersionMatch = remainingContent.substring(versionMatch[0].length).match(nextVersionPattern);
  
  let endIndex;
  if (nextVersionMatch) {
    // 找到下一个版本，截取到下一个版本之前
    endIndex = startIndex + versionMatch[0].length + nextVersionMatch.index;
  } else {
    // 没有下一个版本，截取到文档结束
    endIndex = changelogContent.length;
  }

  let changelog = changelogContent.substring(startIndex, endIndex).trim();
  
  // 移除版本标题行，只保留内容
  changelog = changelog.replace(/^##\s*\[.*?\]\s*-?\s*.*?\n/, "");
  
  // 清理多余的空行
  changelog = changelog.replace(/\n{3,}/g, "\n\n").trim();
  
  return changelog || "";
}

// Supported bundle extensions (must have matching .sig)
const platformConfigs = [
  { key: "windows-x86_64", dir: "windows", exts: [".msi", ".msi.zip", ".exe"] },
  { key: "linux-x86_64", dir: "linux", exts: [".AppImage", ".AppImage.tar.gz"] },
  // Linux ARM64 (AppImage)
  { key: "linux-aarch64", dir: "linux-arm64", exts: [".AppImage", ".AppImage.tar.gz"] },
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

// 从 CHANGELOG.md 中提取更新日志
const notes = extractChangelogForVersion(version);
if (notes) {
  console.log(`[ok] Changelog extracted for version ${version}`);
} else {
  console.warn(`[warn] No changelog found for version ${version}, notes field will be empty`);
}

const latestJson = {
  version,
  pub_date: new Date().toISOString(),
  notes: notes || undefined, // 如果没有更新日志，则不包含 notes 字段
  platforms
};

const outPath = path.join(__dirname, "..", "latest.json");
fs.writeFileSync(outPath, JSON.stringify(latestJson, null, 2), "utf8");

console.log("\nlatest.json generated:");
console.log(JSON.stringify(latestJson, null, 2));