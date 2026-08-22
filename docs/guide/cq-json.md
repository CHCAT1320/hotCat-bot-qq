# CQ 码与 JSON 互转

HotCat Bot 的消息既可以用 OneBot/NapCat 的 JSON 消息段表示，也可以用 CQ 码字符串表示。框架通过 `Message` 统一构造和转换消息，适合在事件处理、消息回显和兼容旧接口时使用。

## 两种格式

JSON 消息段是一个 `{ type, data }` 对象。例如 @ 用户：

```json
{
  "type": "at",
  "data": {
    "qq": "123456"
  }
}
```

相同内容的 CQ 码是：

```text
[CQ:at,qq=123456]
```

文本消息在 CQ 码中不需要 `[CQ:text]` 标记，直接使用文本内容：

```text
你好
```

## JSON 转 CQ 码

使用 `Message.from()` 还原 JSON 消息段，再调用 `toCQ()`：

```ts
import { Message } from 'hotcat-bot-qq'

const segment = {
    type: 'at',
    data: { qq: '123456' },
}

const cq = Message.from(segment).toCQ()
console.log(cq) // [CQ:at,qq=123456]
```

文本、图片和混合消息也可以转换：

```ts
const text = Message.from({
    type: 'text',
    data: { text: '你好，' },
}).toCQ()

const image = Message.from({
    type: 'image',
    data: { file: 'https://example.com/image.png' },
}).toCQ()

const message = [
    Message.text('你好，'),
    Message.at(123456),
    Message.text('，请查看图片'),
    Message.image('https://example.com/image.png'),
]

const cqMessage = message.map(item => item.toCQ()).join('')
console.log(cqMessage)
// 你好，
// [CQ:at,qq=123456]
// ，请查看图片
// [CQ:image,file=https://example.com/image.png,sub_type=0]
```

如果要得到 JSON 消息段而不是 CQ 字符串，调用 `toJson()`：

```ts
const json = Message.at(123456).toJson()
console.log(json)
// { type: 'at', data: { qq: '123456' } }
```

## CQ 码转 JSON

收到的 NapCat 事件已经包含 JSON 消息段，可以直接用 `Message.from()` 转为 `Message`，再通过 `toJson()` 取得标准 JSON：

```ts
const received = event.message[0]
const message = Message.from(received)
const json = message.toJson()
```

如果手里只有 CQ 码字符串，先将 CQ 码拆成消息段，再交给 `Message.from()`。下面的示例支持文本和常见的 `key=value` 参数，并处理 CQ 转义：

```ts
import { Message } from 'hotcat-bot-qq'

const cqUnescape = (value: string) => value
    .replace(/&#44;/g, ',')
    .replace(/&#91;/g, '[')
    .replace(/&#93;/g, ']')
    .replace(/&amp;/g, '&')

const splitParams = (value: string) => {
    const result: string[] = []
    let current = ''

    for (let i = 0; i < value.length; i++) {
        if (value.startsWith('&#44;', i)) {
            current += '&#44;'
            i += 4
        } else if (value[i] === ',') {
            result.push(current)
            current = ''
        } else {
            current += value[i]
        }
    }

    result.push(current)
    return result
}

const cqToMessages = (raw: string): Message[] => {
    const messages: Message[] = []
    const pattern = /\[CQ:([^,\]]+)((?:,[^\]]*)?)\]/g
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = pattern.exec(raw))) {
        if (match.index > lastIndex) {
            messages.push(Message.text(cqUnescape(raw.slice(lastIndex, match.index))))
        }

        const data: Record<string, string> = {}
        for (const item of splitParams(match[2].replace(/^,/, ''))) {
            if (!item) continue
            const separator = item.indexOf('=')
            if (separator < 0) continue
            data[item.slice(0, separator)] = cqUnescape(item.slice(separator + 1))
        }

        messages.push(Message.from({ type: match[1], data }))
        lastIndex = pattern.lastIndex
    }

    if (lastIndex < raw.length) {
        messages.push(Message.text(cqUnescape(raw.slice(lastIndex))))
    }

    return messages
}

const messages = cqToMessages('你好，[CQ:at,qq=123456]')
const jsonSegments = messages.map(message => message.toJson())
console.log(jsonSegments)
// [
//   { type: 'text', data: { text: '你好，' } },
//   { type: 'at', data: { qq: '123456' } }
// ]
```

> 上面的解析器适合处理常见 CQ 码。复杂的嵌套 JSON、转发节点或特定平台扩展字段，应优先使用 NapCat 事件提供的 `event.message`，避免从字符串中重复解析。

## 在事件和发送中使用

### 回显收到的 JSON 消息

```ts
bot.event.message.onGroupMessage(async (bot, event) => {
    const messages = event.message.map(segment => Message.from(segment))
    await bot.api.sendGroupMessage(event.group_id, ...messages)
})
```

### 将消息记录为 CQ 码

```ts
const cq = event.message
    .map(segment => Message.from(segment).toCQ())
    .join('')

console.log(cq)
```

### 使用 CQ 码发送

发送 API 接受的是 `Message` 实例。把 CQ 码转换为消息段后再发送：

```ts
const messages = cqToMessages('回复 [CQ:at,qq=123456]')
await bot.api.sendGroupMessage(12345678, ...messages)
```

## 转义规则

CQ 参数中的 `&`、`[`、`]` 和 `,` 必须转义，否则会被误认为参数或消息段边界。`Message.toCQ()` 会自动处理这些字符：

```ts
const cq = Message.text('a,b [c] & d').toCQ()
console.log(cq) // a&#44;b &#91;c&#93; &amp; d
```

手动拼接 CQ 码时也必须遵守相同规则；更推荐使用 `Message.text()`、`Message.at()`、`Message.image()` 等构造方法，避免参数未转义导致解析错误。
