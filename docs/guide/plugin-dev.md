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
        // TODO: 移除事件监听
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

`load` 中注册的事件必须在 `unload` 中用 `off()` 移除，否则重载后会残留旧监听器：

```ts
async load() {
    this.api.napcat.on('message.group', this.onGroupMsg)
}

async unload() {
    this.api.napcat.off('message.group', this.onGroupMsg)
}

private onGroupMsg = async (event: any) => {
    // ...
}
```

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
