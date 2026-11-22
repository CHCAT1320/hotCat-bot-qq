---
title: BotCommandSystem 命令系统
description: HotCat Bot 的命令系统：支持前缀解析、中间件、权限、冷却、别名和命令作用域。
---

# BotCommandSystem

通过 `bot.command` 访问。命令系统会自动监听群聊和私聊消息。

```ts
bot.command.command('ping', async (ctx) => {
    await ctx.reply(Message.text('pong'))
})
```

默认前缀为 `#`，可通过 `commandPrefix` 配置修改。

## 方法

### command(names, handler, options?)

```ts
command(names: string | string[], handler: (ctx: CommandContext) => unknown, options?: CommandOptions): this
```

注册命令，`names` 第一个为主命令，其余为别名。

| 选项 | 说明 |
|---|---|
| `description` | 命令描述 |
| `permission` | `everyone` / `owner` / `admin`，默认 everyone |
| `cooldown` | 冷却时间(ms) |
| `scope` | `all` / `group` / `private` |

```ts
bot.command.command(['ban', 'b'], handler, {
    permission: 'admin',
    cooldown: 3000,
    scope: 'group',
})
```

### use(middleware)

注册全局中间件，按顺序执行。中间件不调用 `next()` 即可拦截。

```ts
bot.command.use(async (ctx, next) => {
    if (!ctx.isOwner) return
    await next()
})
```

### remove(name)

移除命令及其别名。

### list()

返回已注册命令列表。

### attach()

开始监听消息事件，`bot.start()` 会自动调用。

### detach()

停止监听消息事件，`bot.stop()` 会自动调用。

## CommandContext

继承 [MessageContext](/api/bot-context)，额外提供：

| 属性 | 说明 |
|---|---|
| `command` | 命中的主命令名 |
| `args` | 参数数组 |
| `argText` | 参数字符串 |
| `rawText` | 原始文本 |
