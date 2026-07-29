import { GroupMessage, GroupMessageSelf, PrivateFriendMessageSelf, PrivateGroupMessageSelf, NCWebsocket, RequestFriend, RequestGroupAdd, RequestGroupInvite, FriendAdd, FriendRecall, GroupAdminSet, GroupAdminUnset, GroupBanBan, GroupBanLiftBan, GroupCard, GroupDecreaseLeave, GroupDecreaseKick, GroupDecreaseKickMe, GroupIncreaseApprove, GroupIncreaseInvite, GroupRecall, GroupUpload, GroupMsgEmojiLike, GroupEssenceAdd, GroupEssenceDelete, BotOffline, NotifyPokeFriend, NotifyPokeGroup, NotifyGroupName, NotifyTitle, NotifyProfileLike } from 'node-napcat-ts';
import { BotConsole, PrivateMessage, PrivateMessageSelf, RequestGroup } from './botConsole';
import type { BotClient } from './botClient';
import type { BotApi } from './botApi';

/**
 * 当接收到消息时触发的事件。
 *
 * @example
 * ```ts
 * bot.event.message.onGroupMessage(async (bot, event) => {
 *     await bot.api.sendGroupMessage(event.group_id, Message.text('收到'));
 * });
 * ```
 */
export class MessageEvent {
    private napcat: NCWebsocket;
    private client: BotClient;

    constructor(napcat: NCWebsocket, client: BotClient) {
        this.napcat = napcat;
        this.client = client;
    }

