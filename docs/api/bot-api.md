# BotApi

所有 napcat API 的统一封装，通过 `bot.api.xxx()` 调用。

## 消息发送

### sendMessage(target, ...messages)
```ts
async sendMessage(
    target: { group_id: number } | { user_id: number },
    ...messages: Message[]
): Promise<void>
```
通用发送，根据 target 自动判断群聊/私聊。
```ts
await bot.api.sendMessage({ group_id: 12345678 }, Message.text('hello'))
await bot.api.sendMessage({ user_id: 111222333 }, Message.image('./test.png'))
```

### sendGroupMessage(groupId, ...messages)
```ts
async sendGroupMessage(groupId: number, ...messages: Message[]): Promise<void>
```
发送群聊消息。

### sendPrivateMessage(userId, ...messages)
```ts
async sendPrivateMessage(userId: number, ...messages: Message[]): Promise<void>
```
发送私聊消息。

### sendForwardMsg(target, nodes)
```ts
async sendForwardMsg(
    target: { group_id: number } | { user_id: number },
    nodes: Message[]
): Promise<void>
```
发送合并转发（通用），`nodes` 由 `Message.node()` / `Message.customNode()` 构建。
```ts
const node = Message.node(event.message_id, event.user_id, event.sender.nickname)
await bot.api.sendForwardMsg({ group_id: 12345678 }, [node])
```

### sendGroupForwardMsg(groupId, nodes)
```ts
async sendGroupForwardMsg(groupId: number, nodes: Message[]): Promise<void>
```
发送群合并转发。

### sendPrivateForwardMsg(userId, nodes)
```ts
async sendPrivateForwardMsg(userId: number, nodes: Message[]): Promise<void>
```
发送私聊合并转发。

### forwardFriendSingleMsg(userId, messageId)
```ts
async forwardFriendSingleMsg(userId: number, messageId: number): Promise<void>
```
转发单条消息到私聊。

### forwardGroupSingleMsg(groupId, messageId)
```ts
async forwardGroupSingleMsg(groupId: number, messageId: number): Promise<void>
```
转发单条消息到群聊。

## 消息管理

### deleteMessage(messageId)
```ts
async deleteMessage(messageId: number): Promise<void>
```
撤回消息。

### getMessage(messageId)
```ts
async getMessage(messageId: number): Promise<object>
```
获取单条消息详情。

### getForwardMsg(messageId)
```ts
async getForwardMsg(messageId: number): Promise<object>
```
获取合并转发消息。

### getGroupMsgHistory(groupId, messageSeq?, count?)
```ts
async getGroupMsgHistory(groupId: number, messageSeq?: number, count?: number): Promise<object>
```
获取群聊历史消息。`messageSeq` 为起始消息序号。

### getFriendMsgHistory(userId, messageSeq?, count?)
```ts
async getFriendMsgHistory(userId: number, messageSeq?: number, count?: number): Promise<object>
```
获取私聊消息历史。

### markMsgAsRead(target)
```ts
async markMsgAsRead(target: { group_id: number } | { user_id: number } | { message_id: number }): Promise<void>
```
标记消息已读，支持群聊/私聊/单条消息三种方式。

### markPrivateMsgAsRead(userId)
```ts
async markPrivateMsgAsRead(userId: number): Promise<void>
```

### markGroupMsgAsRead(groupId)
```ts
async markGroupMsgAsRead(groupId: number): Promise<void>
```

### markAllAsRead()
```ts
async markAllAsRead(): Promise<void>
```

### setMsgEmojiLike(messageId, emojiId, set?)
```ts
async setMsgEmojiLike(messageId: number, emojiId: string, set?: boolean): Promise<void>
```
设置消息表情回应，`set` 为 true 添加、false 移除。

### fetchEmojiLike(messageId, emojiId?)
```ts
async fetchEmojiLike(messageId: number, emojiId?: string): Promise<object>
```
拉取消息上的表情回应列表。

### translateEn2zh(words)
```ts
async translateEn2zh(words: string[]): Promise<object>
```
英译中翻译。

