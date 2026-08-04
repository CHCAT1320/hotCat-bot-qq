# BotEvent

事件监听入口，通过 `bot.event` 访问，按类别分组。

## 架构

```
bot.event
├── message: MessageEvent       ← 收到的消息
├── messageSent: MessageSent    ← 发出的消息回执
├── request: RequestEvent       ← 加好友/加群请求
└── notice: NoticeEvent         ← 通知事件
```

---

## MessageEvent

```ts
bot.event.message.xxx()
```

### 事件字段

所有消息事件共享 `MessageType` 的 `message` 字段（消息段数组），每条消息段为 `{ type: string; data: Record<string, any> }`。其余字段因事件类型而异。

#### GroupMessage（群消息）

监听 `message.group` / `message.group.normal`。

| 字段 | 类型 | 说明 |
|------|------|------|
| `self_id` | `number` | bot 自身 QQ 号 |
| `user_id` | `number` | 发送者 QQ 号 |
| `time` | `number` | 消息时间戳（Unix） |
| `message_id` | `number` | 消息 ID |
| `message_seq` | `number` | 消息序号 |
| `real_id` | `number` | 真实消息 ID |
| `message_type` | `'group'` | 消息类型 |
| `sender.user_id` | `number` | 发送者 QQ 号 |
| `sender.nickname` | `string` | 发送者昵称 |
| `sender.card` | `string` | 发送者群名片 |
| `sender.role` | `'owner' \| 'admin' \| 'member'` | 发送者群身份 |
| `raw_message` | `string` | 原始消息文本 |
| `font` | `number` | 字体 |
| `sub_type` | `'normal'` | 子类型 |
| `post_type` | `'message'` | 事件类型 |
| `group_id` | `number` | 群号 |
| `message` | `MessageSegment[]` | 消息段数组 |

#### PrivateFriendMessage（好友私聊消息）

监听 `message.private.friend`。

| 字段 | 类型 | 说明 |
|------|------|------|
| `self_id` | `number` | bot 自身 QQ 号 |
| `user_id` | `number` | 发送者 QQ 号 |
| `time` | `number` | 消息时间戳 |
| `message_id` | `number` | 消息 ID |
| `message_seq` | `number` | 消息序号 |
| `real_id` | `number` | 真实消息 ID |
| `message_type` | `'private'` | 消息类型 |
| `sender.user_id` | `number` | 发送者 QQ 号 |
| `sender.nickname` | `string` | 发送者昵称 |
| `sender.card` | `string` | 发送者名片 |
| `raw_message` | `string` | 原始消息文本 |
| `font` | `number` | 字体 |
| `sub_type` | `'friend'` | 子类型（好友私聊） |
| `post_type` | `'message'` | 事件类型 |
| `message` | `MessageSegment[]` | 消息段数组 |

#### PrivateGroupMessage（群临时私聊消息）

监听 `message.private.group`。

| 字段 | 类型 | 说明 |
|------|------|------|
| `self_id` | `number` | bot 自身 QQ 号 |
| `user_id` | `number` | 发送者 QQ 号 |
| `time` | `number` | 消息时间戳 |
| `message_id` | `number` | 消息 ID |
| `message_seq` | `number` | 消息序号 |
| `real_id` | `number` | 真实消息 ID |
| `message_type` | `'private'` | 消息类型 |
| `sender.user_id` | `number` | 发送者 QQ 号 |
| `sender.nickname` | `string` | 发送者昵称 |
| `sender.card` | `string` | 发送者名片 |
| `raw_message` | `string` | 原始消息文本 |
| `font` | `number` | 字体 |
| `sub_type` | `'group'` | 子类型（群临时会话） |
| `post_type` | `'message'` | 事件类型 |
| `message` | `MessageSegment[]` | 消息段数组 |

### onGroupMessage(fn)
```ts
onGroupMessage(fn: (bot: BotClient, event: GroupMessage) => any): void
```
监听所有群消息。

### onGroupNormal(fn)
```ts
onGroupNormal(fn: (bot: BotClient, event: GroupMessage) => any): void
```
仅监听普通群消息（细粒度，等价于 `onGroupMessage`）。

### onPrivateMessage(fn)
```ts
onPrivateMessage(fn: (bot: BotClient, event: PrivateMessage) => any): void
```
监听所有私聊消息（好友 + 群临时）。