    /**
     * 注册群消息事件回调
     * @param fn - 回调 `(bot, event) => any`
     */
    onGroupMessage(fn: (bot: BotClient, event: GroupMessage) => any): void {
        this.napcat.on('message.group', async (event: GroupMessage) => {
            try {
                new BotConsole('groupMessage', event).log();
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        });
    }

    /**
     * 注册群消息普通事件回调
     * @param fn - 回调 `(bot, event) => any`
     */
    onGroupNormal(fn: (bot: BotClient, event: GroupMessage) => any): void {
        this.napcat.on('message.group.normal', async (event: GroupMessage) => {
            try {
                new BotConsole('groupMessage', event).log();
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        });
    }

    /**
     * 注册私聊消息事件回调
     * @param fn - 回调 `(bot, event) => any`
     */
    onPrivateMessage(fn: (bot: BotClient, event: PrivateMessage) => any): void {
        this.napcat.on('message.private', async (event: PrivateMessage) => {
            try {
                new BotConsole('privateMessage', event).log();
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        });
    }

    /**
     * 注册私聊消息好友事件回调
     * @param fn - 回调 `(bot, event) => any`
     */
    onPrivateFriend(fn: (bot: BotClient, event: PrivateMessage) => any): void {
        this.napcat.on('message.private.friend', async (event: PrivateMessage) => {
            try {
                new BotConsole('privateMessage', event).log();
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        });
    }

    /**
     * 注册私聊消息群临时事件回调
     * @param fn - 回调 `(bot, event) => any`
     */
    onPrivateGroup(fn: (bot: BotClient, event: PrivateMessage) => any): void {
        this.napcat.on('message.private.group', async (event: PrivateMessage) => {
            try {
                new BotConsole('privateMessage', event).log();
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        });
    }
}

/**
 * 当 bot 自身发出消息后的事件。
 *
 * @example
 * ```ts
 * bot.event.messageSent.onGroupSent(async (bot, event) => {
 *     console.log('群消息已发送:', event.message_id);
 * });
 * ```
 */
export class MessageSent {
    private napcat: NCWebsocket;
    private client: BotClient;

    constructor(napcat: NCWebsocket, client: BotClient) {
        this.napcat = napcat;
        this.client = client;
    }

    /**
     * 注册群消息发送回执
     * @param fn - 回调 `(bot, event) => any`
     */
    onGroupSent(fn: (bot: BotClient, event: GroupMessageSelf) => any): void {
        this.napcat.on('message_sent.group', async (event: GroupMessageSelf) => {
            try {
                new BotConsole('groupMessageSelf', event).log();
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        });
    }

    /**
     * 注册群消息发送回执（仅普通消息）
     * @param fn - 回调 `(bot, event) => any`
     */
    onGroupNormal(fn: (bot: BotClient, event: GroupMessageSelf) => any): void {
        this.napcat.on('message_sent.group.normal', async (event: GroupMessageSelf) => {
            try {
                new BotConsole('groupMessageSelf', event).log();
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        });
    }

    /**
     * 注册私聊消息发送回执
     * @param fn - 回调 `(bot, event) => any`
     */
    onPrivateSent(fn: (bot: BotClient, event: PrivateMessageSelf) => any): void {
        this.napcat.on('message_sent.private', async (event: PrivateMessageSelf) => {
            try {
                new BotConsole('privateMessageSelf', event).log();
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        });
    }

    /**
     * 注册私聊好友消息发送回执
     * @param fn - 回调 `(bot, event) => any`
     */
    onPrivateFriend(fn: (bot: BotClient, event: PrivateFriendMessageSelf) => any): void {
        this.napcat.on('message_sent.private.friend', async (event: PrivateFriendMessageSelf) => {
            try {
                new BotConsole('privateMessageSelf', event).log();
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        });
    }

    /**
     * 注册私聊群临时消息发送回执
     * @param fn - 回调 `(bot, event) => any`
     */
    onPrivateGroup(fn: (bot: BotClient, event: PrivateGroupMessageSelf) => any): void {
        this.napcat.on('message_sent.private.group', async (event: PrivateGroupMessageSelf) => {
            try {
                new BotConsole('privateMessageSelf', event).log();
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        });
    }
}

/**
 * 请求事件监听（加好友、加群、邀请入群）。
 *
 * @example
 * ```ts
 * bot.event.request.onFriend(async (bot, event) => {
 *     await bot.api.handleFriendAddRequest(event.flag, true);
 * });
 * ```
 */
export class RequestEvent {
    private napcat: NCWebsocket;
    private client: BotClient;

    constructor(napcat: NCWebsocket, client: BotClient) {
        this.napcat = napcat;
        this.client = client;
    }

    /**
     * 注册加好友请求回调
     * @param fn - 回调 `(bot, event) => any`，event.flag 可传给 handleFriendAddRequest
     */
    onFriend(fn: (bot: BotClient, event: RequestFriend) => any): void {
        this.napcat.on('request.friend', async (event: RequestFriend) => {
            try {
                new BotConsole('requestFriend', event).log();
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        });
    }

    /**
     * 注册加群请求回调
     * @param fn - 回调 `(bot, event) => any`，event.flag 可传给 handleGroupAddRequest
     */
    onGroupAdd(fn: (bot: BotClient, event: RequestGroupAdd) => any): void {
        this.napcat.on('request.group.add', async (event: RequestGroupAdd) => {
            try {
                new BotConsole('requestGroupAdd', event).log();
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        });
    }

    /**
     * 注册邀请入群回调
     * @param fn - 回调 `(bot, event) => any`
     */
    onGroupInvite(fn: (bot: BotClient, event: RequestGroupInvite) => any): void {
        this.napcat.on('request.group.invite', async (event: RequestGroupInvite) => {
            try {
                new BotConsole('requestGroupInvite', event).log();
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        });
    }

    /**
     * 注册所有群请求回调（加群 + 邀请）
     * @param fn - 回调 `(bot, event) => any`
     */
    onGroupRequest(fn: (bot: BotClient, event: RequestGroup) => any): void {
        this.napcat.on('request.group', async (event: RequestGroup) => {
            try {
                const type = event.sub_type === 'add' ? 'requestGroupAdd' : 'requestGroupInvite';
                new BotConsole(type, event).log();
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        });
    }
}

/**
 * 通知事件监听（好友添加、群成员变动、禁言、撤回等）。
 *
 * @example
 * ```ts
 * bot.event.notice.onFriendAdd(async (bot, event) => { ... });
 * bot.event.notice.onGroupIncrease(async (bot, event) => { ... });
 * ```
 */
export class NoticeEvent {
    private napcat: NCWebsocket;
    private client: BotClient;

    constructor(napcat: NCWebsocket, client: BotClient) {
        this.napcat = napcat;
        this.client = client;
    }

    /** 好友添加 */
    onFriendAdd(fn: (bot: BotClient, event: FriendAdd) => any): void {
        this.napcat.on('notice.friend_add', async (event: FriendAdd) => {
            try { new BotConsole('notice', event).log(); await fn(this.client, event); }
            catch (e) { new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log(); }
        });
    }

    /** 私聊消息撤回 */
    onFriendRecall(fn: (bot: BotClient, event: FriendRecall) => any): void {
        this.napcat.on('notice.friend_recall', async (event: FriendRecall) => {
            try { new BotConsole('notice', event).log(); await fn(this.client, event); }
            catch (e) { new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log(); }
        });
    }

    /** 群管理员变动（设置/取消） */
    onGroupAdmin(fn: (bot: BotClient, event: GroupAdminSet | GroupAdminUnset) => any): void {
        this.napcat.on('notice.group_admin', async (event: GroupAdminSet | GroupAdminUnset) => {
            try { new BotConsole('notice', event).log(); await fn(this.client, event); }
            catch (e) { new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log(); }
        });
    }

    /** 群禁言变动（禁言/解除） */
    onGroupBan(fn: (bot: BotClient, event: GroupBanBan | GroupBanLiftBan) => any): void {
        this.napcat.on('notice.group_ban', async (event: GroupBanBan | GroupBanLiftBan) => {
            try { new BotConsole('notice', event).log(); await fn(this.client, event); }
            catch (e) { new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log(); }
        });
    }

    /** 群名片变更 */
    onGroupCard(fn: (bot: BotClient, event: GroupCard) => any): void {
        this.napcat.on('notice.group_card', async (event: GroupCard) => {
            try { new BotConsole('notice', event).log(); await fn(this.client, event); }
            catch (e) { new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log(); }
        });
    }

    /** 群成员减少（退群/被踢/bot被踢） */
    onGroupDecrease(fn: (bot: BotClient, event: GroupDecreaseLeave | GroupDecreaseKick | GroupDecreaseKickMe) => any): void {
        this.napcat.on('notice.group_decrease', async (event: GroupDecreaseLeave | GroupDecreaseKick | GroupDecreaseKickMe) => {
            try { new BotConsole('notice', event).log(); await fn(this.client, event); }
            catch (e) { new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log(); }
        });
    }

    /** 群成员增加（审批/邀请） */
    onGroupIncrease(fn: (bot: BotClient, event: GroupIncreaseApprove | GroupIncreaseInvite) => any): void {
        this.napcat.on('notice.group_increase', async (event: GroupIncreaseApprove | GroupIncreaseInvite) => {
            try { new BotConsole('notice', event).log(); await fn(this.client, event); }
            catch (e) { new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log(); }
        });
    }

    /** 群消息撤回 */
    onGroupRecall(fn: (bot: BotClient, event: GroupRecall) => any): void {
        this.napcat.on('notice.group_recall', async (event: GroupRecall) => {
            try { new BotConsole('notice', event).log(); await fn(this.client, event); }
            catch (e) { new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log(); }
        });
    }

    /** 群文件上传 */
    onGroupUpload(fn: (bot: BotClient, event: GroupUpload) => any): void {
        this.napcat.on('notice.group_upload', async (event: GroupUpload) => {
            try { new BotConsole('notice', event).log(); await fn(this.client, event); }
            catch (e) { new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log(); }
        });
    }

    /** 群表情回应 */
    onGroupEmojiLike(fn: (bot: BotClient, event: GroupMsgEmojiLike) => any): void {
        this.napcat.on('notice.group_msg_emoji_like', async (event: GroupMsgEmojiLike) => {
            try { new BotConsole('notice', event).log(); await fn(this.client, event); }
            catch (e) { new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log(); }
        });
    }

    /** 群设精（添加/删除） */
    onGroupEssence(fn: (bot: BotClient, event: GroupEssenceAdd | GroupEssenceDelete) => any): void {
        this.napcat.on('notice.essence', async (event: GroupEssenceAdd | GroupEssenceDelete) => {
            try { new BotConsole('notice', event).log(); await fn(this.client, event); }
            catch (e) { new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log(); }
        });
    }

    /** 戳一戳（好友/群） */
    onPoke(fn: (bot: BotClient, event: NotifyPokeFriend | NotifyPokeGroup) => any): void {
        this.napcat.on('notice.notify.poke', async (event: NotifyPokeFriend | NotifyPokeGroup) => {
            try { new BotConsole('notice', event).log(); await fn(this.client, event); }
            catch (e) { new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log(); }
        });
    }

    /** 群名称变更 */
    onGroupNameChange(fn: (bot: BotClient, event: NotifyGroupName) => any): void {
        this.napcat.on('notice.notify.group_name', async (event: NotifyGroupName) => {
            try { new BotConsole('notice', event).log(); await fn(this.client, event); }
            catch (e) { new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log(); }
        });
    }

    /** 群头衔变更 */
    onTitleChange(fn: (bot: BotClient, event: NotifyTitle) => any): void {
        this.napcat.on('notice.notify.title', async (event: NotifyTitle) => {
            try { new BotConsole('notice', event).log(); await fn(this.client, event); }
            catch (e) { new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log(); }
        });
    }

    /** 个人资料点赞 */
    onProfileLike(fn: (bot: BotClient, event: NotifyProfileLike) => any): void {
        this.napcat.on('notice.notify.profile_like', async (event: NotifyProfileLike) => {
            try { new BotConsole('notice', event).log(); await fn(this.client, event); }
            catch (e) { new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log(); }
        });
    }

    /** bot 离线 */
    onBotOffline(fn: (bot: BotClient, event: BotOffline) => any): void {
        this.napcat.on('notice.bot_offline', async (event: BotOffline) => {
            try { new BotConsole('notice', event).log(); await fn(this.client, event); }
            catch (e) { new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log(); }
        });
    }
}

/**
 * 事件监听入口，按类别分组暴露监听器。
 *
 * @example
 * ```ts
 * bot.event.message.onGroupMessage(...);
 * bot.event.messageSent.onGroupSent(...);
 * bot.event.request.onFriend(...);
 * ```
 */
export class BotEvent {
    public message: MessageEvent;
    public messageSent: MessageSent;
    public request: RequestEvent;
    public notice: NoticeEvent;

    constructor(api: BotApi, client: BotClient) {
        this.message = new MessageEvent(api.napcat, client);
        this.messageSent = new MessageSent(api.napcat, client);
        this.request = new RequestEvent(api.napcat, client);
        this.notice = new NoticeEvent(api.napcat, client);
    }
}