## 群管理

### banMember(groupId, userId, duration)
```ts
async banMember(groupId: number, userId: number, duration: number): Promise<void>
```
群内禁言，`duration` 为秒，0 解除。

### kickMember(groupId, userId, rejectAdd?)
```ts
async kickMember(groupId: number, userId: number, rejectAdd?: boolean): Promise<void>
```
踢出群成员，`rejectAdd` 拒绝再次入群。

### setGroupWholeBan(groupId, enable?)
```ts
async setGroupWholeBan(groupId: number, enable?: boolean): Promise<void>
```
全员禁言，`enable` 默认 true 开启。

### setGroupAdmin(groupId, userId, enable?)
```ts
async setGroupAdmin(groupId: number, userId: number, enable?: boolean): Promise<void>
```
设置/取消管理员，`enable` 默认 true 设为管理。

### setGroupCard(groupId, userId, card)
```ts
async setGroupCard(groupId: number, userId: number, card: string): Promise<void>
```
修改群昵称（群名片）。

### setGroupName(groupId, groupName)
```ts
async setGroupName(groupId: number, groupName: string): Promise<void>
```
修改群名称。

### setGroupRemark(groupId, remark)
```ts
async setGroupRemark(groupId: number, remark: string): Promise<void>
```
设置群备注名（仅 bot 本地可见）。

### setGroupSpecialTitle(groupId, userId, title)
```ts
async setGroupSpecialTitle(groupId: number, userId: number, title: string): Promise<void>
```
设置群成员专属头衔。

### leaveGroup(groupId, isDismiss?)
```ts
async leaveGroup(groupId: number, isDismiss?: boolean): Promise<void>
```
退出群聊。群主传 `isDismiss: true` 可解散群。

### handleGroupAddRequest(flag, approve?, reason?)
```ts
async handleGroupAddRequest(flag: string, approve?: boolean, reason?: string): Promise<void>
```
处理加群申请。`flag` 来自 `bot.event.request.onGroupAdd()` 事件。

### setGroupPortrait(groupId, file)
```ts
async setGroupPortrait(groupId: number, file: string): Promise<void>
```
设置群头像，`file` 支持本地路径、base64 或 URL。

### sendGroupSign(groupId)
```ts
async sendGroupSign(groupId: number): Promise<void>
```
群打卡签到。

## 群公告

### sendGroupNotice(groupId, title, content)
```ts
async sendGroupNotice(groupId: number, title: string, content: string): Promise<void>
```

### getGroupNotice(groupId)
```ts
async getGroupNotice(groupId: number): Promise<object>
```

### deleteGroupNotice(groupId, noticeId)
```ts
async deleteGroupNotice(groupId: number, noticeId: string): Promise<void>
```
删除指定群公告。

## 群信息查询

### getGroupInfo(groupId)
```ts
async getGroupInfo(groupId: number): Promise<object>
```
获取群基本信息。

### getGroupInfoEx(groupId)
```ts
async getGroupInfoEx(groupId: number): Promise<object>
```
获取群额外信息（含全体禁言、群容量等扩展字段）。

### getGroupList(noCache?)
```ts
async getGroupList(noCache?: boolean): Promise<object>
```
获取 bot 加入的群列表。

### getGroupMemberInfo(groupId, userId, noCache?)
```ts
async getGroupMemberInfo(groupId: number, userId: number, noCache?: boolean): Promise<object>
```
获取指定群成员的详细信息。

### getGroupMemberList(groupId, noCache?)
```ts
async getGroupMemberList(groupId: number, noCache?: boolean): Promise<object>
```
获取群成员列表。

### getGroupHonorInfo(groupId, type?)
```ts
async getGroupHonorInfo(groupId: number, type?: 'all' | 'talkative' | 'performer' | 'legend' | 'strong_newbie' | 'emotion'): Promise<object>
```
获取群荣誉信息（龙王、群聊之火等）。

### getGroupSystemMsg(count?)
```ts
async getGroupSystemMsg(count?: number): Promise<object>
```
获取群系统消息。