### onPrivateFriend(fn)
```ts
onPrivateFriend(fn: (bot: BotClient, event: PrivateMessage) => any): void
```
仅监听好友私聊（细粒度），`event.sub_type === 'friend'`。

### onPrivateGroup(fn)
```ts
onPrivateGroup(fn: (bot: BotClient, event: PrivateMessage) => any): void
```
仅监听群临时私聊（细粒度），`event.sub_type === 'group'`。

:::tip 事件清理
每个 `onXxx(fn)` 都有对应的 `offXxx(fn)`，传入**相同的函数引用**即可移除。用于插件 `unload()` 中清理事件。
:::

---

## MessageSent

```ts
bot.event.messageSent.xxx()
```

> bot **发出**的消息回执事件，可用于确认消息发送成功。

### 事件字段

与 MessageEvent 对应，`post_type` 为 `'message_sent'`。

#### GroupMessageSelf（群消息发送回执）

监听 `message_sent.group` / `message_sent.group.normal`。

| 字段 | 类型 | 说明 |
|------|------|------|
| `self_id` | `number` | bot 自身 QQ 号 |
| `user_id` | `number` | bot 自身 QQ 号 |
| `time` | `number` | 消息时间戳 |
| `message_id` | `number` | 消息 ID |
| `message_seq` | `number` | 消息序号 |
| `real_id` | `number` | 真实消息 ID |
| `message_type` | `'group'` | 消息类型 |
| `sender.user_id` | `number` | bot 自身 QQ 号 |
| `sender.nickname` | `string` | bot 昵称 |
| `sender.card` | `string` | bot 群名片 |
| `sender.role` | `'owner' \| 'admin' \| 'member'` | bot 群身份 |
| `raw_message` | `string` | 原始消息文本 |
| `font` | `number` | 字体 |
| `sub_type` | `'normal'` | 子类型 |
| `post_type` | `'message_sent'` | 事件类型 |
| `group_id` | `number` | 群号 |
| `message` | `MessageSegment[]` | 消息段数组 |

#### PrivateFriendMessageSelf（好友私聊发送回执）

监听 `message_sent.private.friend`。

| 字段 | 类型 | 说明 |
|------|------|------|
| `self_id` | `number` | bot 自身 QQ 号 |
| `user_id` | `number` | 目标用户 QQ 号 |
| `time` | `number` | 消息时间戳 |
| `message_id` | `number` | 消息 ID |
| `message_seq` | `number` | 消息序号 |
| `real_id` | `number` | 真实消息 ID |
| `message_type` | `'private'` | 消息类型 |
| `sender.user_id` | `number` | bot 自身 QQ 号 |
| `sender.nickname` | `string` | bot 昵称 |
| `sender.card` | `string` | bot 名片 |
| `raw_message` | `string` | 原始消息文本 |
| `font` | `number` | 字体 |
| `sub_type` | `'friend'` | 子类型 |
| `post_type` | `'message_sent'` | 事件类型 |
| `message` | `MessageSegment[]` | 消息段数组 |

#### PrivateGroupMessageSelf（群临时私聊发送回执）

监听 `message_sent.private.group`。

| 字段 | 类型 | 说明 |
|------|------|------|
| `self_id` | `number` | bot 自身 QQ 号 |
| `user_id` | `number` | 目标用户 QQ 号 |
| `time` | `number` | 消息时间戳 |
| `message_id` | `number` | 消息 ID |
| `message_seq` | `number` | 消息序号 |
| `real_id` | `number` | 真实消息 ID |
| `message_type` | `'private'` | 消息类型 |
| `sender.user_id` | `number` | bot 自身 QQ 号 |
| `sender.nickname` | `string` | bot 昵称 |
| `sender.card` | `string` | bot 名片 |
| `raw_message` | `string` | 原始消息文本 |
| `font` | `number` | 字体 |
| `sub_type` | `'group'` | 子类型 |
| `post_type` | `'message_sent'` | 事件类型 |
| `message` | `MessageSegment[]` | 消息段数组 |

### onGroupSent(fn)
```ts
onGroupSent(fn: (bot: BotClient, event: GroupMessageSelf) => any): void
```
群消息发送回执。

