# API 总览

HotCat Bot 所有公共 API 按类组织：

| 类 | 访问方式 | 说明 |
|---|---|---|
| [BotClient](/api/bot-client) | `new BotClient(config)` | Bot 客户端，封装连接和启动 |
| [BotApi](/api/bot-api) | `bot.api.xxx()` | 所有 napcat API 的统一封装 |
| [BotEvent](/api/bot-event) | `bot.event.xxx()` | 事件监听，按类别分组 |
| [Message](/api/message) | `Message.xxx()` | 消息段构建器 |

## 架构

```
BotClient
 ├── api: BotApi          → bot.api.sendGroupMessage(...)
 │    └── napcat: NCWebsocket   (底层 napcat 实例)
 ├── event: BotEvent      → bot.event.message.onGroupMessage(...)
 │    ├── message: MessageEvent       (收到的消息)
 │    ├── messageSent: MessageSent    (发出的消息回执)
 │    ├── request: RequestEvent       (加好友/加群请求)
 │    └── notice: NoticeEvent         (通知事件)
 ├── nickname: string     (bot 昵称)
 └── id: number           (bot QQ 号)
```

## 快速索引

### BotApi 方法分类

| 分类 | 方法数 | 常用方法 |
|---|---|---|
| 消息发送 | 10 | `sendMessage`, `sendGroupMessage`, `sendPrivateMessage`, `sendForwardMsg` |
| 消息管理 | 12 | `deleteMessage`, `getMessage`, `markMsgAsRead`, `translateEn2zh` |
| 群管理 | 12 | `banMember`, `kickMember`, `setGroupAdmin`, `setGroupCard` |
| 群公告 | 3 | `sendGroupNotice`, `getGroupNotice`, `deleteGroupNotice` |
| 群信息 | 10 | `getGroupInfo`, `getGroupMemberList`, `getGroupHonorInfo` |
| 精华消息 | 3 | `getEssenceMsgList`, `setEssenceMsg`, `deleteEssenceMsg` |
| 用户/好友 | 8 | `getFriendList`, `getStrangerInfo`, `deleteFriend` |
| 群互动 | 5 | `groupPoke`, `friendPoke`, `sendLike`, `sendPoke` |
| 文件/资源 | 9 | `getImage`, `getRecord`, `uploadGroupFile`, `ocrImage` |
| 群文件 | 6 | `getGroupRootFiles`, `createGroupFileFolder` |
| 收藏 | 2 | `createCollection`, `getCollectionList` |
| AI | 3 | `getAiCharacters`, `sendGroupAiRecord` |
| 系统 | 13 | `getStatus`, `getCookies`, `setQQProfile` |
| 推荐 | 2 | `recommendContact`, `recommendGroup` |
| 小程序 | 1 | `getMiniAppArk` |

### BotEvent 事件分类

| 分类 | 属性 | 事件数 |
|---|---|---|
| 接收消息 | `bot.event.message` | 6 |
| 发送回执 | `bot.event.messageSent` | 6 |
| 请求 | `bot.event.request` | 4 |
| 通知 | `bot.event.notice` | 16 |
