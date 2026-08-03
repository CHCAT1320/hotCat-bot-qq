import { GroupMessage, GroupMessageSelf, PrivateFriendMessageSelf, PrivateGroupMessageSelf, NCWebsocket, RequestFriend, RequestGroupAdd, RequestGroupInvite, FriendAdd, FriendRecall, GroupAdminSet, GroupAdminUnset, GroupBanBan, GroupBanLiftBan, GroupCard, GroupDecreaseLeave, GroupDecreaseKick, GroupDecreaseKickMe, GroupIncreaseApprove, GroupIncreaseInvite, GroupRecall, GroupUpload, GroupMsgEmojiLike, GroupEssenceAdd, GroupEssenceDelete, BotOffline, NotifyPokeFriend, NotifyPokeGroup, NotifyGroupName, NotifyTitle, NotifyProfileLike } from 'node-napcat-ts';
import { BotConsole, PrivateMessage, PrivateMessageSelf, RequestGroup, NoticeEvent as NoticeEventType } from './botConsole';
import type { BotClient } from './botClient';
import type { BotApi } from './botApi';

/**
 * 接收到的事件处理（别人发的消息）。
 */
export class MessageEvent {
    private napcat: NCWebsocket;
    private client: BotClient;
    private wrappers = new Map<Function, (e: any) => Promise<void>>();

    constructor(napcat: NCWebsocket, client: BotClient) {
        this.napcat = napcat;
        this.client = client;
        this.napcat.on('message.group', (event: GroupMessage) => {
            new BotConsole('groupMessage', event).log();
        });
        this.napcat.on('message.private', (event: PrivateMessage) => {
            new BotConsole('privateMessage', event).log();
        });
    }

