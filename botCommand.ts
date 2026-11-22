import type { BotClient } from './botClient';
import { BotConsole, formatError } from './botConsole';
import { MessageContext, type MessageEventLike } from './botContext';
import { Message } from './message';

/** 命令权限级别 */
export type CommandPermission = 'everyone' | 'owner' | 'admin';

/** 命令作用域 */
export type CommandScope = 'all' | 'group' | 'private';

/** 命令注册选项 */
export interface CommandOptions {
    aliases?: string[];
    description?: string;
    permission?: CommandPermission;
    /** 冷却时间（毫秒），默认 0 */
    cooldown?: number;
    scope?: CommandScope;
}

/** 命令执行上下文 */
export class CommandContext extends MessageContext {
    constructor(
        bot: BotClient,
        event: MessageEventLike,
        public readonly command: string,
        public readonly args: string[],
        public readonly rawText: string,
    ) {
        super(bot, event);
    }

    /** 命令参数拼接后的文本 */
    get argText(): string {
        return this.args.join(' ');
    }
}

export type CommandHandler = (ctx: CommandContext) => unknown | Promise<unknown>;
export type CommandMiddleware = (ctx: CommandContext, next: () => Promise<void>) => unknown | Promise<unknown>;

interface CommandEntry {
    name: string;
    aliases: string[];
    handler: CommandHandler;
    options: Required<Omit<CommandOptions, 'aliases'>> & { aliases: string[] };
}

/** 命令系统配置 */
export interface CommandSystemOptions {
    /** 命令前缀，默认 `#`，可传多个 */
    prefix?: string | string[];
    /** 冷却中是否回复提示，默认 false */
    cooldownReply?: boolean;
}

/**
 * 命令、中间件、权限与冷却管理。
 *
 * @example
 * bot.command.command('ping', async (ctx) => {
 *     await ctx.reply(Message.text('pong'))
 * })
 *
 * bot.command.command('ban', handler, { permission: 'admin', cooldown: 3000 })
 */
export class BotCommandSystem {
    private commands = new Map<string, CommandEntry>();
    private middlewares: CommandMiddleware[] = [];
    private cooldowns = new Map<string, number>();
    private prefixes: string[];
    private cooldownReply: boolean;
    private attached = false;
    private groupHandler = (bot: BotClient, event: MessageEventLike) => this.handle(bot, event);
    private privateHandler = (bot: BotClient, event: MessageEventLike) => this.handle(bot, event);

    constructor(private bot: BotClient, options: CommandSystemOptions = {}) {
        this.prefixes = Array.isArray(options.prefix) ? options.prefix : [options.prefix ?? '#'];
        this.prefixes = this.prefixes.filter(Boolean);
        this.cooldownReply = options.cooldownReply ?? false;
    }

    /** 注册全局中间件，按注册顺序执行 */
    use(middleware: CommandMiddleware): this {
        this.middlewares.push(middleware);
        return this;
    }

    /** 注册命令，支持别名 */
    command(names: string | string[], handler: CommandHandler, options: CommandOptions = {}): this {
        const [name, ...rest] = Array.isArray(names) ? names : [names];
        if (!name) throw new Error('命令名不能为空');
        const aliases = [...rest, ...(options.aliases ?? [])];
        const entry: CommandEntry = {
            name,
            aliases,
            handler,
            options: {
                aliases,
                description: options.description ?? '',
                permission: options.permission ?? 'everyone',
                cooldown: options.cooldown ?? 0,
                scope: options.scope ?? 'all',
            },
        };
        this.commands.set(name.toLowerCase(), entry);
        for (const alias of aliases) this.commands.set(alias.toLowerCase(), entry);
        return this;
    }

    /** 移除命令及其别名 */
    remove(name: string): boolean {
        const entry = this.commands.get(name.toLowerCase());
        if (!entry) return false;
        this.commands.delete(entry.name.toLowerCase());
        for (const alias of entry.aliases) this.commands.delete(alias.toLowerCase());
        return true;
    }

