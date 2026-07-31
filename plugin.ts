import type { BotApi } from './botApi'
import type { BotClient } from './botClient'

/** 插件元数据 */
export interface PluginMeta {
    name: string
    version: string
    description?: string
    author?: string
}

/** 所有插件必须继承此类 */
export abstract class PluginBase {
    protected api: BotApi
    protected bot: BotClient
    protected meta: PluginMeta

    /** 子类重写：声明插件元数据 */
    static meta: PluginMeta = { name: '', version: '0.0.0' }

    constructor(api: BotApi, bot: BotClient, meta?: PluginMeta) {
        this.api = api
        this.bot = bot
        const Ctor = this.constructor as typeof PluginBase
        this.meta = meta || Ctor.meta
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