### onGroupNormal(fn)
```ts
onGroupNormal(fn: (bot: BotClient, event: GroupMessageSelf) => any): void
```
群消息发送回执（细粒度，仅普通消息）。

### onPrivateSent(fn)
```ts
onPrivateSent(fn: (bot: BotClient, event: PrivateMessageSelf) => any): void
```
私聊消息发送回执。

### onPrivateFriend(fn)
```ts
onPrivateFriend(fn: (bot: BotClient, event: PrivateFriendMessageSelf) => any): void
```
好友私聊发送回执（细粒度）。

### onPrivateGroup(fn)
```ts
onPrivateGroup(fn: (bot: BotClient, event: PrivateGroupMessageSelf) => any): void
```
群临时私聊发送回执（细粒度）。

> 每个 `onXxx(fn)` 都有对应的 `offXxx(fn)`。

---

## RequestEvent

```ts
bot.event.request.xxx()
```

### 事件字段

#### RequestFriend（加好友请求）

| 字段 | 类型 | 说明 |
|------|------|------|
| `time` | `number` | 请求时间戳 |
| `self_id` | `number` | bot 自身 QQ 号 |
| `post_type` | `'request'` | 事件类型 |
| `request_type` | `'friend'` | 请求类型 |
| `user_id` | `number` | 请求者 QQ 号 |
| `comment` | `string` | 验证消息/留言 |
| `flag` | `string` | 请求标记（用于 `handleFriendAddRequest`） |

#### RequestGroupAdd（加群请求）

| 字段 | 类型 | 说明 |
|------|------|------|
| `time` | `number` | 请求时间戳 |
| `self_id` | `number` | bot 自身 QQ 号 |
| `post_type` | `'request'` | 事件类型 |
| `request_type` | `'group'` | 请求类型 |
| `sub_type` | `'add'` | 子类型 |
| `group_id` | `number` | 群号 |
| `user_id` | `number` | 申请者 QQ 号 |
| `comment` | `string` | 加群留言 |
| `flag` | `string` | 请求标记（用于 `handleGroupAddRequest`） |

#### RequestGroupInvite（邀请入群）

| 字段 | 类型 | 说明 |
|------|------|------|
| `time` | `number` | 邀请时间戳 |
| `self_id` | `number` | bot 自身 QQ 号 |
| `post_type` | `'request'` | 事件类型 |
| `request_type` | `'group'` | 请求类型 |
| `sub_type` | `'invite'` | 子类型 |
| `group_id` | `number` | 群号 |
| `user_id` | `number` | 邀请者 QQ 号 |
| `comment` | `string` | 邀请留言 |
| `flag` | `string` | 请求标记 |

### onFriend(fn)
```ts
onFriend(fn: (bot: BotClient, event: RequestFriend) => any): void
```
加好友请求。`event.flag` 可传给 `bot.api.handleFriendAddRequest()`。

### onGroupAdd(fn)
```ts
onGroupAdd(fn: (bot: BotClient, event: RequestGroupAdd) => any): void
```
加群请求。`event.flag` 可传给 `bot.api.handleGroupAddRequest()`。

### onGroupInvite(fn)
```ts
onGroupInvite(fn: (bot: BotClient, event: RequestGroupInvite) => any): void
```
邀请入群。

### onGroupRequest(fn)
```ts
onGroupRequest(fn: (bot: BotClient, event: RequestGroup) => any): void
```
所有群请求（加群 + 邀请），`event.sub_type` 区分 `'add'` / `'invite'`。

> 每个 `onXxx(fn)` 都有对应的 `offXxx(fn)`。

---

## NoticeEvent

```ts
bot.event.notice.xxx()
```

### 事件字段

#### FriendAdd（好友添加成功）

| 字段 | 类型 | 说明 |
|------|------|------|
| `time` | `number` | 时间戳 |
| `self_id` | `number` | bot 自身 QQ 号 |
| `post_type` | `'notice'` | 事件类型 |
| `notice_type` | `'friend_add'` | 通知类型 |
| `user_id` | `number` | 添加的好友 QQ 号 |

#### FriendRecall（私聊消息撤回）

