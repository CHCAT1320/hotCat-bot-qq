# BotScheduler

定时任务调度器，通过 `bot.scheduler` 访问。支持 cron 表达式、间隔时间、指定时间三种模式。

## 方法

### cron(expr, fn)

```ts
cron(expr: string, fn: () => void): number
```

标准 cron 表达式定时，返回 job id 可用于取消。

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

### every(time, fn)

```ts
every(time: number | string, fn: () => void): number
```

固定间隔重复执行。支持数字（毫秒）或可读字符串。

| 格式 | 示例 | 含义 |
|---|---|---|
| 毫秒 | `60000` | 60 秒 |
| 秒 | `'30s'` `'30sec'` `'30second'` | 30 秒 |
| 分钟 | `'5m'` `'5min'` `'5minute'` | 5 分钟 |
| 小时 | `'1h'` `'1hr'` `'1hour'` | 1 小时 |
| 天 | `'2d'` `'2day'` | 2 天 |

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

### at(time, fn)

```ts
at(time: string | Date, fn: () => void): number
```

指定时间执行。`'08:00'` 格式为每日重复，`'YYYY-MM-DD HH:mm'` 或 `Date` 为一次性。

```ts
// 每天 8:00
bot.scheduler.at('08:00', () => { ... })

// 一次性（指定日期时间）
bot.scheduler.at('2026-08-01 12:00', () => { ... })

// Date 对象
bot.scheduler.at(new Date('2026-08-01T12:00:00'), () => { ... })
```

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
cancelAll(): void
```

取消全部定时任务。

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
