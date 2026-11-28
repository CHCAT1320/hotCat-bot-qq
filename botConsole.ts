import { GroupMessage, GroupMessageSelf, PrivateFriendMessage, PrivateGroupMessage, PrivateFriendMessageSelf, PrivateGroupMessageSelf, RequestFriend, RequestGroupAdd, RequestGroupInvite } from 'node-napcat-ts';
import { appendFileSync, existsSync, mkdirSync, renameSync, statSync, unlinkSync } from 'fs';
import { dirname } from 'path';
import { Message } from './message';

/** 私聊消息联合类型 */
export type PrivateMessage = PrivateFriendMessage | PrivateGroupMessage;
/** 自发送私聊消息联合类型 */
export type PrivateMessageSelf = PrivateFriendMessageSelf | PrivateGroupMessageSelf;
/** 群请求联合类型 */
export type RequestGroup = RequestGroupAdd | RequestGroupInvite;
/** notice 事件通用类型 */
export type NoticeEvent = Record<string, any> & { post_type: 'notice'; notice_type: string; sub_type?: string };
/** 日志级别 */
export type BotLogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';
/** BotConsole 日志分类 */
export type BotConsoleType = 'system' | 'groupMessage' | 'privateMessage' | 'error' | 'sendGroupMessage' | 'sendPrivateMessage' | 'groupMessageSelf' | 'privateMessageSelf' | 'requestFriend' | 'requestGroupAdd' | 'requestGroupInvite' | 'notice' | 'plugin' | 'debug' | 'info' | 'warn';

/** 单条日志记录 */
export interface BotLogEntry {
    time: string;
    level: BotLogLevel;
    type: BotConsoleType;
    message: string;
}

/** BotConsole 全局配置 */
export interface BotConsoleOptions {
    /** 最低输出级别，默认 info */
    level?: BotLogLevel;
    /** 是否输出时间戳，默认 false */
    timestamps?: boolean;
    /** 日志文件路径，默认不写文件 */
    file?: string;
    /** 单个日志文件最大字节数，默认 5MB */
    maxSize?: number;
    /** 保留的历史文件数量，默认 5 */
    maxFiles?: number;
    /** 使用 JSON Lines 输出，默认 false */
    json?: boolean;
    /** 每条日志的回调，可用于接入 Sentry 等 */
    onLog?: (entry: BotLogEntry) => void;
}

/** ANSI 颜色/样式码 */
export const colors = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    underline: '\x1b[4m',
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
    brightRed: '\x1b[91m',
    brightGreen: '\x1b[92m',
    brightYellow: '\x1b[93m',
    brightBlue: '\x1b[94m',
    brightMagenta: '\x1b[95m',
    brightCyan: '\x1b[96m',
    brightWhite: '\x1b[97m',
    redBg: '\x1b[41m',
    greenBg: '\x1b[42m',
    yellowBg: '\x1b[43m',
    blueBg: '\x1b[44m',
    magentaBg: '\x1b[45m',
    cyanBg: '\x1b[46m',
};

const sanitize = (s: string): string =>
    s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g, '');

const shortText = (s: string): string =>
    sanitize(s).replace(/\s+/g, ' ').trim();

/** 按 CQ 码顶层逗号拆分参数，忽略 JSON 对象/数组和引号内的逗号 */
const splitCQParams = (params: string): Record<string, string> => {
    const kv: Record<string, string> = {};
    let start = 0;
    let depth = 0;
    let quote = '';
    let escaped = false;

    const push = (part: string) => {
        const eq = part.indexOf('=');
        if (eq > 0) kv[part.slice(0, eq)] = part.slice(eq + 1);
    };

    for (let i = 0; i <= params.length; i++) {
        const c = params[i];
        if (i < params.length) {
            if (escaped) { escaped = false; continue; }
            if (c === '\\') { escaped = true; continue; }
            if (quote) { if (c === quote) quote = ''; continue; }
            if (c === '"' || c === "'") { quote = c; continue; }
            if (c === '{' || c === '[') { depth++; continue; }
            if (c === '}' || c === ']') { depth--; continue; }
            if (c !== ',' || depth !== 0) continue;
        }
        push(params.slice(start, i));
        start = i + 1;
    }
    return kv;
};

