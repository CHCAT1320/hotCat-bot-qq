---
title: BotScheduler 定时任务 API
description: HotCat Bot 的 BotScheduler 定时任务调度器参考：通过 bot.scheduler 使用 cron 表达式、every 固定间隔、at 指定时刻三种模式创建任务，并提供 cancel 与 cancelAll 取消接口，附常用 cron 表达式示例。
---

# BotScheduler

定时任务调度器，通过 `bot.scheduler` 访问。支持 cron 表达式、间隔时间、指定时间三种模式。

支持异步回调；回调抛出的同步异常和 Promise 拒绝都会被捕获并通过控制台输出，不会导致进程退出。支持时区、防止任务重叠、失败重试，以及命名任务持久化。

## 任务选项

```ts
interface JobOptions {
    name?: string
    timezone?: string
    noOverlap?: boolean
    retry?: { attempts?: number; delay?: number }
}
```

| 选项 | 说明 |
|---|---|
| `name` | 任务名，设置后可持久化 |
| `timezone` | cron 时区，如 `Asia/Shanghai` |
| `noOverlap` | 上次未执行完时跳过本次，默认 false |
| `retry.attempts` | 总执行次数（包含第一次），默认 1 |
| `retry.delay` | 重试间隔(ms)，默认 1000 |

## 方法

### cron(expr, fn, options?)

```ts
cron(expr: string, fn: () => void | Promise<void>, options?: JobOptions): number
```

标准 cron 表达式定时，返回 job id 可用于取消。无效表达式不会创建任务，并输出错误日志。

| 表达式 | 含义 |
|---|---|
| `0 8 * * *` | 每天 8:00 |
| `*/30 * * * *` | 每 30 分钟 |
| `0 0 * * 1` | 每周一 0:00 |
| `0 0 1 * *` | 每月 1 号 0:00 |

```ts
// 每天早上 8 点发早安
bot.scheduler.cron('0 8 * * *', () => {
    bot.api.sendGroupMessage(12345678, Message.text('早上好'))
})

// 每 30 分钟执行一次
bot.scheduler.cron('*/30 * * * *', () => {
    console.log('定时任务执行')
})
```

### every(time, fn, options?)

```ts
every(time: number | string, fn: () => void | Promise<void>, options?: JobOptions): number
```

固定间隔重复执行。支持数字（毫秒）或可读字符串。

| 格式 | 示例 | 含义 |
|---|---|---|
| 毫秒 | `60000` `'500ms'` | 60 秒 / 500 毫秒 |
| 秒 | `'30s'` `'30sec'` `'30second'` | 30 秒 |
| 分钟 | `'5m'` `'5min'` `'5minute'` | 5 分钟 |
| 小时 | `'1h'` `'1hr'` `'1hour'` | 1 小时 |
| 天 | `'2d'` `'2day'` | 2 天 |

间隔无效时不会创建任务，并输出错误日志。

```ts
// 每 30 秒执行
bot.scheduler.every('30s', () => console.log('tick'))

// 每 5 分钟
bot.scheduler.every('5m', () => { ... })

// 每 1 小时
bot.scheduler.every('1h', () => { ... })

// 毫秒
bot.scheduler.every(60000, () => { ... })
```

### at(time, fn, options?)

```ts
at(time: string | Date, fn: () => void | Promise<void>, options?: JobOptions): number
```

指定时间执行。`'08:00'` 格式为每日重复，`'YYYY-MM-DD HH:mm'` 或 `Date` 为一次性。无效日期不会创建任务，并输出错误日志；远期日期使用 `node-schedule` 调度，不受 `setTimeout` 上限影响。

```ts
// 每天 8:00
bot.scheduler.at('08:00', () => { ... })

// 一次性（指定日期时间）
bot.scheduler.at('2026-08-01 12:00', () => { ... })

// Date 对象
bot.scheduler.at(new Date('2026-08-01T12:00:00'), () => { ... })
```

### define(name, handler)

```ts
define(name: string, handler: () => void | Promise<void>): this
```

注册命名任务处理器，供 `restore()` 还原持久化任务使用。

### schedule(name, kind, spec, options?)

```ts
schedule(name: string, kind: 'cron' | 'every' | 'at', spec: string | number | Date, options?: JobOptions): number
```

调度命名任务并写入存储，进程重启后可通过 `restore()` 还原。

```ts
bot.scheduler.define('daily', () => { ... })
bot.scheduler.schedule('daily', 'cron', '0 8 * * *', { timezone: 'Asia/Shanghai' })
```

### restore()

```ts
restore(): number
```

读取存储中的命名任务并重新调度，返回成功数量。`bot.start()` 会在插件加载后自动调用。

### listJobs()

```ts
listJobs(): JobDefinition[]
```

返回可持久化的命名任务定义列表。

### cancel(id)

```ts
cancel(id: number): void
```

取消指定任务。

```ts
const id = bot.scheduler.cron('* * * * *', () => { ... })
bot.scheduler.cancel(id)
```

### cancelAll()

```ts
cancelAll(clearPersisted?: boolean): void
```

取消全部定时任务。`clearPersisted` 为 true 时同时删除持久化定义，默认 false。

## 完整示例

```ts
import { BotClient, Message } from 'hotcat-bot-qq'

const bot = new BotClient({ ... })
await bot.start()

// 每天 8:00 早安
bot.scheduler.cron('0 8 * * *', () => {
    bot.api.sendGroupMessage(12345678, Message.text('早上好'))
})

// 每 5 分钟检查一次
bot.scheduler.every('5m', async () => {
    const status = await bot.api.getStatus()
    console.log('Bot 状态:', status)
})

// 指定日期执行一次
bot.scheduler.at('2026-12-31 23:59', () => {
    bot.api.sendGroupMessage(12345678, Message.text('新年快乐！'))
})
```
