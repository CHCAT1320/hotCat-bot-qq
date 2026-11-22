import type { BotApi } from './botApi'
import type { BotClient } from './botClient'
import { PluginBase, PluginConstructor, PluginMeta } from './plugin'
import { BotConsole, formatError } from './botConsole'
import * as fs from 'fs'
import * as path from 'path'
import { pathToFileURL } from 'url'

interface PluginRecord {
    ctor: PluginConstructor
    meta: PluginMeta
    /** 插件入口文件，手动注册时为空 */
    file?: string
    /** 插件目录，手动注册时为空 */
    dir?: string
}

/**
 * 插件管理器，通过 `bot.plugin.xxx()` 访问。
 *
 * 支持目录扫描、文件变更热重载、插件依赖、启用/禁用、独立配置和存储。
 *
 * @example
 * bot.plugin.register('test', TestPlugin, { name: 'test', version: '1.0.0' })
 * await bot.plugin.load('test')
 *
 * // 自动扫描并监视
 * await bot.plugin.scan('./plugins')
 * bot.plugin.watch('./plugins')
 */
export class BotPluginSystem {
    private api: BotApi
    private client: BotClient
    private registry = new Map<string, PluginRecord>()
    private instances = new Map<string, PluginBase>()
    private watcher: ReturnType<typeof setInterval> | null = null
    private watchDir: string | null = null
    private watched = new Set<string>()
    private mtimes = new Map<string, number>()
    private caches = new Map<string, string>()
    private watchBusy = false
    private disabled: Set<string>

    constructor(api: BotApi, client: BotClient) {
        this.api = api
        this.client = client
        const saved = client.storage.namespace('plugins').get<string[]>('disabled', [])
        this.disabled = new Set(Array.isArray(saved) ? saved : [])
    }

    /**
     * 注册插件（不加载）
     * @param name - 唯一标识，重复注册抛错
     * @param ctor - 插件类，必须实现 static create()
     * @param meta - 插件元数据
     * @param file - 插件入口文件（自动扫描时传入）
     * @param dir - 插件目录（自动扫描时传入）
     */
    register(name: string, ctor: PluginConstructor, meta: PluginMeta, file?: string, dir?: string): void {
        if (this.registry.has(name)) {
            throw new Error(`插件 "${name}" 已注册`)
        }
        this.registry.set(name, { ctor, meta, file, dir })
        new BotConsole('plugin', { name: meta.name, msg: '已注册' }).log()
    }

    /**
     * 加载插件
     * @param name - 已注册的插件名
     */
    async load(name: string): Promise<void> {
        if (this.instances.has(name)) {
            throw new Error(`插件 "${name}" 已加载`)
        }
        if (!this.isEnabled(name)) {
            throw new Error(`插件 "${name}" 已禁用`)
        }
        const record = this.registry.get(name)
        if (!record) {
            throw new Error(`插件 "${name}" 未注册`)
        }
        for (const dependency of record.meta.dependencies ?? []) {
            if (!this.instances.has(dependency)) {
                throw new Error(`插件 "${name}" 缺少依赖: ${dependency}`)
            }
        }
        const instance = record.ctor.create(this.api, this.client, record.meta)
        instance.setConfig(this.getConfig(name, record))
        await instance.load()
        this.instances.set(name, instance)
        new BotConsole('plugin', { name: record.meta.name, msg: '已加载' }).log()
    }

    /**
     * 卸载插件
     * @param name - 已加载的插件名
     */
    async unload(name: string): Promise<void> {
        const instance = this.instances.get(name)
        if (!instance) {
            throw new Error(`插件 "${name}" 未加载`)
        }
        await instance.unload()
        this.instances.delete(name)
        this.cleanupCache(name)
        new BotConsole('plugin', { name: this.registry.get(name)?.meta.name || name, msg: '已卸载' }).log()
    }

    /** 卸载全部已加载插件，忽略单个插件错误 */
    async unloadAll(): Promise<void> {
        for (const name of Array.from(this.instances.keys()).reverse()) {
            try {
                await this.unload(name)
            } catch (e) {
                new BotConsole('error', `卸载插件 "${name}" 失败: ${formatError(e)}`).log()
            }
        }
    }