/** 安全格式化未知异常，避免 JSON.stringify 遇到循环引用时再次抛错 */
export const formatError = (e: unknown): string => {
    if (e instanceof Error) return e.message;
    if (typeof e === 'string') return e;
    try {
        return JSON.stringify(e);
    } catch {
        return String(e);
    }
};

const LEVEL_RANK: Record<BotLogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3, silent: 4 };
const stripAnsi = (s: string): string => s.replace(/\x1b\[[0-9;]*m/g, '');
const levelForType = (type: BotConsoleType): BotLogLevel => {
    if (type === 'error') return 'error';
    if (type === 'warn') return 'warn';
    if (type === 'debug') return 'debug';
    return 'info';
};
const defaultOptions = (): Required<Omit<BotConsoleOptions, 'onLog'>> & { onLog?: (entry: BotLogEntry) => void } => ({
    level: 'info',
    timestamps: false,
    file: '',
    maxSize: 5 * 1024 * 1024,
    maxFiles: 5,
    json: false,
    onLog: undefined,
});

/**
 * 解析 CQ 码字符串为可读中文
 * @example
 * parseCQ('[CQ:at,qq=123]') // '[@123]'
 * parseCQ('[CQ:image,url=https://...]') // '[图片:https://...]'
 */
export const parseCQ = (raw: string): string => {
    let result = '';
    let i = 0;
    while (i < raw.length) {
        if (raw.startsWith('[CQ:', i)) {
            const start = i + 4;
            const commaIdx = raw.indexOf(',', start);
            if (commaIdx === -1) { result += raw[i]; i++; continue; }
            const type = raw.slice(start, commaIdx);
            let depth = 1;
            let j = commaIdx + 1;
            let quote = '';
            let escaped = false;
            while (j < raw.length) {
                const c = raw[j];
                if (escaped) { escaped = false; j++; continue; }
                if (c === '\\') { escaped = true; j++; continue; }
                if (quote) { if (c === quote) quote = ''; j++; continue; }
                if (c === '"' || c === "'") { quote = c; j++; continue; }
                if (c === '[') depth++;
                else if (c === ']') { depth--; if (depth === 0) break; }
                j++;
            }
            if (depth !== 0) { result += raw[i]; i++; continue; }
            const params = raw.slice(commaIdx + 1, j);
            const kv = splitCQParams(params);
            switch (type) {
                case 'image': {
                    const f = kv.url || kv.file || kv.summary || '';
                    result += f ? `[图片:${sanitize(f)}]` : '[图片]';
                    break;
                }
                case 'face': result += `[表情:${kv.id || '?'}]`; break;
                case 'at': result += kv.qq === 'all' ? '[@全体]' : `[@${kv.qq || '?'}]`; break;
                case 'record': {
                    const f = kv.url || kv.file || '';
                    result += f ? `[语音:${sanitize(f)}]` : '[语音]';
                    break;
                }
                case 'video': {
                    const f = kv.url || kv.file || '';
                    result += f ? `[视频:${sanitize(f)}]` : '[视频]';
                    break;
                }
                case 'reply': result += kv.id ? `[回复:${sanitize(kv.id)}]` : '[回复]'; break;
                case 'file': {
                    const f = kv.name || kv.file || kv.url || '';
                    result += f ? `[文件:${sanitize(f)}]` : '[文件]';
                    break;
                }
                case 'dice': result += kv.result ? `[骰子:${sanitize(kv.result)}]` : '[骰子]'; break;
                case 'rps': result += kv.result ? `[猜拳:${sanitize(kv.result)}]` : '[猜拳]'; break;
                case 'json': result += kv.data ? `[json:${shortText(kv.data)}]` : '[json]'; break;
                case 'forward': result += kv.id ? `[转发:${sanitize(kv.id)}]` : '[转发]'; break;
                case 'node': {
                    const id = kv.id || kv.user_id || kv.nickname || '';
                    result += id ? `[转发节点:${sanitize(id)}]` : '[转发节点]';
                    break;
                }
                case 'music': {
                    const parts = [kv.type, kv.id, kv.url].filter(Boolean);
                    result += parts.length ? `[音乐:${parts.map((p) => sanitize(p)).join(':')}]` : '[音乐]';
                    break;
                }
                case 'mface': {
                    const parts = [kv.emoji_id, kv.summary].filter(Boolean);
                    result += parts.length ? `[商城表情:${parts.map((p) => sanitize(p)).join(':')}]` : '[商城表情]';
                    break;
                }
                case 'markdown': {
                    const content = shortText(kv.content || kv.data || '');
                    result += content ? `[markdown:${content}]` : '[markdown]';
                    break;
                }
                case 'contact': {
                    const parts = [kv.type, kv.id].filter(Boolean);
                    result += parts.length ? `[推荐:${parts.map((p) => sanitize(p)).join('/')}]` : '[推荐]';
                    break;
                }
                case 'share': {
                    const parts = [kv.title, kv.url].filter(Boolean);
                    result += parts.length ? `[链接:${parts.map((p) => sanitize(p)).join(' ')}]` : '[链接]';
                    break;
                }
                case 'location': {
                    const parts = [kv.title, kv.lat && kv.lon ? `${kv.lat},${kv.lon}` : ''].filter(Boolean);
                    result += `[位置:${parts.length ? parts.map((p) => sanitize(String(p))).join(' ') : '?'}]`;
                    break;
                }
                case 'xml': result += kv.data ? `[xml:${shortText(kv.data)}]` : '[xml]'; break;
                case 'light_app': {
                    const app = kv.app_name || kv.app || '';
                    result += app ? `[小程序:${sanitize(app)}]` : '[小程序]';
                    break;
                }
                case 'tts': result += kv.text ? `[语音:${sanitize(kv.text)}]` : '[语音]'; break;
                case 'poke': result += kv.id ? `[戳一戳:${sanitize(kv.id)}]` : '[戳一戳]'; break;
                case 'anonymous': {
                    const name = kv.name || kv.flag || '';
                    result += name ? `[匿名:${sanitize(name)}]` : '[匿名]';
                    break;
                }
                case 'shake': result += '[窗口抖动]'; break;
                case 'keyboard': result += '[按钮]'; break;
                default: result += `[${type}]`; break;
            }
            i = j + 1;
        } else {
            result += raw[i];
            i++;
        }
    }
    return result;
};

const clean = (v: unknown): string => sanitize(String(v ?? ''));
const pick = (...values: unknown[]): string => {
    for (const value of values) {
        const text = clean(value);
        if (text) return text;
    }
    return '';
};

/**
 * 将 Message 段格式化为带 ANSI 颜色的控制台字符串
 * @param m - 消息段
 */
export const formatMessage = (m: Message): string => {
    switch (m.type) {
        case 'text':
            return `${colors.green}${parseCQ(sanitize(m.data.text))}${colors.reset}`;
        case 'at':
            return m.data.qq === 'all'
                ? `${colors.blue}@全体成员${colors.reset}`
                : `${colors.blue}@${sanitize(String(m.data.qq))}${colors.reset}`;
        case 'reply': {
            const id = clean(m.data.id);
            return `${colors.gray}${id ? `[回复:${id}]` : '[回复]'}${colors.reset}`;
        }
        case 'image': {
            const f = pick(m.data.url, m.data.file, m.data.summary);
            return `${colors.magenta}${f ? `[图片:${f}]` : '[图片]'}${colors.reset}`;
        }
        case 'face':
            return `${colors.yellow}[表情:${clean(m.data.id) || '?'}]${colors.reset}`;
        case 'record': {
            const f = pick(m.data.url, m.data.file);
            return `${colors.brightYellow}${f ? `[语音:${f}]` : '[语音]'}${colors.reset}`;
        }
        case 'video': {
            const f = pick(m.data.url, m.data.file);
            return `${colors.brightMagenta}${f ? `[视频:${f}]` : '[视频]'}${colors.reset}`;
        }
        case 'file': {
            const f = pick(m.data.name, m.data.file, m.data.url);
            return `${colors.brightCyan}${f ? `[文件:${f}]` : '[文件]'}${colors.reset}`;
        }
        case 'json': {
            const raw = shortText(String(m.data.data ?? ''));
            return `${colors.gray}${raw ? `[json:${raw}]` : '[json]'}${colors.reset}`;
        }
        case 'markdown': {
            const content = shortText(String(m.data.content ?? m.data.data ?? ''));
            return `${colors.cyan}${content ? `[markdown:${content}]` : '[markdown]'}${colors.reset}`;
        }
        case 'music': {
            const parts = [clean(m.data.type), clean(m.data.id), clean(m.data.url)].filter(Boolean);
            return `${colors.magenta}${parts.length ? `[音乐:${parts.join(':')}]` : '[音乐]'}${colors.reset}`;
        }
        case 'dice': {
            const result = clean(m.data.result);
            return `${colors.yellow}${result ? `[骰子:${result}]` : '[骰子]'}${colors.reset}`;
        }
        case 'rps': {
            const result = clean(m.data.result);
            return `${colors.yellow}${result ? `[猜拳:${result}]` : '[猜拳]'}${colors.reset}`;
        }
        case 'node': {
            const id = pick(m.data.id, m.data.nickname, m.data.user_id);
            return `${colors.cyan}${id ? `[转发节点:${id}]` : '[转发节点]'}${colors.reset}`;
        }
        case 'forward': {
            const id = clean(m.data.id);
            return `${colors.cyan}${id ? `[转发:${id}]` : '[转发]'}${colors.reset}`;
        }
        case 'contact': {
            const type = clean(m.data.type);
            const id = clean(m.data.id);
            return `${colors.blue}${type || id ? `[推荐:${type}/${id}]` : '[推荐]'}${colors.reset}`;
        }
        case 'mface': {
            const id = clean(m.data.emoji_id);
            const summary = clean(m.data.summary);
            return `${colors.yellow}${id || summary ? `[商城表情:${[id, summary].filter(Boolean).join(':')}]` : '[商城表情]'}${colors.reset}`;
        }
        case 'share': {
            const title = clean(m.data.title);
            const url = clean(m.data.url);
            return `${colors.blue}${title || url ? `[链接:${[title, url].filter(Boolean).join(' ')}]` : '[链接]'}${colors.reset}`;
        }
        case 'location': {
            const title = clean(m.data.title);
            const lat = clean(m.data.lat);
            const lon = clean(m.data.lon);
            return `${colors.blue}[位置:${[title, lat && lon ? `${lat},${lon}` : ''].filter(Boolean).join(' ') || '?'}]${colors.reset}`;
        }
        case 'xml': {
            const data = shortText(String(m.data.data ?? m.data.xml ?? ''));
            return `${colors.gray}${data ? `[xml:${data}]` : '[xml]'}${colors.reset}`;
        }
        case 'light_app': {
            const app = pick(m.data.app_name, m.data.app);
            return `${colors.cyan}${app ? `[小程序:${app}]` : '[小程序]'}${colors.reset}`;
        }
        case 'keyboard': {
            return `${colors.cyan}[按钮]${colors.reset}`;
        }
        case 'tts': {
            const text = clean(m.data.text);
            return `${colors.brightYellow}${text ? `[语音:${text}]` : '[语音]'}${colors.reset}`;
        }
        case 'poke': {
            const id = clean(m.data.id);
            return `${colors.yellow}${id ? `[戳一戳:${id}]` : '[戳一戳]'}${colors.reset}`;
        }
        case 'anonymous': {
            const name = pick(m.data.name, m.data.flag);
            return `${colors.gray}${name ? `[匿名:${name}]` : '[匿名]'}${colors.reset}`;
        }
        case 'shake':
            return `${colors.yellow}[窗口抖动]${colors.reset}`;
        default:
            return `[${m.type}]`;
    }
};

/** 优先使用完整消息段格式化，缺失时回退到 raw_message CQ 解析 */
const formatSegments = (segments: Array<{ type: string; data: Record<string, any> }> | undefined, raw: string): string => {
    if (Array.isArray(segments) && segments.length > 0) {
        return segments.map((segment) => formatMessage(segment as unknown as Message)).join('');
    }
    return parseCQ(sanitize(raw));
};

/**
 * 控制台日志输出，按 type 分类带颜色格式化。
 *
 * - `system`：绿色 `[hotCatBotSystem]` 前缀
 * - `groupMessage`：解析群消息事件，显示群号/身份/发送者/内容
 * - `privateMessage`：解析私聊消息事件，显示来源/发送者/内容
 * - `error`：红色错误输出
 * - `sendGroupMessage` / `sendPrivateMessage`：解析发送的消息段并带颜色输出
 */
export class BotConsole {
    private static options = defaultOptions();
    public type: BotConsoleType;
    public content: string | GroupMessage | GroupMessageSelf | PrivateMessage | PrivateMessageSelf | Message[] | RequestFriend | RequestGroupAdd | RequestGroupInvite | NoticeEvent | { name: string; msg: string };

    /** 配置全局日志输出 */
    static configure(options: BotConsoleOptions): void {
        BotConsole.options = { ...BotConsole.options, ...options };
    }

    /** 恢复默认配置 */
    static reset(): void {
        BotConsole.options = defaultOptions();
    }

    /** 当前日志配置 */
    static getOptions(): Readonly<BotConsoleOptions> {
        return { ...BotConsole.options };
    }

    constructor(type: BotConsoleType, content: string | GroupMessage | GroupMessageSelf | PrivateMessage | PrivateMessageSelf | Message[] | RequestFriend | RequestGroupAdd | RequestGroupInvite | NoticeEvent | { name: string; msg: string }) {
        this.type = type;
        this.content = content;
    }
    log() {
        if (this.type === 'system') {
            this.print(`${colors.green}[hotCatBotSystem]:${colors.reset}`, this.content);
        } else if (this.type === 'groupMessage') {
            const event = this.content as GroupMessage;
            const sender = sanitize(event.sender.card || event.sender.nickname);
            const roleText = event.sender.role === 'owner' ? '群主' : event.sender.role === 'admin' ? '管理' : '';
            this.print(
                `${colors.cyan}[groupMessage]:${colors.reset} ` +
                `${colors.yellow}群${colors.reset}(${colors.cyan}${event.group_id}${colors.reset}) ` +
                `${colors.red}${roleText}${colors.reset} ` +
                `${colors.magenta}${sender}${colors.reset}(${colors.blue}${event.user_id}${colors.reset}): ` +
                `${formatSegments(event.message as any, event.raw_message)}`
            );
        } else if (this.type === 'privateMessage') {
            const event = this.content as PrivateMessage;
            const sender = sanitize(event.sender.nickname);
            const tag = event.sub_type === 'group' ? '群临时' : '好友';
            this.print(
                `${colors.yellow}[privateMessage]:${colors.reset} ` +
                `${colors.cyan}[${tag}]${colors.reset} ` +
                `${colors.magenta}${sender}${colors.reset}(${colors.blue}${event.user_id}${colors.reset}): ` +
                `${formatSegments(event.message as any, event.raw_message)}`
            );
        } else if (this.type === 'error') {
            this.print(`${colors.red}[error]${colors.red}`, this.content);
        } else if (this.type === 'sendGroupMessage') {
            const messages = this.content as Message[];
            this.print(`${colors.green}[sendGroupMessage]:${colors.reset} ${messages.map(formatMessage).join('')}`);
        } else if (this.type === 'sendPrivateMessage') {
            const messages = this.content as Message[];
            this.print(`${colors.green}[sendPrivateMessage]:${colors.reset} ${messages.map(formatMessage).join('')}`);
        } else if (this.type === 'groupMessageSelf') {
            const event = this.content as GroupMessageSelf;
            this.print(
                `${colors.cyan}[groupMessageSelf]:${colors.reset} ` +
                `${colors.yellow}群${colors.reset}(${colors.cyan}${event.group_id}${colors.reset}): ` +
                `${formatSegments(event.message as any, event.raw_message)}`
            );
        } else if (this.type === 'privateMessageSelf') {
            const event = this.content as PrivateMessageSelf;
            const tag = event.sub_type === 'group' ? '群临时' : '好友';
            this.print(
                `${colors.yellow}[privateMessageSelf]:${colors.reset} ` +
                `${colors.cyan}[${tag}]${colors.reset} ` +
                `${colors.magenta}发送给${colors.reset}(${colors.blue}${event.user_id}${colors.reset}): ` +
                `${formatSegments(event.message as any, event.raw_message)}`
            );
        } else if (this.type === 'requestFriend') {
            const event = this.content as RequestFriend;
            this.print(
                `${colors.yellow}[requestFriend]:${colors.reset} ` +
                `用户(${colors.blue}${event.user_id}${colors.reset}) 请求添加好友` +
                (event.comment ? ` 留言: ${colors.green}${sanitize(event.comment)}${colors.reset}` : '')
            );
        } else if (this.type === 'requestGroupAdd') {
            const event = this.content as RequestGroupAdd;
            this.print(
                `${colors.yellow}[requestGroupAdd]:${colors.reset} ` +
                `用户(${colors.blue}${event.user_id}${colors.reset}) 申请加入群(${colors.cyan}${event.group_id}${colors.reset})` +
                (event.comment ? ` 留言: ${colors.green}${sanitize(event.comment)}${colors.reset}` : '')
            );
        } else if (this.type === 'requestGroupInvite') {
            const event = this.content as RequestGroupInvite;
            this.print(
                `${colors.yellow}[requestGroupInvite]:${colors.reset} ` +
                `用户(${colors.blue}${event.user_id}${colors.reset}) 邀请 bot 加入群(${colors.cyan}${event.group_id}${colors.reset})` +
                (event.comment ? ` 留言: ${colors.green}${sanitize(event.comment)}${colors.reset}` : '')
            );
        } else if (this.type === 'notice') {
            const event = this.content as NoticeEvent;
            const label = event.sub_type
                ? `${event.notice_type}/${event.sub_type}`
                : event.notice_type;
            this.print(
                `${colors.cyan}[notice:${label}]:${colors.reset} ` +
                (event.user_id != null ? `用户(${colors.blue}${event.user_id}${colors.reset}) ` : '') +
                ('group_id' in event ? `群(${colors.cyan}${event.group_id}${colors.reset}) ` : '') +
                ('operator_id' in event ? `操作者(${colors.magenta}${event.operator_id}${colors.reset}) ` : '') +
                ('duration' in event ? `时长${event.duration}s ` : '') +
                ('message_id' in event ? `消息(${colors.gray}${event.message_id}${colors.reset}) ` : '') +
                ('card_new' in event ? `${sanitize(event.card_old)} → ${colors.green}${sanitize(event.card_new)}${colors.reset}` : '') +
                ('title' in event ? `${colors.green}${sanitize(event.title)}${colors.reset}` : '') +
                ('name_new' in event ? `${colors.green}${sanitize(event.name_new)}${colors.reset}` : '') +
                ('file' in event ? `文件:${(event as any).file.name}` : '')
            );
        } else if (this.type === 'plugin') {
            const { name, msg } = this.content as { name: string; msg: string };
            this.print(`${colors.magenta}[plugin:${name}]:${colors.reset} ${msg}`);
        } else if (this.type === 'debug') {
            this.print(`${colors.gray}[debug]${colors.reset} ${String(this.content)}`);
        } else if (this.type === 'info') {
            this.print(`${colors.cyan}[info]${colors.reset} ${String(this.content)}`);
        } else if (this.type === 'warn') {
            this.print(`${colors.yellow}[warn]${colors.reset} ${String(this.content)}`);
        }
    }

    private print(...args: unknown[]): void {
        const text = args.map((arg) => typeof arg === 'string' ? arg : formatError(arg)).join(' ');
        this.output(text, levelForType(this.type));
    }

    private output(text: string, level: BotLogLevel): void {
        const options = BotConsole.options;
        if (LEVEL_RANK[level] < LEVEL_RANK[options.level]) return;

        const time = new Date().toISOString();
        const plain = stripAnsi(text);

        if (options.onLog) {
            try {
                options.onLog({ time, level, type: this.type, message: plain });
            } catch {}
        }

        if (options.file) this.writeFile(plain, time, level);

        if (options.json) {
            console.log(JSON.stringify({ time, level, type: this.type, message: plain }));
        } else {
            console.log(`${options.timestamps ? `[${time}] ` : ''}${text}`);
        }
    }

    private writeFile(text: string, time: string, level: BotLogLevel): void {
        const options = BotConsole.options;
        try {
            const file = options.file;
            mkdirSync(dirname(file), { recursive: true });
            const line = options.json
                ? `${JSON.stringify({ time, level, type: this.type, message: text })}\n`
                : `${options.timestamps ? `[${time}] ` : ''}${text}\n`;
            const size = existsSync(file) ? statSync(file).size : 0;
            if (size > 0 && size + Buffer.byteLength(line) > options.maxSize) {
                this.rotate(file, Math.max(1, options.maxFiles));
            }
            appendFileSync(file, line, 'utf8');
        } catch (e) {
            console.error(`[BotConsole] 写入日志文件失败: ${formatError(e)}`);
        }
    }

    private rotate(file: string, maxFiles: number): void {
        const oldest = `${file}.${maxFiles}`;
        if (existsSync(oldest)) unlinkSync(oldest);
        for (let i = maxFiles - 1; i >= 1; i--) {
            const from = `${file}.${i}`;
            if (existsSync(from)) renameSync(from, `${file}.${i + 1}`);
        }
        if (existsSync(file)) renameSync(file, `${file}.1`);
    }
}
