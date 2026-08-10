# HotCat Bot

基于 [node-napcat-ts](https://github.com/HkTeamX/node-napcat-ts) 的 TypeScript QQ 机器人框架。

<p align="center">
  <img src="logo.png" width="120" alt="HotCat Bot Logo">
</p>

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
import { BotClient } from './botClient'
import { Message } from './message'

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
- **事件系统** — `BotEvent` 按类别分组暴露 message/messageSent/request/notice 事件
- **定时任务** — `BotScheduler` 支持 cron 表达式、固定间隔、指定时间
- **插件系统** — 继承 `PluginBase` 即可开发插件，支持热重载、目录监听自动加载，`scan` + `watch` 零配置接入

## 文档

完整文档 → [框架开发文档](https://hotcat-bot-qq.docs.chcat1320.top)

交流群638144340
## 协议

MIT © CHCAT1320