| 字段 | 类型 | 说明 |
|------|------|------|
| `time` | `number` | 时间戳 |
| `self_id` | `number` | bot 自身 QQ 号 |
| `post_type` | `'notice'` | 事件类型 |
| `notice_type` | `'friend_recall'` | 通知类型 |
| `user_id` | `number` | 消息发送者 QQ 号 |
| `message_id` | `number` | 被撤回的消息 ID |

#### GroupAdminSet / GroupAdminUnset（群管理员变动）

| 字段 | 类型 | 说明 |
|------|------|------|
| `time` | `number` | 时间戳 |
| `self_id` | `number` | bot 自身 QQ 号 |
| `post_type` | `'notice'` | 事件类型 |
| `notice_type` | `'group_admin'` | 通知类型 |
| `sub_type` | `'set' \| 'unset'` | `'set'` 设置管理员 / `'unset'` 取消管理员 |
| `group_id` | `number` | 群号 |
| `user_id` | `number` | 被操作的用户 QQ 号 |

#### GroupBanBan / GroupBanLiftBan（群禁言变动）

| 字段 | 类型 | 说明 |
|------|------|------|
| `time` | `number` | 时间戳 |
| `self_id` | `number` | bot 自身 QQ 号 |
| `post_type` | `'notice'` | 事件类型 |
| `notice_type` | `'group_ban'` | 通知类型 |
| `sub_type` | `'ban' \| 'lift_ban'` | `'ban'` 禁言 / `'lift_ban'` 解除禁言 |
| `group_id` | `number` | 群号 |
| `user_id` | `number` | 被操作的用户 QQ 号 |
| `operator_id` | `number` | 操作者 QQ 号 |
| `duration` | `number` | 禁言时长（秒），`lift_ban` 时为 0 |

#### GroupCard（群名片变更）

| 字段 | 类型 | 说明 |
|------|------|------|
| `time` | `number` | 时间戳 |
| `self_id` | `number` | bot 自身 QQ 号 |
| `post_type` | `'notice'` | 事件类型 |
| `notice_type` | `'group_card'` | 通知类型 |
| `group_id` | `number` | 群号 |
| `user_id` | `number` | 变更的用户 QQ 号 |
| `card_old` | `string` | 旧群名片 |
| `card_new` | `string` | 新群名片 |

#### GroupDecreaseLeave / GroupDecreaseKick / GroupDecreaseKickMe（群成员减少）

| 字段 | 类型 | 说明 |
|------|------|------|
| `time` | `number` | 时间戳 |
| `self_id` | `number` | bot 自身 QQ 号 |
| `post_type` | `'notice'` | 事件类型 |
| `notice_type` | `'group_decrease'` | 通知类型 |
| `sub_type` | `'leave' \| 'kick' \| 'kick_me'` | `'leave'` 主动退群 / `'kick'` 被踢 / `'kick_me'` bot 被踢 |
| `group_id` | `number` | 群号 |
| `user_id` | `number` | 离开/被踢的用户 QQ 号 |
| `operator_id` | `number` | 操作者 QQ 号（`leave` 时为用户自身） |

#### GroupIncreaseApprove / GroupIncreaseInvite（群成员增加）

| 字段 | 类型 | 说明 |
|------|------|------|
| `time` | `number` | 时间戳 |
| `self_id` | `number` | bot 自身 QQ 号 |
| `post_type` | `'notice'` | 事件类型 |
| `notice_type` | `'group_increase'` | 通知类型 |
| `sub_type` | `'approve' \| 'invite'` | `'approve'` 管理员同意入群 / `'invite'` 邀请入群 |
| `group_id` | `number` | 群号 |
| `user_id` | `number` | 新成员 QQ 号 |
| `operator_id` | `number` | 操作者 QQ 号 |

#### GroupRecall（群消息撤回）

| 字段 | 类型 | 说明 |
|------|------|------|
| `time` | `number` | 时间戳 |
| `self_id` | `number` | bot 自身 QQ 号 |
| `post_type` | `'notice'` | 事件类型 |
| `notice_type` | `'group_recall'` | 通知类型 |
| `group_id` | `number` | 群号 |
| `user_id` | `number` | 消息发送者 QQ 号 |
| `operator_id` | `number` | 撤回操作者 QQ 号 |
| `message_id` | `number` | 被撤回的消息 ID |

#### GroupUpload（群文件上传）

