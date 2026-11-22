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
import { BotClient, Message } from 'hotcat-bot-qq'

const bot = new BotClient({
    baseUrl: 'ws://localhost:8082/onebot/v11/ws/',
    accessToken: 'your-access-token',
    owner: 123456789, // 必填：bot 主人（管理员）QQ 号
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
- **定时任务** — `BotScheduler` 支持 cron、固定间隔、指定时间、时区、防重叠、重试和命名任务持久化
- **插件系统** — 继承 `PluginBase` 即可开发插件，支持真实热重载、依赖、启用/禁用、独立配置与存储
- **命令系统** — 内置命令解析、中间件、权限和冷却，快速实现管理指令
- **连接状态** — 自动重连 NapCat，检测 bot QQ 掉线，提供 `bot.status` / `onStatusChange`
- **优雅退出** — `bot.stop()` 统一卸载插件、取消任务并断开连接，支持 SIGINT/SIGTERM
- **数据存储** — `BotStorage` JSON 键值存储，支持命名空间隔离
- **日志工具** — `BotConsole` 支持级别、时间戳、文件轮转、JSON Lines 和错误上报回调

## 文档

完整文档 → [框架开发文档](https://hotcat-bot-qq.docs.chcat1320.top)

交流群：638144340
## 协议

MIT © CHCAT1320
