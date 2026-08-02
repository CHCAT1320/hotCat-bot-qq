import type { BotApi } from './botApi'
import type { BotClient } from './botClient'
import { PluginBase, PluginConstructor, PluginMeta } from './plugin'
import { BotConsole } from './botConsole'
import * as fs from 'fs'
import * as path from 'path'

interface PluginRecord {
    ctor: PluginConstructor
    meta: PluginMeta
}

/**
 * 插件管理器，通过 `bot.plugin.xxx()` 访问。
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

    constructor(api: BotApi, client: BotClient) {
        this.api = api
        this.client = client
    }

    /**
     * 注册插件（不加载）
     * @param name - 唯一标识，重复注册抛错
     * @param ctor - 插件类，必须实现 static create()
     * @param meta - 插件元数据
     */
    register(name: string, ctor: PluginConstructor, meta: PluginMeta): void {
        if (this.registry.has(name)) {
            throw new Error(`插件 "${name}" 已注册`)
        }
        this.registry.set(name, { ctor, meta })
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
        const record = this.registry.get(name)
        if (!record) {
            throw new Error(`插件 "${name}" 未注册`)
        }
        const instance = record.ctor.create(this.api, this.client, record.meta)
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
        new BotConsole('plugin', { name: this.registry.get(name)?.meta.name || name, msg: '已卸载' }).log()
    }

    /**
     * 热重载：先卸载再加载
     * @param name - 已加载的插件名
     */
    async reload(name: string): Promise<void> {
        await this.unload(name)
        await this.load(name)
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

    private findIndex(dir: string, name: string): string | null {
        const js = path.join(dir, name, 'index.js')
        if (fs.existsSync(js)) return js
        const ts = path.join(dir, name, 'index.ts')
        if (fs.existsSync(ts)) return ts
        return null
    }

    /**
     * 扫描目录，自动注册并加载所有插件
     * @param dir - 插件目录路径
     * @param autoLoad - 是否自动加载，默认 true
     * @returns 加载成功的插件名列表
     */
    async scan(dir: string, autoLoad = true): Promise<string[]> {
        const loaded: string[] = []
        if (!fs.existsSync(dir)) return loaded

        const entries = fs.readdirSync(dir, { withFileTypes: true })
        for (const entry of entries) {
            if (!entry.isDirectory()) continue
            const name = entry.name
            const indexPath = this.findIndex(dir, name)
            if (!indexPath) continue

            try {
                const mod = await import(path.resolve(indexPath))
                const ctor = mod[name.charAt(0).toUpperCase() + name.slice(1) + 'Plugin'] || mod.default || Object.values(mod).find((v: any) => typeof v === 'function' && v.create)
                if (!ctor || typeof ctor.create !== 'function') {
                    new BotConsole('error', `插件目录 "${name}" 未导出符合规范的插件类`).log()
                    continue
                }
                const meta: PluginMeta = ctor.meta || {
                    name,
                    version: '0.0.0',
                }
                this.register(name, ctor as PluginConstructor, meta)
                if (autoLoad) {
                    await this.load(name)
                    loaded.push(name)
                }
            } catch (e: any) {
                new BotConsole('error', `加载插件 "${name}" 失败: ${e.message || e}`).log()
            }
        }
        return loaded
    }

    /**
     * 开始监听目录，自动加载新增插件、卸载已删除插件
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
        this.watched = new Set(this.list())
        new BotConsole('plugin', { name: 'watch', msg: `开始监听 ${this.watchDir}` }).log()

        this.watcher = setInterval(async () => {
            if (!fs.existsSync(this.watchDir!)) return
            const entries = fs.readdirSync(this.watchDir!, { withFileTypes: true })
            const current = new Set<string>()

            for (const entry of entries) {
                if (!entry.isDirectory()) continue
                const name = entry.name
                const indexPath = this.findIndex(this.watchDir!, name)
                if (!indexPath) continue
                current.add(name)

                if (!this.watched.has(name)) {
                    await this.scanOne(this.watchDir!, name)
                }
            }

            for (const name of Array.from(this.watched)) {
                if (!current.has(name) && this.registry.has(name)) {
                    const displayName = this.registry.get(name)?.meta.name || name
                    try {
                        if (this.instances.has(name)) {
                            await this.unload(name)
                        }
                        this.registry.delete(name)
                        new BotConsole('plugin', { name: displayName, msg: '目录已删除，已移除' }).log()
                    } catch {}
                }
            }

            this.watched = current
        }, interval)
    }

    /** 停止目录监听 */
    unwatch(): void {
        if (this.watcher) {
            clearInterval(this.watcher)
            this.watcher = null
            this.watchDir = null
            new BotConsole('plugin', { name: 'watch', msg: '已停止' }).log()
        }
    }

    private async scanOne(dir: string, name: string): Promise<void> {
        const indexPath = this.findIndex(dir, name)
        if (!indexPath) return
        try {
            const mod = await import(indexPath)
            const ctor = mod[name.charAt(0).toUpperCase() + name.slice(1) + 'Plugin'] || mod.default || Object.values(mod).find((v: any) => typeof v === 'function' && v.create)
            if (!ctor || typeof ctor.create !== 'function') return
            const meta: PluginMeta = ctor.meta || {
                name,
                version: '0.0.0',
            }
            this.register(name, ctor as PluginConstructor, meta)
            await this.load(name)
            new BotConsole('plugin', { name: meta.name, msg: '已自动加载' }).log()
        } catch (e: any) {
            new BotConsole('error', `自动加载插件 "${name}" 失败: ${e.message || e}`).log()
        }
    }
}