    /** 已注册命令列表 */
    list(): Array<{ name: string; aliases: string[]; description: string; permission: CommandPermission }> {
        const seen = new Set<CommandEntry>();
        const result: Array<{ name: string; aliases: string[]; description: string; permission: CommandPermission }> = [];
        for (const entry of this.commands.values()) {
            if (seen.has(entry)) continue;
            seen.add(entry);
            result.push({ name: entry.name, aliases: entry.aliases, description: entry.options.description, permission: entry.options.permission });
        }
        return result;
    }

    /** 开始监听消息事件 */
    attach(): void {
        if (this.attached) return;
        this.attached = true;
        this.bot.event.message.onGroupMessage(this.groupHandler);
        this.bot.event.message.onPrivateMessage(this.privateHandler);
    }

    /** 停止监听消息事件 */
    detach(): void {
        if (!this.attached) return;
        this.attached = false;
        this.bot.event.message.offGroupMessage(this.groupHandler);
        this.bot.event.message.offPrivateMessage(this.privateHandler);
    }

    private async handle(bot: BotClient, event: MessageEventLike): Promise<void> {
        const text = this.extractText(event);
        const prefix = this.prefixes.find((p) => text.startsWith(p));
        if (!prefix) return;

        const body = text.slice(prefix.length).trim();
        if (!body) return;
        const [rawName, ...args] = body.split(/\s+/);
        if (!rawName) return;

        const entry = this.commands.get(rawName.toLowerCase());
        if (!entry) return;

        const ctx = new CommandContext(bot, event, entry.name, args, text);

        if (entry.options.scope === 'group' && !ctx.isGroup) return;
        if (entry.options.scope === 'private' && ctx.isGroup) return;
        if (!this.hasPermission(entry.options.permission, ctx)) return;

        if (entry.options.cooldown > 0 && this.isCoolingDown(entry, ctx)) return;

        try {
            await this.runMiddlewares(ctx, async () => {
                await entry.handler(ctx);
            });
        } catch (e) {
            new BotConsole('error', `命令 ${entry.name} 执行失败: ${formatError(e)}`).log();
        }
    }

    private hasPermission(permission: CommandPermission, ctx: CommandContext): boolean {
        if (permission === 'everyone') return true;
        if (permission === 'owner') return ctx.isOwner;
        return ctx.isAdmin;
    }

    private isCoolingDown(entry: CommandEntry, ctx: CommandContext): boolean {
        const key = `${entry.name}:${ctx.groupId ?? 'private'}:${ctx.userId ?? 0}`;
        const now = Date.now();
        if (this.cooldowns.size > 5000) {
            for (const [k, until] of this.cooldowns) {
                if (until <= now) this.cooldowns.delete(k);
            }
        }
        const until = this.cooldowns.get(key) ?? 0;
        if (until > now) {
            if (this.cooldownReply) {
                const seconds = Math.ceil((until - now) / 1000);
                void ctx.reply(Message.text(`命令冷却中，请 ${seconds} 秒后再试`)).catch(() => undefined);
            }
            return true;
        }
        this.cooldowns.set(key, now + entry.options.cooldown);
        return false;
    }

    private async runMiddlewares(ctx: CommandContext, final: () => Promise<void>): Promise<void> {
        let index = -1;
        const dispatch = async (i: number): Promise<void> => {
            if (i <= index) throw new Error('next() 被重复调用');
            index = i;
            const middleware = this.middlewares[i];
            if (!middleware) return final();
            await middleware(ctx, () => dispatch(i + 1));
        };
        await dispatch(0);
    }

    private extractText(event: MessageEventLike): string {
        if (Array.isArray(event.message)) {
            return event.message
                .filter((segment) => segment.type === 'text')
                .map((segment) => String(segment.data.text ?? ''))
                .join('')
                .trim();
        }
        return (event.raw_message ?? '').trim();
    }
}
