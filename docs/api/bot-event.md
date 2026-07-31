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

### onGroupMessage(fn)
```ts
onGroupMessage(fn: (bot: BotClient, event: GroupMessage) => any): void
```
监听所有群消息。

### onGroupNormal(fn)
```ts
onGroupNormal(fn: (bot: BotClient, event: GroupMessage) => any): void
```
仅监听普通群消息（细粒度）。

### onPrivateMessage(fn)
```ts
onPrivateMessage(fn: (bot: BotClient, event: PrivateMessage) => any): void
```
监听所有私聊消息（好友 + 群临时）。

### onPrivateFriend(fn)
```ts
onPrivateFriend(fn: (bot: BotClient, event: PrivateMessage) => any): void
```
仅监听好友私聊（细粒度）。

### onPrivateGroup(fn)
```ts
onPrivateGroup(fn: (bot: BotClient, event: PrivateMessage) => any): void
```
仅监听群临时私聊（细粒度）。

## MessageSent

```ts
bot.event.messageSent.xxx()
```

> bot **发出**消息的回执事件，可用于确认消息发送成功。

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

## RequestEvent

```ts
bot.event.request.xxx()
```

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

## NoticeEvent

```ts
bot.event.notice.xxx()
```

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
群表情回应。

### onGroupEssence(fn)
```ts
onGroupEssence(fn: (bot: BotClient, event: GroupEssenceAdd | GroupEssenceDelete) => any): void
```
群设精/取消。`event.sub_type` 区分 `'add'` / `'delete'`。

### onPoke(fn)
```ts
onPoke(fn: (bot: BotClient, event: NotifyPokeFriend | NotifyPokeGroup) => any): void
```
戳一戳（好友/群）。

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
个人资料被点赞。

### onBotOffline(fn)
```ts
onBotOffline(fn: (bot: BotClient, event: BotOffline) => any): void
```
bot 离线。