### getGroupAtAllRemain(groupId)
```ts
async getGroupAtAllRemain(groupId: number): Promise<object>
```
获取群 @全体成员 剩余次数。

### getGroupShutList(groupId)
```ts
async getGroupShutList(groupId: number): Promise<object>
```
获取群被禁言用户列表。

### getGroupIgnoreAddRequest(groupId)
```ts
async getGroupIgnoreAddRequest(groupId: number): Promise<object>
```
获取群忽略的加群请求列表。

## 精华消息

### getEssenceMsgList(groupId)
```ts
async getEssenceMsgList(groupId: number): Promise<object>
```
获取群精华消息列表。

### setEssenceMsg(messageId)
```ts
async setEssenceMsg(messageId: number): Promise<void>
```
设为精华消息。

### deleteEssenceMsg(messageId)
```ts
async deleteEssenceMsg(messageId: number): Promise<void>
```
取消精华消息。

## 用户 / 好友

### getLoginInfo()
```ts
async getLoginInfo(): Promise<{ user_id: number; nickname: string }>
```
获取 bot 自身登录信息（昵称和 QQ 号）。启动时自动调用，结果存入 `bot.nickname` 和 `bot.id`。

### getStrangerInfo(userId)
```ts
async getStrangerInfo(userId: number): Promise<object>
```
获取陌生人信息。

### getFriendList()
```ts
async getFriendList(): Promise<object>
```
获取好友列表。

### getFriendsWithCategory()
```ts
async getFriendsWithCategory(): Promise<object>
```
获取好友列表（含分组信息）。

### deleteFriend(userId, tempBlock?, tempBothDel?)
```ts
async deleteFriend(userId: number, tempBlock?: boolean, tempBothDel?: boolean): Promise<void>
```
删除好友。`tempBlock` 是否拉黑，`tempBothDel` 是否双向删除。

### handleFriendAddRequest(flag, approve?, remark?)
```ts
async handleFriendAddRequest(flag: string, approve?: boolean, remark?: string): Promise<void>
```
处理好友申请。`flag` 来自 `bot.event.request.onFriend()` 事件。

### getUserStatus(userId)
```ts
async getUserStatus(userId: number): Promise<object>
```
获取用户在线状态。

### setSelfLongnick(longnick)
```ts
async setSelfLongnick(longnick: string): Promise<void>
```
设置个人签名/长昵称。

## 群互动

### groupPoke(groupId, userId)
```ts
async groupPoke(groupId: number, userId: number): Promise<void>
```
群内戳一戳。

### friendPoke(userId)
```ts
async friendPoke(userId: number): Promise<void>
```
好友戳一戳。

### sendPoke(userId, groupId?)
```ts
async sendPoke(userId: number, groupId?: number): Promise<void>
```
通用戳一戳，传 `groupId` 为群内戳，不传为好友戳。

### sendLike(userId, times?)
```ts
async sendLike(userId: number, times?: number): Promise<void>
```
给好友点赞，`times` 默认 1 次。

## 文件 / 资源

### getImage(file)
```ts
async getImage(file: string): Promise<object>
```
获取图片文件数据，`file` 为消息中图片的 file_id 或 URL。

### getRecord(file, outFormat?)
```ts
async getRecord(file: string, outFormat?: 'mp3' | 'amr' | 'wma' | 'm4a' | 'spx' | 'ogg' | 'wav' | 'flac'): Promise<object>
```
获取语音文件，`outFormat` 可选输出格式。

### uploadGroupFile(groupId, file, name, folderId?)
```ts
async uploadGroupFile(groupId: number, file: string, name: string, folderId?: string): Promise<void>
```
上传文件到群。`file` 为本地路径，`folderId` 为目标文件夹。

### uploadPrivateFile(userId, file, name)
```ts
async uploadPrivateFile(userId: number, file: string, name: string): Promise<void>
```
上传私聊文件。

### getGroupFileUrl(groupId, fileId)
```ts
async getGroupFileUrl(groupId: number, fileId: string): Promise<object>
```
获取群文件下载链接。

