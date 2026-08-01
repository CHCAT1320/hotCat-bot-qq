# 插件开发

HotCat Bot 启动时自动扫描 `plugins/` 目录并加载所有插件，同时监听目录变化实现热插拔。

## 快速开始

在 `plugins/<name>/` 下创建 `index.ts`：

```ts
import { PluginBase, PluginMeta } from 'hotcat-bot-qq/plugin'
import { BotApi } from 'hotcat-bot-qq/botApi'
import { BotClient } from 'hotcat-bot-qq/botClient'
import { Message } from 'hotcat-bot-qq/message'

export class HelloPlugin extends PluginBase {
    static meta = {
        name: 'hello',
        version: '1.0.0',
        description: '示例插件',
        author: 'your-name',
    }

    static create(api: BotApi, bot: BotClient) {
        return new HelloPlugin(api, bot)
    }

    async load() {
        this.bot.event.message.onGroupMessage(this.onGroupMsg)
    }

    async unload() {
        this.bot.event.message.offGroupMessage(this.onGroupMsg)
    }

    private onGroupMsg = async (_bot: BotClient, event: any) => {
        if (event.raw_message === '/hello') {
            await this.api.sendGroupMessage(event.group_id,
                Message.reply(event.message_id),
                Message.text('你好！')
            )
        }
    }
}
```

启动 bot，插件自动加载。无需在 `bot.ts` 中手动导入。

## 插件规范

### 必须导出

| 要求 | 说明 |
|---|---|
| `class` 继承 `PluginBase` | 所有插件类必须 `extends PluginBase` |
| `static meta` | 声明插件元数据，自动扫描时读取 |
| `static create()` | 接收 `api` `bot` 两个参数 |
| `load()` | 异步方法，注册事件 / 启动定时 |
| `unload()` | 异步方法，移除事件 / 取消定时 |

### 可用属性

| 属性 | 类型 | 说明 |
|---|---|---|
| `this.api` | `BotApi` | 所有 napcat API |
| `this.bot` | `BotClient` | bot 实例，包含 event/scheduler/plugin |
| `this.meta` | `PluginMeta` | 插件元数据 `{ name, version, description? }` |

### PluginMeta

```ts
interface PluginMeta {
    name: string
    version: string
    description?: string
    author?: string
}
```

## 导入规范

统一从 `hotcat-bot-qq/xxx` 导入，按需取用：

```ts
import { PluginBase, PluginMeta } from 'hotcat-bot-qq/plugin'
import { BotApi } from 'hotcat-bot-qq/botApi'
import { BotClient } from 'hotcat-bot-qq/botClient'
import { Message } from 'hotcat-bot-qq/message'
```

> 项目通过 `tsconfig.json` 的 `paths` 将 `hotcat-bot-qq` 映射到本地根目录，开发时无需发布 npm 即可直接使用。

## 卸载清理

### 为什么要清理

热重载 `bot.plugin.reload(name)` 的内部流程是 **`unload()` → `load()`**。如果 `unload()` 没有清理干净，旧的事件监听器、定时器会继续残留，`load()` 再注册一次，导致**同一事件触发多次回调**——消息重复回复、定时任务叠加执行。

### 需要清理的资源

| 资源 | load 中创建 | unload 中释放 |
|---|---|---|
| 消息事件 | `this.bot.event.message.onGroupMessage(fn)` | `this.bot.event.message.offGroupMessage(fn)` |
| 定时任务 | `this.bot.scheduler.cron(...)` | `this.bot.scheduler.cancel(id)` |
| 定时任务 | `this.bot.scheduler.every(...)` | `this.bot.scheduler.cancel(id)` |
| 外部连接 | `connect()` / `open()` | `disconnect()` / `close()` |

### 完整示例

```ts
export class MyPlugin extends PluginBase {
    private timerId = 0

    async load() {
        // 1. 注册事件
        this.bot.event.message.onGroupMessage(this.onGroupMsg)

        // 2. 启动定时 —— 保存 id 以便取消
        this.timerId = this.bot.scheduler.every('1h', this.onTick)
    }

    async unload() {
        // 1. 移除事件 —— 使用对应的 off 方法
        this.bot.event.message.offGroupMessage(this.onGroupMsg)

        // 2. 取消定时
        this.bot.scheduler.cancel(this.timerId)
    }

    // ⚠️ 必须用箭头函数属性，保证 this 绑定且引用唯一
    private onGroupMsg = async (event: any) => { ... }
    private onTick = () => { ... }
}
```

