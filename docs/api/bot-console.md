---
title: BotConsole - 控制台日志输出
description: HotCat Bot 的 BotConsole 控制台日志工具，支持 system、error、plugin 等分类输出，以及 colors、parseCQ、formatMessage、formatError 等辅助方法，可在插件或外部模块中直接调用。
---

# BotConsole

控制台日志输出工具，包根直接导出，可在插件、入口文件或其他模块中使用。

```ts
import { BotConsole } from 'hotcat-bot-qq'

new BotConsole('system', '启动完成').log()
new BotConsole('error', '连接失败').log()
```

## 构造函数

```ts
new BotConsole(type: BotConsoleType, content: ...)
```

| 类型 | content | 输出示例 |
|---|---|---|
| `system` | `string` | `[hotCatBotSystem]: 启动完成` |
| `error` | `string` | `[error] 连接失败` |
| `plugin` | `{ name: string; msg: string }` | `[plugin:myPlugin]: 已加载` |

`groupMessage`、`privateMessage`、`notice` 等类型供框架内部格式化事件使用，需要传入对应事件对象，外部一般使用 `system` / `error` / `plugin`。

## log()

```ts
new BotConsole('plugin', { name: 'myPlugin', msg: '已加载' }).log()
```

输出到 `stdout`，返回 `void`。日志会清理控制字符，JSON、图片、文件等内容不做长度截断。

## 辅助导出

```ts
import { colors, parseCQ, formatMessage, formatError } from 'hotcat-bot-qq'

colors.green      // ANSI 颜色码
parseCQ('[CQ:at,qq=123]')        // '[@123]'
formatMessage(Message.text('hi')) // 带颜色的消息段字符串
formatError(new Error('boom'))    // 'boom'，循环引用对象也不会抛错
```

`formatMessage` 接受 `Message` 实例；`formatError` 可安全格式化未知异常。类型 `BotConsoleType`、`PrivateMessage`、`NoticeEvent` 等也可从包根导入。