### ocrImage(image)
```ts
async ocrImage(image: string): Promise<object>
```
图片 OCR 识别文字，`image` 为图片 file_id 或 base64。

### getFile(file)
```ts
async getFile(file: string): Promise<object>
```
获取文件信息，`file` 为 file_id。

### downloadFile(url, name?, headers?)
```ts
async downloadFile(url: string, name?: string, headers?: string[]): Promise<object>
```
下载文件到缓存目录。`name` 保存文件名，`headers` 请求头数组。

### fetchCustomFace(count?)
```ts
async fetchCustomFace(count?: number): Promise<object>
```
获取收藏表情列表。

## 群文件管理

### deleteGroupFile(groupId, fileId)
```ts
async deleteGroupFile(groupId: number, fileId: string): Promise<void>
```
删除群文件。

### createGroupFileFolder(groupId, folderName)
```ts
async createGroupFileFolder(groupId: number, folderName: string): Promise<void>
```
创建群文件夹。

### deleteGroupFolder(groupId, folderId)
```ts
async deleteGroupFolder(groupId: number, folderId: string): Promise<void>
```
删除群文件夹。

### getGroupFileSystemInfo(groupId)
```ts
async getGroupFileSystemInfo(groupId: number): Promise<object>
```
获取群文件系统信息（总空间、已用空间等）。

### getGroupRootFiles(groupId)
```ts
async getGroupRootFiles(groupId: number): Promise<object>
```
获取群根目录文件列表。

### getGroupFilesByFolder(groupId, folderId)
```ts
async getGroupFilesByFolder(groupId: number, folderId: string): Promise<object>
```
获取群子目录文件列表。

## 收藏

### createCollection(rawData, brief)
```ts
async createCollection(rawData: string, brief: string): Promise<void>
```
创建文本收藏。`rawData` 为内容，`brief` 为摘要。

### getCollectionList(category?, count?)
```ts
async getCollectionList(category?: number, count?: number): Promise<object>
```
获取收藏列表。

## 推荐 / 分享

### recommendContact(userId, phoneNumber?)
```ts
async recommendContact(userId: number, phoneNumber?: string): Promise<void>
```
推荐联系人/群聊名片给当前聊天。

### recommendGroup(groupId)
```ts
async recommendGroup(groupId: number): Promise<void>
```
推荐群聊名片。

## AI

### getAiCharacters()
```ts
async getAiCharacters(): Promise<object>
```
获取 AI 语音角色列表。

### getAiRecord(characterId, text)
```ts
async getAiRecord(characterId: string, text: string): Promise<object>
```
AI 文字转语音，返回音频数据。

### sendGroupAiRecord(groupId, characterId, text)
```ts
async sendGroupAiRecord(groupId: number, characterId: string, text: string): Promise<void>
```
群聊发送 AI 语音。

## 小程序

### getMiniAppArk(app, bizSrc, meta)
```ts
async getMiniAppArk(app: string, bizSrc: string, meta: any): Promise<object>
```
签名小程序卡片（如 B 站分享），返回可直接发送的 Ark 消息 JSON。

## 系统

### getStatus()
```ts
async getStatus(): Promise<object>
```
获取 bot 运行状态（在线/离线/Good）。

### getVersionInfo()
```ts
async getVersionInfo(): Promise<object>
```
获取 napcat 版本信息。

### getCookies(domain)
```ts
async getCookies(domain: string): Promise<object>
```
获取指定域名的 Cookies。

### getCsrfToken()
```ts
async getCsrfToken(): Promise<object>
```
获取 CSRF Token。

### getCredentials()
```ts
async getCredentials(): Promise<object>
```
获取 cookies + csrf_token（QQ 接口凭证）。

### canSendImage()
```ts
async canSendImage(): Promise<object>
```
检查是否可以发送图片。

### canSendRecord()
```ts
async canSendRecord(): Promise<object>
```
检查是否可以发送语音。

### cleanCache()
```ts
async cleanCache(): Promise<void>
```
清理缓存。