    /**
     * 热重载：自动扫描的插件会重新 import 入口文件，避免 ESM 缓存旧代码
     * @param name - 已加载的插件名
     */
    async reload(name: string): Promise<void> {
        const record = this.registry.get(name)
        if (!record) throw new Error(`插件 "${name}" 未注册`)
        if (this.instances.has(name)) await this.unload(name)

        if (record.file) {
            try {
                const ctor = await this.importPlugin(record.file, name, true)
                const meta: PluginMeta = ctor.meta || record.meta || { name, version: '0.0.0' }
                this.registry.set(name, { ctor, meta, file: record.file, dir: record.dir })
            } catch (e) {
                new BotConsole('error', `重新导入插件 "${name}" 失败，继续使用旧代码: ${formatError(e)}`).log()
            }
        }

        await this.load(name)
        this.mtimes.set(name, this.computeMtime(record.dir ?? path.dirname(record.file ?? '')))
    }

    /** 获取已加载的插件实例 */
    get(name: string): PluginBase | undefined {
        return this.instances.get(name)
    }

    /** 返回所有已注册的插件名列表 */
    list(): string[] {
        return Array.from(this.registry.keys())
    }

    /** 返回所有已加载的插件名列表 */
    loaded(): string[] {
        return Array.from(this.instances.keys())
    }

    /** 插件是否启用 */
    isEnabled(name: string): boolean {
        return !this.disabled.has(name)
    }

    /** 启用插件并尝试加载 */
    async enable(name: string): Promise<void> {
        this.disabled.delete(name)
        this.saveDisabled()
        if (this.registry.has(name) && !this.instances.has(name)) {
            await this.load(name)
        }
    }

    /** 禁用插件并卸载 */
    async disable(name: string): Promise<void> {
        const dependents = Array.from(this.instances.keys()).filter((loaded) =>
            (this.registry.get(loaded)?.meta.dependencies ?? []).includes(name),
        );
        this.disabled.add(name)
        this.saveDisabled()
        for (const dependent of dependents) {
            await this.disable(dependent)
        }
        if (this.instances.has(name)) await this.unload(name)
    }

    /** 读取插件配置，合并 meta.config 默认值 */
    getConfig(name: string, record = this.registry.get(name)): Record<string, any> {
        const defaults = { ...(record?.meta.config ?? {}) }
        if (!record?.dir) return defaults
        const file = path.join(record.dir, 'config.json')
        if (!fs.existsSync(file)) return defaults
        try {
            const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
                ? { ...defaults, ...parsed }
                : defaults
        } catch (e) {
            new BotConsole('error', `读取插件 "${name}" 配置失败: ${formatError(e)}`).log()
            return defaults
        }
    }

    /** 保存插件配置到插件目录下的 config.json */
    saveConfig(name: string, config: Record<string, any>): void {
        const record = this.registry.get(name)
        if (!record?.dir) throw new Error(`插件 "${name}" 没有关联目录，无法保存配置`)
        const file = path.join(record.dir, 'config.json')
        try {
            const tmp = `${file}.${process.pid}.tmp`
            fs.writeFileSync(tmp, JSON.stringify(config, null, 2), 'utf8')
            fs.renameSync(tmp, file)
        } catch (e) {
            throw new Error(`保存插件 "${name}" 配置失败: ${formatError(e)}`)
        }
    }

    private saveDisabled(): void {
        this.client.storage.namespace('plugins').set('disabled', Array.from(this.disabled))
    }

    private findIndex(dir: string, name: string): string | null {
        const js = path.join(dir, name, 'index.js')
        if (fs.existsSync(js)) return js
        const ts = path.join(dir, name, 'index.ts')
        if (fs.existsSync(ts)) return ts
        return null
    }

    private async importPlugin(file: string, name: string, fresh = false): Promise<PluginConstructor> {
        const source = fresh ? this.copyFreshPlugin(file, name) : null
        const entry = source ? source.entry : path.resolve(file)
        try {
            const url = pathToFileURL(entry)
            if (!fresh) url.searchParams.set('t', String(Date.now()))
            const mod = await import(url.href)
            const ctor = mod[name.charAt(0).toUpperCase() + name.slice(1) + 'Plugin']
                || mod.default
                || Object.values(mod).find((v: any) => typeof v === 'function' && v.create)
            if (!ctor || typeof ctor.create !== 'function') {
                throw new Error(`未导出符合规范的插件类`)
            }
            if (source) this.caches.set(name, source.cacheDir)
            return ctor as PluginConstructor
        } catch (e) {
            if (source) fs.rmSync(source.cacheDir, { recursive: true, force: true })
            throw e
        }
    }