    onGroupMessage(fn: (bot: BotClient, event: GroupMessage) => any): void {
        const w = async (event: GroupMessage) => {
            try {
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        };
        this.wrappers.set(fn, w);
        this.napcat.on('message.group', w);
    }

    offGroupMessage(fn: Function): void {
        const w = this.wrappers.get(fn);
        if (w) {
            this.napcat.off('message.group', w);
            this.wrappers.delete(fn);
        }
    }

    onGroupNormal(fn: (bot: BotClient, event: GroupMessage) => any): void {
        const w = async (event: GroupMessage) => {
            try {
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        };
        this.wrappers.set(fn, w);
        this.napcat.on('message.group.normal', w);
    }

    offGroupNormal(fn: Function): void {
        const w = this.wrappers.get(fn);
        if (w) {
            this.napcat.off('message.group.normal', w);
            this.wrappers.delete(fn);
        }
    }

    onPrivateMessage(fn: (bot: BotClient, event: PrivateMessage) => any): void {
        const w = async (event: PrivateMessage) => {
            try {
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        };
        this.wrappers.set(fn, w);
        this.napcat.on('message.private', w);
    }

    offPrivateMessage(fn: Function): void {
        const w = this.wrappers.get(fn);
        if (w) {
            this.napcat.off('message.private', w);
            this.wrappers.delete(fn);
        }
    }

    onPrivateFriend(fn: (bot: BotClient, event: PrivateMessage) => any): void {
        const w = async (event: PrivateMessage) => {
            try {
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        };
        this.wrappers.set(fn, w);
        this.napcat.on('message.private.friend', w);
    }

    offPrivateFriend(fn: Function): void {
        const w = this.wrappers.get(fn);
        if (w) {
            this.napcat.off('message.private.friend', w);
            this.wrappers.delete(fn);
        }
    }

    onPrivateGroup(fn: (bot: BotClient, event: PrivateMessage) => any): void {
        const w = async (event: PrivateMessage) => {
            try {
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        };
        this.wrappers.set(fn, w);
        this.napcat.on('message.private.group', w);
    }

    offPrivateGroup(fn: Function): void {
        const w = this.wrappers.get(fn);
        if (w) {
            this.napcat.off('message.private.group', w);
            this.wrappers.delete(fn);
        }
    }
}

/**
 * bot 自身发出的消息事件（发送成功后的回执）。
 */
export class MessageSent {
    private napcat: NCWebsocket;
    private client: BotClient;
    private wrappers = new Map<Function, (e: any) => Promise<void>>();

    constructor(napcat: NCWebsocket, client: BotClient) {
        this.napcat = napcat;
        this.client = client;
        this.napcat.on('message_sent.group', (event: GroupMessageSelf) => {
            new BotConsole('groupMessageSelf', event).log();
        });
        this.napcat.on('message_sent.private', (event: PrivateMessageSelf) => {
            new BotConsole('privateMessageSelf', event).log();
        });
    }

    onGroupSent(fn: (bot: BotClient, event: GroupMessageSelf) => any): void {
        const w = async (event: GroupMessageSelf) => {
            try {
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        };
        this.wrappers.set(fn, w);
        this.napcat.on('message_sent.group', w);
    }

    offGroupSent(fn: Function): void {
        const w = this.wrappers.get(fn);
        if (w) {
            this.napcat.off('message_sent.group', w);
            this.wrappers.delete(fn);
        }
    }

    onGroupNormal(fn: (bot: BotClient, event: GroupMessageSelf) => any): void {
        const w = async (event: GroupMessageSelf) => {
            try {
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        };
        this.wrappers.set(fn, w);
        this.napcat.on('message_sent.group.normal', w);
    }

    offGroupNormal(fn: Function): void {
        const w = this.wrappers.get(fn);
        if (w) {
            this.napcat.off('message_sent.group.normal', w);
            this.wrappers.delete(fn);
        }
    }

    onPrivateSent(fn: (bot: BotClient, event: PrivateMessageSelf) => any): void {
        const w = async (event: PrivateMessageSelf) => {
            try {
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        };
        this.wrappers.set(fn, w);
        this.napcat.on('message_sent.private', w);
    }

    offPrivateSent(fn: Function): void {
        const w = this.wrappers.get(fn);
        if (w) {
            this.napcat.off('message_sent.private', w);
            this.wrappers.delete(fn);
        }
    }

    onPrivateFriend(fn: (bot: BotClient, event: PrivateFriendMessageSelf) => any): void {
        const w = async (event: PrivateFriendMessageSelf) => {
            try {
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        };
        this.wrappers.set(fn, w);
        this.napcat.on('message_sent.private.friend', w);
    }

    offPrivateFriend(fn: Function): void {
        const w = this.wrappers.get(fn);
        if (w) {
            this.napcat.off('message_sent.private.friend', w);
            this.wrappers.delete(fn);
        }
    }

    onPrivateGroup(fn: (bot: BotClient, event: PrivateGroupMessageSelf) => any): void {
        const w = async (event: PrivateGroupMessageSelf) => {
            try {
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        };
        this.wrappers.set(fn, w);
        this.napcat.on('message_sent.private.group', w);
    }

    offPrivateGroup(fn: Function): void {
        const w = this.wrappers.get(fn);
        if (w) {
            this.napcat.off('message_sent.private.group', w);
            this.wrappers.delete(fn);
        }
    }
}

/**
 * 请求事件监听（加好友、加群、邀请入群）。
 */
export class RequestEvent {
    private napcat: NCWebsocket;
    private client: BotClient;
    private wrappers = new Map<Function, (e: any) => Promise<void>>();

    constructor(napcat: NCWebsocket, client: BotClient) {
        this.napcat = napcat;
        this.client = client;
        this.napcat.on('request.friend', (event: RequestFriend) => {
            new BotConsole('requestFriend', event).log();
        });
        this.napcat.on('request.group.add', (event: RequestGroupAdd) => {
            new BotConsole('requestGroupAdd', event).log();
        });
        this.napcat.on('request.group.invite', (event: RequestGroupInvite) => {
            new BotConsole('requestGroupInvite', event).log();
        });
    }

    onFriend(fn: (bot: BotClient, event: RequestFriend) => any): void {
        const w = async (event: RequestFriend) => {
            try {
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        };
        this.wrappers.set(fn, w);
        this.napcat.on('request.friend', w);
    }

    offFriend(fn: Function): void {
        const w = this.wrappers.get(fn);
        if (w) {
            this.napcat.off('request.friend', w);
            this.wrappers.delete(fn);
        }
    }

    onGroupAdd(fn: (bot: BotClient, event: RequestGroupAdd) => any): void {
        const w = async (event: RequestGroupAdd) => {
            try {
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        };
        this.wrappers.set(fn, w);
        this.napcat.on('request.group.add', w);
    }

    offGroupAdd(fn: Function): void {
        const w = this.wrappers.get(fn);
        if (w) {
            this.napcat.off('request.group.add', w);
            this.wrappers.delete(fn);
        }
    }

    onGroupInvite(fn: (bot: BotClient, event: RequestGroupInvite) => any): void {
        const w = async (event: RequestGroupInvite) => {
            try {
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        };
        this.wrappers.set(fn, w);
        this.napcat.on('request.group.invite', w);
    }

    offGroupInvite(fn: Function): void {
        const w = this.wrappers.get(fn);
        if (w) {
            this.napcat.off('request.group.invite', w);
            this.wrappers.delete(fn);
        }
    }

    onGroupRequest(fn: (bot: BotClient, event: RequestGroup) => any): void {
        const w = async (event: RequestGroup) => {
            try {
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        };
        this.wrappers.set(fn, w);
        this.napcat.on('request.group', w);
    }

    offGroupRequest(fn: Function): void {
        const w = this.wrappers.get(fn);
        if (w) {
            this.napcat.off('request.group', w);
            this.wrappers.delete(fn);
        }
    }
}

/**
 * 通知事件监听（好友添加、群成员变动、禁言、撤回等）。
 */
export class NoticeEvent {
    private napcat: NCWebsocket;
    private client: BotClient;
    private wrappers = new Map<Function, (e: any) => Promise<void>>();

    constructor(napcat: NCWebsocket, client: BotClient) {
        this.napcat = napcat;
        this.client = client;
        const log = (event: NoticeEventType) => {
            new BotConsole('notice', event).log();
        };
        this.napcat.on('notice.friend_add', log);
        this.napcat.on('notice.friend_recall', log);
        this.napcat.on('notice.group_admin', log);
        this.napcat.on('notice.group_ban', log);
        this.napcat.on('notice.group_card', log);
        this.napcat.on('notice.group_decrease', log);
        this.napcat.on('notice.group_increase', log);
        this.napcat.on('notice.group_recall', log);
        this.napcat.on('notice.group_upload', log);
        this.napcat.on('notice.group_msg_emoji_like', log);
        this.napcat.on('notice.essence', log);
        this.napcat.on('notice.notify.poke', log);
        this.napcat.on('notice.notify.group_name', log);
        this.napcat.on('notice.notify.title', log);
        this.napcat.on('notice.notify.profile_like', log);
        this.napcat.on('notice.bot_offline', log);
    }

    onFriendAdd(fn: (bot: BotClient, event: FriendAdd) => any): void {
        const w = async (event: FriendAdd) => {
            try {
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        };
        this.wrappers.set(fn, w);
        this.napcat.on('notice.friend_add', w);
    }

    offFriendAdd(fn: Function): void {
        const w = this.wrappers.get(fn);
        if (w) {
            this.napcat.off('notice.friend_add', w);
            this.wrappers.delete(fn);
        }
    }

    onFriendRecall(fn: (bot: BotClient, event: FriendRecall) => any): void {
        const w = async (event: FriendRecall) => {
            try {
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        };
        this.wrappers.set(fn, w);
        this.napcat.on('notice.friend_recall', w);
    }

    offFriendRecall(fn: Function): void {
        const w = this.wrappers.get(fn);
        if (w) {
            this.napcat.off('notice.friend_recall', w);
            this.wrappers.delete(fn);
        }
    }

    onGroupAdmin(fn: (bot: BotClient, event: GroupAdminSet | GroupAdminUnset) => any): void {
        const w = async (event: GroupAdminSet | GroupAdminUnset) => {
            try {
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        };
        this.wrappers.set(fn, w);
        this.napcat.on('notice.group_admin', w);
    }

    offGroupAdmin(fn: Function): void {
        const w = this.wrappers.get(fn);
        if (w) {
            this.napcat.off('notice.group_admin', w);
            this.wrappers.delete(fn);
        }
    }

    onGroupBan(fn: (bot: BotClient, event: GroupBanBan | GroupBanLiftBan) => any): void {
        const w = async (event: GroupBanBan | GroupBanLiftBan) => {
            try {
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        };
        this.wrappers.set(fn, w);
        this.napcat.on('notice.group_ban', w);
    }

    offGroupBan(fn: Function): void {
        const w = this.wrappers.get(fn);
        if (w) {
            this.napcat.off('notice.group_ban', w);
            this.wrappers.delete(fn);
        }
    }

    onGroupCard(fn: (bot: BotClient, event: GroupCard) => any): void {
        const w = async (event: GroupCard) => {
            try {
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        };
        this.wrappers.set(fn, w);
        this.napcat.on('notice.group_card', w);
    }

    offGroupCard(fn: Function): void {
        const w = this.wrappers.get(fn);
        if (w) {
            this.napcat.off('notice.group_card', w);
            this.wrappers.delete(fn);
        }
    }

    onGroupDecrease(fn: (bot: BotClient, event: GroupDecreaseLeave | GroupDecreaseKick | GroupDecreaseKickMe) => any): void {
        const w = async (event: GroupDecreaseLeave | GroupDecreaseKick | GroupDecreaseKickMe) => {
            try {
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        };
        this.wrappers.set(fn, w);
        this.napcat.on('notice.group_decrease', w);
    }

    offGroupDecrease(fn: Function): void {
        const w = this.wrappers.get(fn);
        if (w) {
            this.napcat.off('notice.group_decrease', w);
            this.wrappers.delete(fn);
        }
    }

    onGroupIncrease(fn: (bot: BotClient, event: GroupIncreaseApprove | GroupIncreaseInvite) => any): void {
        const w = async (event: GroupIncreaseApprove | GroupIncreaseInvite) => {
            try {
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        };
        this.wrappers.set(fn, w);
        this.napcat.on('notice.group_increase', w);
    }

    offGroupIncrease(fn: Function): void {
        const w = this.wrappers.get(fn);
        if (w) {
            this.napcat.off('notice.group_increase', w);
            this.wrappers.delete(fn);
        }
    }

    onGroupRecall(fn: (bot: BotClient, event: GroupRecall) => any): void {
        const w = async (event: GroupRecall) => {
            try {
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        };
        this.wrappers.set(fn, w);
        this.napcat.on('notice.group_recall', w);
    }

    offGroupRecall(fn: Function): void {
        const w = this.wrappers.get(fn);
        if (w) {
            this.napcat.off('notice.group_recall', w);
            this.wrappers.delete(fn);
        }
    }

    onGroupUpload(fn: (bot: BotClient, event: GroupUpload) => any): void {
        const w = async (event: GroupUpload) => {
            try {
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        };
        this.wrappers.set(fn, w);
        this.napcat.on('notice.group_upload', w);
    }

    offGroupUpload(fn: Function): void {
        const w = this.wrappers.get(fn);
        if (w) {
            this.napcat.off('notice.group_upload', w);
            this.wrappers.delete(fn);
        }
    }

    onGroupEmojiLike(fn: (bot: BotClient, event: GroupMsgEmojiLike) => any): void {
        const w = async (event: GroupMsgEmojiLike) => {
            try {
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        };
        this.wrappers.set(fn, w);
        this.napcat.on('notice.group_msg_emoji_like', w);
    }

    offGroupEmojiLike(fn: Function): void {
        const w = this.wrappers.get(fn);
        if (w) {
            this.napcat.off('notice.group_msg_emoji_like', w);
            this.wrappers.delete(fn);
        }
    }

    onGroupEssence(fn: (bot: BotClient, event: GroupEssenceAdd | GroupEssenceDelete) => any): void {
        const w = async (event: GroupEssenceAdd | GroupEssenceDelete) => {
            try {
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        };
        this.wrappers.set(fn, w);
        this.napcat.on('notice.essence', w);
    }

    offGroupEssence(fn: Function): void {
        const w = this.wrappers.get(fn);
        if (w) {
            this.napcat.off('notice.essence', w);
            this.wrappers.delete(fn);
        }
    }

    onPoke(fn: (bot: BotClient, event: NotifyPokeFriend | NotifyPokeGroup) => any): void {
        const w = async (event: NotifyPokeFriend | NotifyPokeGroup) => {
            try {
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        };
        this.wrappers.set(fn, w);
        this.napcat.on('notice.notify.poke', w);
    }

    offPoke(fn: Function): void {
        const w = this.wrappers.get(fn);
        if (w) {
            this.napcat.off('notice.notify.poke', w);
            this.wrappers.delete(fn);
        }
    }

    onGroupNameChange(fn: (bot: BotClient, event: NotifyGroupName) => any): void {
        const w = async (event: NotifyGroupName) => {
            try {
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        };
        this.wrappers.set(fn, w);
        this.napcat.on('notice.notify.group_name', w);
    }

    offGroupNameChange(fn: Function): void {
        const w = this.wrappers.get(fn);
        if (w) {
            this.napcat.off('notice.notify.group_name', w);
            this.wrappers.delete(fn);
        }
    }

    onTitleChange(fn: (bot: BotClient, event: NotifyTitle) => any): void {
        const w = async (event: NotifyTitle) => {
            try {
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        };
        this.wrappers.set(fn, w);
        this.napcat.on('notice.notify.title', w);
    }

    offTitleChange(fn: Function): void {
        const w = this.wrappers.get(fn);
        if (w) {
            this.napcat.off('notice.notify.title', w);
            this.wrappers.delete(fn);
        }
    }

    onProfileLike(fn: (bot: BotClient, event: NotifyProfileLike) => any): void {
        const w = async (event: NotifyProfileLike) => {
            try {
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        };
        this.wrappers.set(fn, w);
        this.napcat.on('notice.notify.profile_like', w);
    }

    offProfileLike(fn: Function): void {
        const w = this.wrappers.get(fn);
        if (w) {
            this.napcat.off('notice.notify.profile_like', w);
            this.wrappers.delete(fn);
        }
    }

    onBotOffline(fn: (bot: BotClient, event: BotOffline) => any): void {
        const w = async (event: BotOffline) => {
            try {
                await fn(this.client, event);
            } catch (e) {
                new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
            }
        };
        this.wrappers.set(fn, w);
        this.napcat.on('notice.bot_offline', w);
    }

    offBotOffline(fn: Function): void {
        const w = this.wrappers.get(fn);
        if (w) {
            this.napcat.off('notice.bot_offline', w);
            this.wrappers.delete(fn);
        }
    }
}

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
