---
title: MessageContext 消息上下文
description: HotCat Bot 的 MessageContext 便捷封装：自动判断群聊/私聊，提供 reply、send、at、recall、isOwner、isAdmin 等常用能力。
---

# MessageContext

通过 `bot.context(event)` 获取，用于简化回复、发送、撤回和权限判断。

```ts
bot.event.message.onGroupMessage(async (bot, event) => {
    const ctx = bot.context(event)
    if (ctx.text === 'ping') await ctx.reply(Message.text('pong'))
})
```

## 属性

| 属性 | 类型 | 说明 |
|---|---|---|
| `isGroup` | `boolean` | 是否群聊消息 |
| `groupId` | `number \| undefined` | 群号 |
| `userId` | `number \| undefined` | 发送者 QQ 号 |
| `messageId` | `number \| undefined` | 消息 ID |
| `isOwner` | `boolean` | 是否为配置的 bot 主人 |
| `isAdmin` | `boolean` | 群主/群管理，私聊中仅主人 |
| `text` | `string` | 消息中的纯文本 |

## 方法

### reply(...messages)

```ts
await ctx.reply(Message.text('收到'))
```

引用回复当前消息；群聊/私聊自动判断。

### send(...messages)

```ts
await ctx.send(Message.text('处理完成'))
```

发送到当前会话，不引用。

### at()

```ts
await ctx.reply(ctx.at(), Message.text('你好'))
```

返回 `@发送者` 的消息段。

### recall(messageId?)

撤回指定消息，默认当前消息。

```ts
await ctx.reply(Message.text('收到'))
await ctx.recall()
```