| 字段 | 类型 | 说明 |
|------|------|------|
| `time` | `number` | 时间戳 |
| `self_id` | `number` | bot 自身 QQ 号 |
| `post_type` | `'notice'` | 事件类型 |
| `notice_type` | `'group_upload'` | 通知类型 |
| `group_id` | `number` | 群号 |
| `user_id` | `number` | 上传者 QQ 号 |
| `file.id` | `string` | 文件 ID |
| `file.name` | `string` | 文件名 |
| `file.size` | `number` | 文件大小（字节） |
| `file.busid` | `number` | 文件 busid |

#### GroupMsgEmojiLike（群表情回应）

| 字段 | 类型 | 说明 |
|------|------|------|
| `time` | `number` | 时间戳 |
| `self_id` | `number` | bot 自身 QQ 号 |
| `post_type` | `'notice'` | 事件类型 |
| `notice_type` | `'group_msg_emoji_like'` | 通知类型 |
| `group_id` | `number` | 群号 |
| `user_id` | `number` | 回应者 QQ 号 |
| `message_id` | `number` | 被回应的消息 ID |
| `likes` | `{ emoji_id: string; count: number }[]` | 表情回应列表 |

#### GroupEssenceAdd / GroupEssenceDelete（群精华消息）

| 字段 | 类型 | 说明 |
|------|------|------|
| `time` | `number` | 时间戳 |
| `self_id` | `number` | bot 自身 QQ 号 |
| `post_type` | `'notice'` | 事件类型 |
| `notice_type` | `'essence'` | 通知类型 |
| `sub_type` | `'add' \| 'delete'` | `'add'` 设精 / `'delete'` 取消 |
| `group_id` | `number` | 群号 |
| `user_id` | `number` | 操作者 QQ 号 |
| `sender_id` | `number` | 消息发送者 QQ 号 |
| `message_id` | `number` | 精华消息 ID |

#### NotifyPokeFriend / NotifyPokeGroup（戳一戳）

| 字段 | 类型 | 说明 |
|------|------|------|
| `time` | `number` | 时间戳 |
| `self_id` | `number` | bot 自身 QQ 号 |
| `post_type` | `'notice'` | 事件类型 |
| `notice_type` | `'notify'` | 通知类型 |
| `sub_type` | `'poke'` | 子类型 |
| `user_id` | `number` | 发送戳一戳的用户 QQ 号 |
| `target_id` | `number` | 被戳的目标 QQ 号 |
| `group_id` | `number` | 群号（仅 `NotifyPokeGroup`） |

> 用 `'group_id' in event` 判断是群戳一戳还是好友戳一戳。

#### NotifyGroupName（群名称变更）

| 字段 | 类型 | 说明 |
|------|------|------|
| `time` | `number` | 时间戳 |
| `self_id` | `number` | bot 自身 QQ 号 |
| `post_type` | `'notice'` | 事件类型 |
| `notice_type` | `'notify'` | 通知类型 |
| `sub_type` | `'group_name'` | 子类型 |
| `group_id` | `number` | 群号 |
| `user_id` | `number` | 操作者 QQ 号 |
| `name_new` | `string` | 新群名称 |

#### NotifyTitle（群头衔变更）

| 字段 | 类型 | 说明 |
|------|------|------|
| `time` | `number` | 时间戳 |
| `self_id` | `number` | bot 自身 QQ 号 |
| `post_type` | `'notice'` | 事件类型 |
| `notice_type` | `'notify'` | 通知类型 |
| `sub_type` | `'title'` | 子类型 |
| `group_id` | `number` | 群号 |
| `user_id` | `number` | 被授予头衔的用户 QQ 号 |
| `title` | `string` | 新头衔文本 |

#### NotifyProfileLike（个人资料被点赞）

| 字段 | 类型 | 说明 |
|------|------|------|
| `time` | `number` | 时间戳 |
| `self_id` | `number` | bot 自身 QQ 号 |
| `post_type` | `'notice'` | 事件类型 |
| `notice_type` | `'notify'` | 通知类型 |
| `sub_type` | `'profile_like'` | 子类型 |
| `operator_id` | `number` | 点赞者 QQ 号 |
| `operator_nick` | `string` | 点赞者昵称 |