> 为什么用箭头函数属性（`private fn = () => {}`）而不是方法（`private fn() {}`）？因为 `off()` 需要**完全相同的函数引用**才能移除。箭头函数属性在类实例化时绑定到 `this`，且引用不会变化。

## 完整示例：每日签到

每天 0:00 遍历所有群聊发送签到消息。

```ts
import { PluginBase } from 'hotcat-bot-qq/plugin'
import { BotApi } from 'hotcat-bot-qq/botApi'
import { BotClient } from 'hotcat-bot-qq/botClient'
import { Message } from 'hotcat-bot-qq/message'

export class SignPlugin extends PluginBase {
    static meta = {
        name: 'sign',
        version: '1.0.0',
        description: '每日 0 点群签到',
        author: 'your-name',
    }

    private timerId = 0

    static create(api: BotApi, bot: BotClient) {
        return new SignPlugin(api, bot)
    }

    async load() {
        // 每天 0:00 执行
        this.timerId = this.bot.scheduler.cron('0 0 * * *', this.doSign)
    }

    async unload() {
        this.bot.scheduler.cancel(this.timerId)
    }

    private doSign = async () => {
        const groups = await this.api.getGroupList()

        for (const g of groups) {
            try {
                await this.api.sendGroupSign(g.group_id)
            } catch {}
        }
    }
}

```

:::tip 时间偏移
`cron('0 0 * * *')` 基于 bot 所在机器的系统时钟。如果机器时间与 QQ 服务器时间偏差较大，签到可能失败。建议将 cron 设为 `'0 0 0 * * *'` 增加秒级延迟、或在 cron 回调中加一个随机延时（如 `setTimeout(fn, Math.random() * 30000)`），避免瞬时集中请求。
:::

## 插件管理

Bot 启动时已自动 `scan` 并 `watch`，以下为手动控制场景。

### 启动时自动加载所有插件（默认）

无需任何代码，`bot.start()` 内部会执行 `scan('./plugins')` 和 `watch('./plugins')`。

### 手动注册并加载

```ts
bot.plugin.register('hello', HelloPlugin, {
    name: 'hello',
    version: '1.0.0',
})
await bot.plugin.load('hello')
```

### 条件加载

```ts
const isDev = process.env.NODE_ENV !== 'production'

if (isDev) {
    bot.plugin.register('debug', DebugPlugin, { name: 'debug', version: '1.0.0' })
    await bot.plugin.load('debug')
}
```

### 获取插件实例调用自定义方法

```ts
const p = bot.plugin.get('sign') as SignPlugin
if (p) {
    p.doSign()
}
```

### 重载所有已加载插件

```ts
for (const name of bot.plugin.loaded()) {
    await bot.plugin.reload(name)
}
```

### 卸载全部插件

```ts
for (const name of bot.plugin.loaded()) {
    await bot.plugin.unload(name)
}
```

### 通过消息指令控制插件

```ts
bot.event.message.onGroupMessage(async (bot, event) => {
    if (event.raw_message === '/reload test') {
        await bot.plugin.reload('test')
        await bot.api.sendGroupMessage(event.group_id, Message.text('已重载'))
    }

    if (event.raw_message === '/plugins') {
        const list = bot.plugin.list().join(', ')
        await bot.api.sendGroupMessage(event.group_id, Message.text(`已注册: ${list}`))
    }
})
```

### 加载错误处理

`scan` 和 `load` 失败只输出错误日志，不影响其他插件：

```
[system]: 插件 "sign" 已注册
[system]: 插件 "sign" 已加载
[error]: 加载插件 "broken" 失败: index.ts 未导出符合规范的类
[system]: 插件 "hello" 已加载
```

## 目录结构

```
plugins/
├── hotCatPlugin/
│   └── index.ts
├── sign/
│   └── index.ts
└── utils/
    └── helper.ts       # 不会被自动加载（无 index.ts）
```

只加载包含 `index.ts` 的子目录。
