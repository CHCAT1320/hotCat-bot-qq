# Message

消息段构建器，用于构造发送内容。搭配 `bot.api.sendMessage()` / `bot.api.sendGroupMessage()` 等方法使用。

## 收发支持

| 类型 | 发送 | 接收 | 说明 |
|------|:----:|:----:|------|
| `text` | ✅ | ✅ | 文本 |
| `at` | ✅ | ✅ | @某人 / @全体 |
| `atAll` | ✅ | — | @全体成员 |
| `reply` | ✅ | ✅ | 引用回复 |
| `face` | ✅ | ✅ | QQ 表情 |
| `image` | ✅ | ✅ | 图片 |
| `file` | ✅ | ✅ | 文件 |
| `video` | ✅ | ✅ | 视频 |
| `record` | ✅ | ✅ | 语音 |
| `json` | ✅ | ✅ | JSON 消息段 |
| `dice` | ✅ | ✅ | 骰子 |
| `rps` | ✅ | ✅ | 猜拳 |
| `markdown` | ✅ | ✅ | Markdown |
| `forward` | ✅ | ✅ | 合并转发 |
| `mface` | ✅ | — | 商城表情（收归入 image） |
| `music` | ✅ | — | 音乐分享 |
| `customMusic` | ✅ | — | 自定义音乐 |
| `node` | ✅ | — | 合并转发节点 |
| `customNode` | ✅ | — | 自定义转发节点 |
| `contact` | ✅ | — | 推荐联系人/群 |
| `poke` | — | ✅ | 戳一戳（仅接收） |

## 基础

### Message.text(text)
```ts
static text(text: string): Message
```

### Message.at(qq)
```ts
static at(qq: string | number): Message
```

### Message.atAll()
```ts
static atAll(): Message
```
@全体成员。

### Message.reply(id)
```ts
static reply(id: string | number): Message
```
引用回复，传消息 ID。

## 媒体

### Message.image(file, summary?, sub_type?)
```ts
static image(file: string | Buffer, summary?: string, sub_type?: string | number): Message
```
图片，`file` 支持本地路径 / URL / Buffer。

### Message.video(file, name?, thumb?)
```ts
static video(file: string | Buffer, name?: string, thumb?: string): Message
```

### Message.record(file, name?, thumb?)
```ts
static record(file: string | Buffer, name?: string, thumb?: string): Message
```

### Message.file(file, name?)
```ts
static file(file: string | Buffer, name?: string): Message
```

## 互动

### Message.face(id)
```ts
static face(id: string | number): Message
```
QQ 表情，传表情 ID。

### Message.mface(emoji_id, emoji_package_id, key, summary?)
```ts
static mface(emoji_id: string | number, emoji_package_id: string | number, key: string, summary?: string): Message
```
商城表情（仅发送）。

### Message.dice()
```ts
static dice(): Message
```

### Message.rps()
```ts
static rps(): Message
```

## 结构化

### Message.json(data)
```ts
static json(data: string): Message
```

### Message.markdown(content)
```ts
static markdown(content: string): Message
```

### Message.music(type, id)
```ts
static music(type: 'qq' | '163' | 'kugou' | 'migu' | 'kuwo', id: string | number): Message
```
平台音乐分享。

### Message.customMusic(type, url, image, audio?, title?, singer?)
```ts
static customMusic(
    type: 'qq' | '163' | 'kugou' | 'migu' | 'kuwo' | 'custom',
    url: string,
    image: string,
    audio?: string,
    title?: string,
    singer?: string
): Message
```
自定义音乐分享，需签名服务器。

## 转发

### Message.forward(message_id)
```ts
static forward(message_id: number): Message
```
合并转发，传消息 ID。

### Message.node(id, user_id?, nickname?, ...)
```ts
static node(
    id: string | number,
    user_id?: string | number,
    nickname?: string,
    source?: string,
    news?: { text: string }[],
    summary?: string,
    prompt?: string,
    time?: string | number
): Message
```
合并转发节点（引用已有消息）。

### Message.customNode(content, user_id?, nickname?, ...)
```ts
static customNode(
    content: Message[],
    user_id?: string | number,
    nickname?: string,
    ...
): Message
```
合并转发节点（自定义内容）。

## 其他

### Message.contact(type, id)
```ts
static contact(type: 'qq' | 'group', id: string | number): Message
```
推荐联系人/群（仅发送）。

### Message.from(seg)
```ts
static from(seg: { type: string; data: Record<string, any> }): Message
```
从 napcat 接收的 message 段还原为 Message，用于消息回显。支持 text/at/image/file/poke/dice/rps/face/reply/video/record/forward/json/markdown。

## 实例方法

### toJson()
```ts
toJson(): { type: string; data: Record<string, any> }
```
转为 napcat API 所需的 JSON 格式。

### toCQ()
```ts
toCQ(): string
```
转为 CQ 码字符串。`Message.text('hello')` → `"hello"`，`Message.at(123)` → `"[CQ:at,qq=123]"`。

## 使用示例

### 发送混合消息

```ts
import { Message } from 'hotcat-bot-qq'

// 回复 + @ + 复读
await bot.api.sendGroupMessage(12345678,
    Message.reply(event.message_id),
    Message.text('你发了: '),
    ...event.message.map(seg => Message.from(seg))
)

// 文本 + 图片
await bot.api.sendGroupMessage(12345678,
    Message.text('看这张图:'),
    Message.image('https://example.com/img.png')
)
```

### 合并转发

`Message.node()` 引用已有的某条消息作为转发节点，`Message.customNode()` 自定义节点内容。

```ts
// ─── 方式一：引用已有消息 ───

// 把收到的消息作为转发节点
const node = Message.node(
    event.message_id,         // 要引用的消息 ID
    event.user_id,            // 消息发送者的 QQ
    event.sender.nickname,    // 消息发送者的昵称
)

// 发送合并转发
await bot.api.sendGroupForwardMsg(12345678, [node])


// ─── 方式二：自定义内容 ───

// 构造自定义节点的消息内容
const content1 = [
    Message.text('你好，这是一条转发消息'),
    Message.image('https://example.com/img.png'),
]
const content2 = [
    Message.text('这是另一条转发消息'),
    Message.face(333),
]

// 创建转发节点（user_id 决定头像，nickname 决定昵称，都用 bot 自身信息）
const node1 = Message.customNode(
    content1,
    bot.id!,        // 决定头像显示
    bot.nickname!,  // 决定昵称显示
)
const node2 = Message.customNode(
    content2,
    bot.id!,
    bot.nickname!,
)

// 一次性发送多个节点（显示为多条转发消息）
await bot.api.sendGroupForwardMsg(12345678, [node1, node2])


// ─── 方式三：混合使用 ───

// 引用 + 自定义混合
const refNode = Message.node(event.message_id, event.user_id, event.sender.nickname)
const customNode = Message.customNode(
    [Message.text('混合转发示例')],
    bot.id!,          // 使用 bot 自己的 QQ 和昵称
    bot.nickname!,
)

await bot.api.sendGroupForwardMsg(12345678, [refNode, customNode])
```

:::warning 不要伪造他人消息
`customNode()` 中 `user_id` 决定转发消息的**头像**，`nickname` 决定**昵称**。两者独立控制。

- 比如 `customNode([...], 111222333, '张三')`：转发里出现**张三的头像** + "张三"，群友会以为是张三本人说的话，造成**误导**。
- **请使用 bot 自身信息**（`bot.id` / `bot.nickname`），让头像和昵称明确来自 bot。
- 如需展示**真实用户的真实消息**，使用 `node()` 引用实际存在的消息 ID。
:::