#### BotOffline（bot 离线）

| 字段 | 类型 | 说明 |
|------|------|------|
| `time` | `number` | 时间戳 |
| `self_id` | `number` | bot 自身 QQ 号 |
| `post_type` | `'notice'` | 事件类型 |
| `notice_type` | `'bot_offline'` | 通知类型 |
| `user_id` | `number` | bot 自身 QQ 号 |
| `tag` | `string` | 离线原因标签 |
| `message` | `string` | 离线描述信息 |

### 监听方法列表

### onFriendAdd(fn)
```ts
onFriendAdd(fn: (bot: BotClient, event: FriendAdd) => any): void
```
好友添加成功。

### onFriendRecall(fn)
```ts
onFriendRecall(fn: (bot: BotClient, event: FriendRecall) => any): void
```
私聊消息被撤回。

### onGroupAdmin(fn)
```ts
onGroupAdmin(fn: (bot: BotClient, event: GroupAdminSet | GroupAdminUnset) => any): void
```
群管理员变动，`event.sub_type` 区分 `'set'` / `'unset'`。

### onGroupBan(fn)
```ts
onGroupBan(fn: (bot: BotClient, event: GroupBanBan | GroupBanLiftBan) => any): void
```
群禁言变动，`event.sub_type` 区分 `'ban'` / `'lift_ban'`。

### onGroupCard(fn)
```ts
onGroupCard(fn: (bot: BotClient, event: GroupCard) => any): void
```
群名片变更。事件包含 `card_old` 和 `card_new`。

### onGroupDecrease(fn)
```ts
onGroupDecrease(fn: (bot: BotClient, event: GroupDecreaseLeave | GroupDecreaseKick | GroupDecreaseKickMe) => any): void
```
群成员减少。`event.sub_type` 区分 `'leave'` / `'kick'` / `'kick_me'`。

### onGroupIncrease(fn)
```ts
onGroupIncrease(fn: (bot: BotClient, event: GroupIncreaseApprove | GroupIncreaseInvite) => any): void
```
群成员增加。`event.sub_type` 区分 `'approve'` / `'invite'`。

### onGroupRecall(fn)
```ts
onGroupRecall(fn: (bot: BotClient, event: GroupRecall) => any): void
```
群消息被撤回。`event.operator_id` 是操作者，`event.user_id` 是发送者。

### onGroupUpload(fn)
```ts
onGroupUpload(fn: (bot: BotClient, event: GroupUpload) => any): void
```
群文件上传。`event.file` 包含 `{ id, name, size }`。

### onGroupEmojiLike(fn)
```ts
onGroupEmojiLike(fn: (bot: BotClient, event: GroupMsgEmojiLike) => any): void
```
群表情回应。`event.likes` 为表情回应数组，每项含 `emoji_id` 和 `count`。

### onGroupEssence(fn)
```ts
onGroupEssence(fn: (bot: BotClient, event: GroupEssenceAdd | GroupEssenceDelete) => any): void
```
群设精/取消。`event.sub_type` 区分 `'add'` / `'delete'`。`event.sender_id` 为消息发送者，`event.user_id` 为操作者。

### onPoke(fn)
```ts
onPoke(fn: (bot: BotClient, event: NotifyPokeFriend | NotifyPokeGroup) => any): void
```
戳一戳（好友/群）。用 `'group_id' in event` 判断来源。

### onGroupNameChange(fn)
```ts
onGroupNameChange(fn: (bot: BotClient, event: NotifyGroupName) => any): void
```
群名称变更。`event.name_new` 为新名称。

### onTitleChange(fn)
```ts
onTitleChange(fn: (bot: BotClient, event: NotifyTitle) => any): void
```
群头衔变更。`event.title` 为新头衔。

### onProfileLike(fn)
```ts
onProfileLike(fn: (bot: BotClient, event: NotifyProfileLike) => any): void
```
个人资料被点赞。`event.operator_id` 为点赞者，`event.operator_nick` 为点赞者昵称。

### onBotOffline(fn)
```ts
onBotOffline(fn: (bot: BotClient, event: BotOffline) => any): void
```
bot 离线。`event.tag` 和 `event.message` 包含离线原因。

> 每个 `onXxx(fn)` 都有对应的 `offXxx(fn)`。
