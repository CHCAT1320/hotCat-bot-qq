/**
 * 构建后处理：给 dist 里的相对导入补上 `.js` 扩展名。
 *
 * 背景：tsconfig 用的是 `moduleResolution: "bundler"`，`tsc` 会把源码里的
 * `import { BotApi } from './botApi'` 原样输出。Node 的 ESM 加载器要求显式扩展名，
 * 因此 `dist` 在 Node 下会直接 `ERR_MODULE_NOT_FOUND`（Bun 容忍缺省扩展名，
 * 所以此前用 Bun 跑没暴露这个问题）。
 *
 * 这里保持源码零改动，只在产物上补齐扩展名，Bun 与 Node 都能加载。
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')

if (!fs.existsSync(dist)) {
    console.error('[build:post] dist 目录不存在，请先执行 tsc')
    process.exit(1)
}

/**
 * 匹配 `from './x'` / `from '../x'` 且尚未带扩展名的说明符。
 * 只处理相对路径；裸包名（如 'node-napcat-ts'）不动。
 */
const RELATIVE_IMPORT = /(\bfrom\s*['"])(\.{1,2}\/[^'"]*?)(['"])/g
const RELATIVE_DYNAMIC = /(\bimport\s*\(\s*['"])(\.{1,2}\/[^'"]*?)(['"])/g

/**
 * 判断说明符是否已经带扩展名（.js/.mjs/.cjs/.json/.node）。
 * @param {string} spec
 */
function hasExtension(spec) {
    return /\.[a-zA-Z0-9]+$/.test(spec)
}

/**
 * 给一个说明符补 `.js`；若对应的 .js 产物不存在则保持原样。
 * @param {string} spec
 * @param {string} fromFile
 */
function withExtension(spec, fromFile) {
    if (hasExtension(spec)) return spec
    const resolved = path.resolve(path.dirname(fromFile), `${spec}.js`)
    return fs.existsSync(resolved) ? `${spec}.js` : spec
}

let changedFiles = 0
let changedImports = 0

for (const entry of fs.readdirSync(dist)) {
    if (!entry.endsWith('.js')) continue
    const file = path.join(dist, entry)
    const source = fs.readFileSync(file, 'utf8')

    const rewrite = (/** @type {string} */ _match, /** @type {string} */ prefix, /** @type {string} */ spec, /** @type {string} */ suffix) => {
        const next = withExtension(spec, file)
        if (next !== spec) changedImports++
        return `${prefix}${next}${suffix}`
    }

    const output = source.replace(RELATIVE_IMPORT, rewrite).replace(RELATIVE_DYNAMIC, rewrite)
    if (output !== source) {
        fs.writeFileSync(file, output, 'utf8')
        changedFiles++
    }
}

console.log(`[build:post] 已为 ${changedFiles} 个文件补齐 ${changedImports} 处相对导入扩展名`)
