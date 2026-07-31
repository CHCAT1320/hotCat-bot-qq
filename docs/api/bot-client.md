# BotClient

Bot 客户端，封装 WebSocket 连接、启动流程及 bot 自身信息。

## 构造函数

```ts
new BotClient(config: BotConfig)
```

### BotConfig

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `baseUrl` | `string` | 是 | NapCat WebSocket 地址 |
| `accessToken` | `string` | 否 | 访问令牌 |
| `reconnection.enable` | `boolean` | 否 | 是否自动重连，默认 true |
| `reconnection.attempts` | `number` | 否 | 重连次数，默认 10 |
| `reconnection.delay` | `number` | 否 | 重连间隔(ms)，默认 5000 |
| `apiTimeout` | `number` | 否 | API 超时(ms)，默认 120000 |

## 属性

| 属性 | 类型 | 说明 |
|---|---|---|
| `api` | `BotApi` | API 调用入口 |
| `event` | `BotEvent` | 事件监听入口 |
| `scheduler` | `BotScheduler` | 定时任务入口 |
| `nickname` | `string \| null` | 登录后 bot 昵称，启动前为 null |
| `id` | `number \| null` | 登录后 bot QQ 号，启动前为 null |

## 方法

### start()

```ts
async start(): Promise<void>
```

连接 napcat 并初始化。启动成功后自动填充 `nickname` 和 `id`。

## 使用示例

```ts
import { BotClient } from 'hotcat-bot-qq'

const bot = new BotClient({
    baseUrl: 'ws://localhost:8082/onebot/v11/ws/',
    accessToken: 'your-access-token',
    reconnection: {
        enable: true,
        attempts: 10,
        delay: 5000,
    },
})
await bot.start()

console.log(bot.nickname) // "MyBot"
console.log(bot.id)       // 123456789
```