    /**
     * 热重载时把整个插件目录复制到唯一缓存目录，保证相对依赖也不会命中 ESM 缓存。
     * Bun 会忽略 URL query，因此不能只靠 `?t=` 绕过缓存。
     */
    private copyFreshPlugin(file: string, name: string): { entry: string; cacheDir: string } {
        const pluginDir = path.dirname(file)
        const cacheRoot = path.join(path.dirname(pluginDir), '.hotcat-cache')
        fs.mkdirSync(cacheRoot, { recursive: true })
        const cacheDir = path.join(cacheRoot, `${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`)
        fs.cpSync(pluginDir, cacheDir, {
            recursive: true,
            filter: (src) => {
                const base = path.basename(src)
                return base !== 'node_modules' && base !== '.hotcat-cache' && !base.startsWith('.hotcat-')
            },
        })
        return { entry: path.join(cacheDir, path.basename(file)), cacheDir }
    }

    private cleanupCache(name: string): void {
        const cacheDir = this.caches.get(name)
        if (!cacheDir) return
        this.caches.delete(name)
        try {
            fs.rmSync(cacheDir, { recursive: true, force: true })
        } catch {}
    }

    /**
     * 扫描目录，自动注册并加载所有插件
     * @param dir - 插件目录路径
     * @param autoLoad - 是否自动加载，默认 true
     * @returns 加载成功的插件名列表
     */
    async scan(dir: string, autoLoad = true): Promise<string[]> {
        const loaded: string[] = []
        const discovered: string[] = []
        if (!fs.existsSync(dir)) return loaded

        let entries: fs.Dirent[]
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true })
        } catch (e) {
            new BotConsole('error', `扫描插件目录 "${dir}" 失败: ${formatError(e)}`).log()
            return loaded
        }

        for (const entry of entries) {
            if (!entry.isDirectory() || entry.name.startsWith('.')) continue
            const name = entry.name
            const indexPath = this.findIndex(dir, name)
            if (!indexPath) continue
            discovered.push(name)
            if (this.registry.has(name)) {
                this.mtimes.set(name, this.computeMtime(path.join(dir, name)))
                continue
            }

            try {
                const ctor = await this.importPlugin(indexPath, name)
                const meta: PluginMeta = ctor.meta || { name, version: '0.0.0' }
                this.register(name, ctor, meta, indexPath, path.join(dir, name))
                this.mtimes.set(name, this.computeMtime(path.join(dir, name)))
            } catch (e) {
                new BotConsole('error', `加载插件 "${name}" 失败: ${formatError(e)}`).log()
            }
        }

        if (autoLoad) {
            for (const name of discovered) {
                if (!this.isEnabled(name) || this.instances.has(name)) continue
                try {
                    await this.loadWithDependencies(name, new Set())
                    loaded.push(name)
                } catch (e) {
                    new BotConsole('error', `加载插件 "${name}" 失败: ${formatError(e)}`).log()
                }
            }
        }
        return loaded
    }

    private async loadWithDependencies(name: string, stack: Set<string>): Promise<void> {
        if (this.instances.has(name)) return
        if (stack.has(name)) throw new Error(`插件依赖存在循环: ${Array.from(stack).join(' -> ')} -> ${name}`)
        const record = this.registry.get(name)
        if (!record) throw new Error(`插件 "${name}" 未注册`)
        stack.add(name)
        for (const dependency of record.meta.dependencies ?? []) {
            await this.loadWithDependencies(dependency, stack)
        }
        stack.delete(name)
        await this.load(name)
    }

    /**
     * 开始监听目录：新增插件自动加载，删除自动卸载，文件修改自动热重载
     * @param dir - 插件目录路径
     * @param interval - 轮询间隔(ms)，默认 5000
     */
    watch(dir: string, interval = 5000): void {
        if (this.watcher) {
            new BotConsole('error', '已在监听中，请先调用 unwatch()').log()
            return
        }
        this.watchDir = path.resolve(dir)
        if (!fs.existsSync(this.watchDir)) {
            new BotConsole('error', `目录不存在: ${this.watchDir}`).log()
            return
        }
        this.watched = new Set<string>()
        try {
            for (const entry of fs.readdirSync(this.watchDir, { withFileTypes: true })) {
                if (!entry.isDirectory() || entry.name.startsWith('.')) continue
                if (!this.findIndex(this.watchDir, entry.name)) continue
                this.watched.add(entry.name)
                const record = this.registry.get(entry.name)
                if (record?.dir) this.mtimes.set(entry.name, this.computeMtime(record.dir))
            }
        } catch (e) {
            new BotConsole('error', `读取插件目录失败: ${formatError(e)}`).log()
            return
        }
        new BotConsole('plugin', { name: 'watch', msg: `开始监听 ${this.watchDir}` }).log()

        this.watcher = setInterval(async () => {
            if (this.watchBusy) return
            this.watchBusy = true
            try {
                const watchDir = this.watchDir
                if (!watchDir || !fs.existsSync(watchDir)) return
                const entries = fs.readdirSync(watchDir, { withFileTypes: true })
                const current = new Set<string>()

                for (const entry of entries) {
                    if (!entry.isDirectory() || entry.name.startsWith('.')) continue
                    const name = entry.name
                    const indexPath = this.findIndex(watchDir, name)
                    if (!indexPath) continue
                    current.add(name)

                    if (!this.watched.has(name)) {
                        await this.scanOne(watchDir, name)
                        continue
                    }

                    const dirPath = path.join(watchDir, name)
                    const mtime = this.computeMtime(dirPath)
                    if (mtime !== this.mtimes.get(name) && this.registry.has(name)) {
                        this.mtimes.set(name, mtime)
                        if (!this.isEnabled(name)) continue
                        try {
                            await this.reload(name)
                            new BotConsole('plugin', { name, msg: '检测到文件变更，已热重载' }).log()
                        } catch (e) {
                            new BotConsole('error', `热重载插件 "${name}" 失败: ${formatError(e)}`).log()
                        }
                    }
                }

                for (const name of Array.from(this.watched)) {
                    if (!current.has(name) && this.registry.has(name)) {
                        const displayName = this.registry.get(name)?.meta.name || name
                        try {
                            if (this.instances.has(name)) await this.unload(name)
                            this.registry.delete(name)
                            this.mtimes.delete(name)
                            new BotConsole('plugin', { name: displayName, msg: '目录已删除，已移除' }).log()
                        } catch {}
                    }
                }

                this.watched = current
            } catch (e) {
                new BotConsole('error', `插件目录监听失败: ${formatError(e)}`).log()
            } finally {
                this.watchBusy = false
            }
        }, interval)
    }

    /** 停止目录监听 */
    unwatch(): void {
        if (this.watcher) {
            clearInterval(this.watcher)
            this.watcher = null
            this.watchDir = null
            this.watchBusy = false
            new BotConsole('plugin', { name: 'watch', msg: '已停止' }).log()
        }
    }

    private async scanOne(dir: string, name: string): Promise<void> {
        const indexPath = this.findIndex(dir, name)
        if (!indexPath) return
        try {
            const ctor = await this.importPlugin(indexPath, name)
            const meta: PluginMeta = ctor.meta || { name, version: '0.0.0' }
            this.register(name, ctor, meta, indexPath, path.join(dir, name))
            this.mtimes.set(name, this.computeMtime(path.join(dir, name)))
            if (this.isEnabled(name)) {
                await this.load(name)
                new BotConsole('plugin', { name: meta.name, msg: '已自动加载' }).log()
            }
        } catch (e) {
            new BotConsole('error', `自动加载插件 "${name}" 失败: ${formatError(e)}`).log()
        }
    }

    private computeMtime(dir: string): number {
        let latest = 0
        const walk = (current: string): void => {
            let entries: fs.Dirent[]
            try {
                entries = fs.readdirSync(current, { withFileTypes: true })
            } catch {
                return
            }
            for (const entry of entries) {
                if (entry.name === 'node_modules' || entry.name.startsWith('.') || entry.name === 'config.json') continue
                const full = path.join(current, entry.name)
                try {
                    if (entry.isDirectory()) walk(full)
                    else latest = Math.max(latest, fs.statSync(full).mtimeMs)
                } catch {}
            }
        }
        walk(dir)
        return latest
    }
}
