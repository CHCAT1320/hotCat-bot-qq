import type { BotClient } from './botClient';
import { Message } from './message';

/** 消息类事件的通用结构 */
export interface MessageEventLike {
    message_id?: number;
    user_id?: number;
    group_id?: number;
    message?: Array<{ type: string; data: Record<string, any> }>;
    raw_message?: string;
    sender?: { role?: string; nickname?: string; card?: string };
    sub_type?: string;
}

/**
 * 消息上下文，封装常见的回复、发送、撤回和权限判断。
 *
 * @example
 * bot.event.message.onGroupMessage(async (bot, event) => {
 *     const ctx = bot.context(event)
 *     await ctx.reply(Message.text('pong'))
 * })
 */
export class MessageContext {
    constructor(public readonly bot: BotClient, public readonly event: MessageEventLike) {}

    get isGroup(): boolean {
        return this.event.group_id != null;
    }

    get groupId(): number | undefined {
        return this.event.group_id;
    }

    get userId(): number | undefined {
        return this.event.user_id;
    }

    get messageId(): number | undefined {
        return this.event.message_id;
    }

    /** 是否为配置的 bot 主人 */
    get isOwner(): boolean {
        return this.userId != null && this.bot.isOwner(this.userId);
    }

    /** 是否为管理员（群主/群管理，私聊中仅主人） */
    get isAdmin(): boolean {
        if (this.isOwner) return true;
        if (!this.isGroup) return false;
        return this.event.sender?.role === 'admin' || this.event.sender?.role === 'owner';
    }

    /** 提取消息中的纯文本内容 */
    get text(): string {
        if (Array.isArray(this.event.message)) {
            return this.event.message
                .filter((segment) => segment.type === 'text')
                .map((segment) => String(segment.data.text ?? ''))
                .join('');
        }
        return this.event.raw_message ?? '';
    }

    /** 回复当前消息（群聊/私聊自动判断） */
    async reply(...messages: Message[]): Promise<void> {
        return this.send(Message.reply(this.requireMessageId()), ...messages);
    }

    /** 发送消息到当前会话 */
    async send(...messages: Message[]): Promise<void> {
        if (this.isGroup) {
            await this.bot.api.sendGroupMessage(this.requireGroupId(), ...messages);
        } else {
            await this.bot.api.sendPrivateMessage(this.requireUserId(), ...messages);
        }
    }

    /** @ 当前发送者（群聊可用） */
    at(): Message {
        return Message.at(this.requireUserId());
    }

    /** 撤回指定消息，默认撤回当前消息 */
    async recall(messageId: number | undefined = this.event.message_id): Promise<void> {
        if (messageId == null) throw new Error('当前事件没有 message_id，无法撤回');
        await this.bot.api.deleteMessage(messageId);
    }

    private requireGroupId(): number {
        if (this.event.group_id == null) throw new Error('当前事件不是群聊消息');
        return this.event.group_id;
    }

    private requireUserId(): number {
        if (this.event.user_id == null) throw new Error('当前事件缺少 user_id');
        return this.event.user_id;
    }

    private requireMessageId(): number {
        if (this.event.message_id == null) throw new Error('当前事件缺少 message_id，无法引用回复');
        return this.event.message_id;
    }
}