### getRkey()
```ts
async getRkey(): Promise<object>
```
获取 Rkey（用于资源访问鉴权）。

### getPacketStatus()
```ts
async getPacketStatus(): Promise<object>
```
获取 PacketServer 状态。

### getRobotUinRange()
```ts
async getRobotUinRange(): Promise<object>
```
获取机器人 QQ 号区间。

### setOnlineStatus(status, extStatus?, batteryStatus?)
```ts
async setOnlineStatus(status: number, extStatus?: number, batteryStatus?: number): Promise<void>
```
设置在线状态类型。

### setQQProfile(nickname, personalNote?, sex?)
```ts
async setQQProfile(nickname: string, personalNote?: string, sex?: number): Promise<void>
```
设置 bot QQ 个人资料（昵称、签名、性别）。

### setQQAvatar(file)
```ts
async setQQAvatar(file: string): Promise<void>
```
设置 bot QQ 头像，`file` 支持本地路径、base64 或 URL。

### setInputStatus(userId, eventType)
```ts
async setInputStatus(userId: number, eventType: number): Promise<void>
```
显示"正在输入…"状态。

### handleQuickOperation(context, operation)
```ts
async handleQuickOperation(context: any, operation: any): Promise<void>
```

对 napcat 事件执行"快速操作"，即在事件回调中**直接响应**，无需额外调用 `sendMessage` 等 API。

## 快速操作详解

napcat 收到消息/请求等事件时，每个事件对象自带一个 `quick_action()` 方法，允许你在事件处理函数中同步给出响应。`handleQuickOperation` 就是这个方法的底层调用。

### 对比

```ts
// ─── 方式 A：常规做法（两次 API 调用） ───
bot.event.request.onFriend(async (bot, event) => {
    await bot.api.handleFriendAddRequest(event.flag, true)  // 同意好友请求
    await bot.api.sendPrivateMessage(event.user_id, Message.text('你好！'))
})

// ─── 方式 B：快速操作（一次调用，原子响应） ───
bot.event.request.onFriend(async (bot, event) => {
    await bot.api.handleQuickOperation(event, {
        approve: true,                                      // 同意请求
        remark: '来自 HotCat Bot',                          // 设置好友备注
    })
})
```

### 常见操作对照

| 事件 | `operation` 字段 | 等价 API 调用 |
|---|---|---|
| `request.friend` | `{ approve: boolean }` | `handleFriendAddRequest(flag, approve)` |
| `request.group` | `{ approve: boolean, reason: string }` | `handleGroupAddRequest(flag, approve, reason)` |
| `message.group` | `{ reply: Message[] }` | `sendGroupMessage(group_id, ...)` |
| `message.group` | `{ reply: Message[], at_sender: boolean }` | `sendGroupMessage` + 自动 @ 发送者 |
| `message.private` | `{ reply: Message[] }` | `sendPrivateMessage(user_id, ...)` |

### 示例

```ts
// ─── 群消息快速回复（不通过 sendMsg，直接响应事件） ───
bot.event.message.onGroupMessage(async (bot, event) => {
    if (event.raw_message === '/ping') {
        await bot.api.handleQuickOperation(event, {
            reply: [[
                Message.reply(event.message_id).toJson(),
                Message.text('pong!').toJson(),
            ]],
            at_sender: false,
        })
    }
})

// ─── 自动同意入群并拒绝理由 ───
bot.event.request.onGroupAdd(async (bot, event) => {
    if (event.comment?.includes('暗号')) {
        await bot.api.handleQuickOperation(event, {
            approve: true,
            reason: '暗号正确，欢迎入群',
        })
    } else {
        await bot.api.handleQuickOperation(event, {
            approve: false,
            reason: '请输入入群暗号',
        })
    }
})
```

:::tip 何时使用快速操作
- **日常开发**：推荐使用 `sendMessage` / `handleFriendAddRequest` 等封装方法，代码更清晰易读
- **快速操作**：适合需要一次原子响应的场景，或 napcat 插件开发等高级用法
:::
