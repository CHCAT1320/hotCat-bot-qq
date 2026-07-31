# 快速开始

## 环境要求

- [Bun](https://bun.sh) >= 1.0
- [NapCat](https://github.com/NapNeko/NapCatQQ) 已安装并运行
- NapCat WebSocket 服务已启用（默认端口 `8082`）

## 安装

::: code-group
```bash [npm]
npm add hotcat-bot-qq
```

```bash [pnpm]
pnpm add hotcat-bot-qq
```

```bash [bun]
bun add hotcat-bot-qq
```
:::

## 配置

创建一个入口文件 `bot.ts`：

```ts
import { BotClient, Message } from 'hotcat-bot-qq'

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
```

## 启动

```bash
bun bot.ts
```

启动成功后控制台输出：

```
[hotCatBotSystem]:  napcat服务器连接成功
[hotCatBotSystem]:  bot启动成功，昵称: MyBot, 用户ID: 123456789
```

## 基础用法

- [监听群消息](#监听群消息)
- [监听私聊消息](#监听私聊消息)
- [发送消息](#发送消息)
- [撤回消息](#撤回消息)
- [禁言](#禁言)
- [定时任务](#定时任务)
- [处理加好友请求](#处理加好友请求)
- [处理加群邀请](#处理加群邀请)
- [常用模式](#常用模式)

### 监听群消息

```ts
bot.event.message.onGroupMessage(async (bot, event) => {
    // 只处理指定群
    if (event.group_id !== 12345678) return

    // 回复消息
    await bot.api.sendGroupMessage(event.group_id,
        Message.reply(event.message_id),
        Message.at(event.user_id),
        Message.text(' 收到消息: '),
        ...event.message.map(seg => Message.from(seg))
    )
})
```

### 监听私聊消息

```ts
bot.event.message.onPrivateMessage(async (bot, event) => {
    await bot.api.sendPrivateMessage(event.user_id,
        Message.text('你好，有什么可以帮你的？')
    )
})
```

### 发送消息

```ts
// 群聊
await bot.api.sendGroupMessage(12345678,
    Message.text('Hello'),
    Message.image('./test.png'),
    Message.at(111222333)
)

// 私聊
await bot.api.sendMessage({ user_id: 111222333 },
    Message.text('你好')
)
```

### 撤回消息

```ts
bot.event.message.onGroupMessage(async (bot, event) => {
    if (event.raw_message === '撤回') {
        await bot.api.deleteMessage(event.message_id)
    }
})
```

### 禁言

```ts
// 禁言 60 秒
await bot.api.banMember(groupId, userId, 60)

// 解除禁言
await bot.api.banMember(groupId, userId, 0)
```

### 处理加好友请求

```ts
bot.event.request.onFriend(async (bot, event) => {
    // 同意
    await bot.api.handleFriendAddRequest(event.flag, true)
})
```

### 处理加群邀请

```ts
bot.event.request.onGroupInvite(async (bot, event) => {
    // 同意
    await bot.api.handleGroupAddRequest(event.flag, true)
})
```

### 定时任务

```ts
// 每天 8:00 早安
bot.scheduler.cron('0 8 * * *', () => {
    bot.api.sendGroupMessage(12345678, Message.text('早上好'))
})

// 每 5 分钟执行
bot.scheduler.every('5m', () => {
    console.log('定时检查...')
})

// 指定时刻（一次性）
bot.scheduler.at('23:59', () => {
    bot.api.sendGroupMessage(12345678, Message.text('晚安'))
})
```

## 常用模式

### 关键词回复

```ts
bot.event.message.onGroupMessage(async (bot, event) => {
    const msg = event.raw_message.trim()

    if (msg === '/ping') {
        await bot.api.sendGroupMessage(event.group_id,
            Message.reply(event.message_id),
            Message.text('pong!')
        )
    }

    if (msg.startsWith('/echo ')) {
        const text = msg.slice(6)
        await bot.api.sendGroupMessage(event.group_id, Message.text(text))
    }
})
```

### 仅群主/管理可用

```ts
bot.event.message.onGroupMessage(async (bot, event) => {
    if (event.raw_message === '/admin') {
        if (event.sender.role !== 'owner' && event.sender.role !== 'admin') {
            await bot.api.sendGroupMessage(event.group_id,
                Message.reply(event.message_id),
                Message.text('仅群主/管理员可用')
            )
            return
        }
        await bot.api.sendGroupMessage(event.group_id, Message.text('管理员你好'))
    }
})
```

### 撤回含敏感词的消息

```ts
const blocked = ['广告', '违规词']

bot.event.message.onGroupMessage(async (bot, event) => {
    if (blocked.some(w => event.raw_message.includes(w))) {
        await bot.api.deleteMessage(event.message_id)
        await bot.api.sendGroupMessage(event.group_id,
            Message.at(event.user_id),
            Message.text(' 消息包含违规内容，已撤回')
        )
    }
})
```

### 欢迎新成员

```ts
bot.event.notice.onGroupIncrease(async (bot, event) => {
    await bot.api.sendGroupMessage(event.group_id,
        Message.at(event.user_id),
        Message.text(' 欢迎入群！')
    )
})
```

### 自动同意加好友

```ts
bot.event.request.onFriend(async (bot, event) => {
    await bot.api.handleFriendAddRequest(event.flag, true, '自动通过')
})
```

## 下一步

- 查看 [API 参考](/api/) 了解完整 API
- 查看 [Message 消息段](/api/message) 了解所有消息类型
- 查看 [BotEvent 事件](/api/bot-event) 了解所有事件监听
- 查看 [BotScheduler 定时任务](/api/bot-scheduler) 了解 cron / 间隔 / 指定时间
- 查看 [插件开发指南](/guide/plugin-dev) 开始写自己的插件
