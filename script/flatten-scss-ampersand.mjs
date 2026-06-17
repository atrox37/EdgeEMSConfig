/**
 * 将 SCSS 中 &__ / &-- / &. / &: 展开为完整选择器（便于代码审查）
 * 用法: node script/flatten-scss-ampersand.mjs [--check]
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..', 'src')
const CHECK_ONLY = process.argv.includes('--check')

/** 不处理 Element 全局覆盖（含 &.is-xxx 状态选择器，自动展开易破坏结构） */
const SKIP_DIRS = [
  path.join(ROOT, 'assets', 'styles', 'element'),
]

function shouldSkip(filePath) {
  return SKIP_DIRS.some((dir) => filePath.startsWith(dir + path.sep))
}

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    if (shouldSkip(full)) continue
    if (fs.statSync(full).isDirectory()) {
      if (name === 'node_modules') continue
      walk(full, files)
    } else if (name.endsWith('.vue') || name.endsWith('.scss')) {
      files.push(full)
    }
  }
  return files
}

function bemBlock(selector) {
  const trimmed = selector.trim().replace(/^\./, '')
  const first = trimmed.split(/[.\s#>+~[]/)[0]
  return first ? `.${first}` : selector
}

function expandOne(parent, token) {
  const t = token.trim()
  if (!t.startsWith('&')) return t
  const rest = t.slice(1)
  if (rest.startsWith('__') || rest.startsWith('--')) {
    return `${bemBlock(parent)}${rest}`
  }
  return `${parent}${rest}`
}

function expandAmpersand(parent, ampersandSel) {
  const sel = ampersandSel.trim()
  if (!sel.includes('&')) return sel
  return sel
    .split(/\s+/)
    .map((part) => expandOne(parent, part))
    .join(' ')
}

/** 解析 SCSS 块，展开所有 & 选择器 */
function flattenScss(content) {
  const lines = content.split('\n')
  const parentStack = []
  const result = []

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.endsWith('{') && !trimmed.startsWith('@')) {
      const indent = line.match(/^\s*/)[0]
      let selector = trimmed.slice(0, -1).trim()

      if (selector.startsWith('&')) {
        const parent = parentStack[parentStack.length - 1] || ''
        selector = expandAmpersand(parent, selector)
      }

      parentStack.push(selector)
      result.push(`${indent}${selector} {`)
      continue
    }

    if (trimmed === '}') {
      parentStack.pop()
      result.push(line)
      continue
    }

    // 单行规则：&--visible { ... } / &:hover { ... }
    const oneLineRule = line.match(/^(\s*)(&[^{]+)\{(.+)\}\s*$/)
    if (oneLineRule) {
      const parent = parentStack[parentStack.length - 1] || ''
      const expanded = expandAmpersand(parent, oneLineRule[2])
      result.push(`${oneLineRule[1]}${expanded} {${oneLineRule[3]}}`)
      continue
    }

    result.push(line)
  }

  return result.join('\n')
}

function extractVueScssBlocks(content) {
  const blocks = []
  const re = /<style([^>]*)>([\s\S]*?)<\/style>/gi
  let m
  while ((m = re.exec(content)) !== null) {
    if (!/lang=["']scss["']/.test(m[1])) continue
    const inner = m[2]
    blocks.push({
      inner,
      start: m.index,
      end: m.index + m[0].length,
      open: m[0].slice(0, m[0].indexOf(inner)),
      close: m[0].slice(m[0].indexOf(inner) + inner.length),
    })
  }
  return blocks
}

function processFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8')
  let next = original
  let changed = false

  if (filePath.endsWith('.scss')) {
    const flat = flattenScss(original)
    if (flat !== original) {
      changed = true
      next = flat
    }
  } else {
    const blocks = extractVueScssBlocks(original)
    for (let i = blocks.length - 1; i >= 0; i--) {
      const b = blocks[i]
      const flat = flattenScss(b.inner)
      if (flat === b.inner) continue
      changed = true
      const replacement = b.open + flat + b.close
      next = next.slice(0, b.start) + replacement + next.slice(b.end)
    }
  }

  if (changed && !CHECK_ONLY) {
    fs.writeFileSync(filePath, next, 'utf8')
  }
  return changed
}

const files = walk(ROOT)
let count = 0
for (const f of files) {
  if (processFile(f)) {
    count++
    console.log(CHECK_ONLY ? '[would change]' : '[updated]', path.relative(path.resolve(ROOT, '..'), f))
  }
}
console.log(`Done. ${count} file(s) ${CHECK_ONLY ? 'need' : ''} update.`)
