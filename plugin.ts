import type { BotApi } from './botApi'
import type { BotClient } from './botClient'
import type { NamespacedStorage } from './botStorage'

/** 插件元数据 */
export interface PluginMeta {
    name: string
    version: string
    description?: string
    author?: string
    /** 依赖的插件名，加载时会先加载依赖 */
    dependencies?: string[]
    /** 默认配置，会与插件目录下的 config.json 合并 */
    config?: Record<string, any>
}

/** 所有插件必须继承此类 */
export abstract class PluginBase {
    protected api: BotApi
    protected bot: BotClient
    protected meta: PluginMeta
    /** 插件独立存储命名空间 */
    protected readonly storage: NamespacedStorage
    /** 插件配置，来自 config.json 与 meta.config 合并 */
    protected config: Record<string, any> = {}

    /** 子类重写：声明插件元数据 */
    static meta: PluginMeta = { name: '', version: '0.0.0' }

    constructor(api: BotApi, bot: BotClient, meta?: PluginMeta) {
        const Ctor = this.constructor as typeof PluginBase
        this.meta = meta || Ctor.meta
        this.api = api
        this.bot = bot
        this.storage = bot.storage.namespace(`plugin.${this.meta.name || 'unknown'}`)
    }

    /** 由插件系统在加载时调用，注入合并后的配置 */
    setConfig(config: Record<string, any>): void {
        this.config = config
    }

    /** 插件加载时调用：注册事件、启动定时任务、初始化资源 */
    abstract load(): Promise<void>

    /** 插件卸载时调用：移除事件监听、取消定时任务、释放资源 */
    abstract unload(): Promise<void>
}

/** 插件模块必须导出的构造函数签名 */
export type PluginConstructor = {
    create(api: BotApi, bot: BotClient, meta?: PluginMeta): PluginBase
    meta?: PluginMeta
}
