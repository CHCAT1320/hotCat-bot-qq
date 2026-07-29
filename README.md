# HotCat Bot

基于 [node-napcat-ts](https://github.com/HkTeamX/node-napcat-ts) 的 TypeScript QQ 机器人框架。

## 安装

```bash
npm add hotcat-bot-qq
# or
pnpm add hotcat-bot-qq
# or
bun add hotcat-bot-qq
```

## 快速开始

```ts
import { BotClient, Message } from 'hotcat-bot-qq'

const bot = new BotClient({
    baseUrl: 'ws://localhost:8082/onebot/v11/ws/',
    accessToken: 'your-access-token',
})
await bot.start()

bot.event.message.onGroupMessage(async (bot, event) => {
    await bot.api.sendGroupMessage(event.group_id,
        Message.reply(event.message_id),
        Message.text('pong!')
    )
})
```

## 特性

- **类型安全** — 完整的 TypeScript 类型推导，封装 napcat 全部 API
- **消息段构建** — `Message` 类支持文本、图片、表情、文件等所有消息类型
- **彩色日志** — 内置 `BotConsole` 控制台日志，自动解析 CQ 码
- **事件系统** — `BotEvent` 按类别分组暴露 message/messageSent/request/notice 事件

## 文档

完整文档 → [hotcat-bot-qq.docs.chcat1320.top](https://hotcat-bot-qq.docs.chcat1320.top)

快速开始 → [docs/guide/getting-started.md](docs/guide/getting-started.md)

## 协议

MIT © CHCAT1320
