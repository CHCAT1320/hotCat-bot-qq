import { GroupMessage, GroupMessageSelf, PrivateFriendMessage, PrivateGroupMessage, PrivateFriendMessageSelf, PrivateGroupMessageSelf, RequestFriend, RequestGroupAdd, RequestGroupInvite } from 'node-napcat-ts';
import { Message } from './message';

/** 私聊消息联合类型 */
export type PrivateMessage = PrivateFriendMessage | PrivateGroupMessage;
/** 自发送私聊消息联合类型 */
export type PrivateMessageSelf = PrivateFriendMessageSelf | PrivateGroupMessageSelf;
/** 群请求联合类型 */
export type RequestGroup = RequestGroupAdd | RequestGroupInvite;
/** notice 事件通用类型 */
export type NoticeEvent = Record<string, any> & { post_type: 'notice'; notice_type: string; sub_type?: string };
/** BotConsole 日志分类 */
export type BotConsoleType = 'system' | 'groupMessage' | 'privateMessage' | 'error' | 'sendGroupMessage' | 'sendPrivateMessage' | 'groupMessageSelf' | 'privateMessageSelf' | 'requestFriend' | 'requestGroupAdd' | 'requestGroupInvite' | 'notice';

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
            while (j < raw.length) {
                if (raw[j] === '[') depth++;
                else if (raw[j] === ']') { depth--; if (depth === 0) break; }
                j++;
            }
            if (depth !== 0) { result += raw[i]; i++; continue; }
            const params = raw.slice(commaIdx + 1, j);
            const kv: Record<string, string> = {};
            params.split(',').forEach(p => {
                const eq = p.indexOf('=');
                if (eq > 0) kv[p.slice(0, eq)] = p.slice(eq + 1);
            });
            switch (type) {
                case 'image': result += kv.url ? `[图片:${sanitize(kv.url)}]` : '[图片]'; break;
                case 'face': result += `[表情:${kv.id || '?'}]`; break;
                case 'at': result += kv.qq === 'all' ? '[@全体]' : `[@${kv.qq || '?'}]`; break;
                case 'record': result += kv.url ? `[语音:${sanitize(kv.url)}]` : '[语音]'; break;
                case 'video': result += kv.url ? `[视频:${sanitize(kv.url)}]` : '[视频]'; break;
                case 'reply': result += '[回复]'; break;
                case 'file': result += kv.url ? `[文件:${sanitize(kv.url)}]` : '[文件]'; break;
                case 'dice': result += '[骰子]'; break;
                case 'rps': result += '[猜拳]'; break;
                case 'json': result += '[json]'; break;
                case 'forward': result += '[转发]'; break;
                case 'music': result += '[音乐]'; break;
                case 'mface': result += '[商城表情]'; break;
                case 'markdown': result += '[markdown]'; break;
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
        case 'reply':
            return `${colors.gray}[回复]${colors.reset}`;
        case 'image': {
            const f = sanitize(String(m.data.file || ''));
            const short = f.length > 60 ? f.slice(0, 57) + '...' : f;
            return `${colors.magenta}[图片:${short}]${colors.reset}`;
        }
        case 'face':
            return `${colors.yellow}[表情:${m.data.id}]${colors.reset}`;
        case 'record': {
            const f = sanitize(String(m.data.file || ''));
            const short = f.length > 60 ? f.slice(0, 57) + '...' : f;
            return `${colors.brightYellow}[语音:${short}]${colors.reset}`;
        }
        case 'video': {
            const f = sanitize(String(m.data.file || ''));
            const short = f.length > 60 ? f.slice(0, 57) + '...' : f;
            return `${colors.brightMagenta}[视频:${short}]${colors.reset}`;
        }
        case 'file': {
            const f = sanitize(String(m.data.name || m.data.file || ''));
            const short = f.length > 60 ? f.slice(0, 57) + '...' : f;
            return `${colors.brightCyan}[文件:${short}]${colors.reset}`;
        }
        case 'json':
            return `${colors.gray}[json]${colors.reset}`;
        case 'markdown':
            return `${colors.cyan}[markdown]${colors.reset}`;
        case 'music':
            return `${colors.magenta}[音乐]${colors.reset}`;
        case 'dice':
            return `${colors.yellow}[骰子]${colors.reset}`;
        case 'rps':
            return `${colors.yellow}[猜拳]${colors.reset}`;
        case 'node':
            return `${colors.cyan}[转发节点]${colors.reset}`;
        case 'forward':
            return `${colors.cyan}[转发:${sanitize(String(m.data.id))}]${colors.reset}`;
        case 'contact':
            return `${colors.blue}[推荐:${sanitize(String(m.data.type))}/${sanitize(String(m.data.id))}]${colors.reset}`;
        case 'mface':
            return `${colors.yellow}[商城表情]${colors.reset}`;
        default:
            return `[${m.type}]`;
    }
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
    public type: BotConsoleType;
    public content: string | GroupMessage | GroupMessageSelf | PrivateMessage | PrivateMessageSelf | Message[] | RequestFriend | RequestGroupAdd | RequestGroupInvite | NoticeEvent;
    constructor(type: BotConsoleType, content: string | GroupMessage | GroupMessageSelf | PrivateMessage | PrivateMessageSelf | Message[] | RequestFriend | RequestGroupAdd | RequestGroupInvite | NoticeEvent) {
        this.type = type;
        this.content = content;
    }
    log() {
        if (this.type === 'system') {
            console.log(`${colors.green}[hotCatBotSystem]: ${colors.reset}`, this.content);
        } else if (this.type === 'groupMessage') {
            const event = this.content as GroupMessage;
            const sender = sanitize(event.sender.card || event.sender.nickname);
            const roleText = event.sender.role === 'owner' ? '群主' : event.sender.role === 'admin' ? '管理' : '';
            console.log(
                `${colors.cyan}[groupMessage]:${colors.reset} ` +
                `${colors.yellow}群${colors.reset}(${colors.cyan}${event.group_id}${colors.reset}) ` +
                `${colors.red}${roleText}${colors.reset} ` +
                `${colors.magenta}${sender}${colors.reset}(${colors.blue}${event.user_id}${colors.reset}): ` +
                `${colors.green}${parseCQ(sanitize(event.raw_message))}${colors.reset}`
            );
        } else if (this.type === 'privateMessage') {
            const event = this.content as PrivateMessage;
            const sender = sanitize(event.sender.nickname);
            const tag = event.sub_type === 'group' ? '群临时' : '好友';
            console.log(
                `${colors.yellow}[privateMessage]:${colors.reset} ` +
                `${colors.cyan}[${tag}]${colors.reset} ` +
                `${colors.magenta}${sender}${colors.reset}(${colors.blue}${event.user_id}${colors.reset}): ` +
                `${colors.green}${parseCQ(sanitize(event.raw_message))}${colors.reset}`
            );
        } else if (this.type === 'error') {
            console.log(`${colors.red}[error]${colors.red}`, this.content);
        } else if (this.type === 'sendGroupMessage') {
            const messages = this.content as Message[];
            console.log(`${colors.green}[sendGroupMessage]:${colors.reset} ${messages.map(formatMessage).join('')}`);
        } else if (this.type === 'sendPrivateMessage') {
            const messages = this.content as Message[];
            console.log(`${colors.green}[sendPrivateMessage]:${colors.reset} ${messages.map(formatMessage).join('')}`);
        } else if (this.type === 'groupMessageSelf') {
            const event = this.content as GroupMessageSelf;
            console.log(
                `${colors.cyan}[groupMessageSelf]:${colors.reset} ` +
                `${colors.yellow}群${colors.reset}(${colors.cyan}${event.group_id}${colors.reset}): ` +
                `${colors.green}${parseCQ(sanitize(event.raw_message))}${colors.reset}`
            );
        } else if (this.type === 'privateMessageSelf') {
            const event = this.content as PrivateMessageSelf;
            const tag = event.sub_type === 'group' ? '群临时' : '好友';
            console.log(
                `${colors.yellow}[privateMessageSelf]:${colors.reset} ` +
                `${colors.cyan}[${tag}]${colors.reset} ` +
                `${colors.magenta}发送给${colors.reset}(${colors.blue}${event.user_id}${colors.reset}): ` +
                `${colors.green}${parseCQ(sanitize(event.raw_message))}${colors.reset}`
            );
        } else if (this.type === 'requestFriend') {
            const event = this.content as RequestFriend;
            console.log(
                `${colors.yellow}[requestFriend]:${colors.reset} ` +
                `用户(${colors.blue}${event.user_id}${colors.reset}) 请求添加好友` +
                (event.comment ? ` 留言: ${colors.green}${sanitize(event.comment)}${colors.reset}` : '')
            );
        } else if (this.type === 'requestGroupAdd') {
            const event = this.content as RequestGroupAdd;
            console.log(
                `${colors.yellow}[requestGroupAdd]:${colors.reset} ` +
                `用户(${colors.blue}${event.user_id}${colors.reset}) 申请加入群(${colors.cyan}${event.group_id}${colors.reset})` +
                (event.comment ? ` 留言: ${colors.green}${sanitize(event.comment)}${colors.reset}` : '')
            );
        } else if (this.type === 'requestGroupInvite') {
            const event = this.content as RequestGroupInvite;
            console.log(
                `${colors.yellow}[requestGroupInvite]:${colors.reset} ` +
                `用户(${colors.blue}${event.user_id}${colors.reset}) 邀请 bot 加入群(${colors.cyan}${event.group_id}${colors.reset})` +
                (event.comment ? ` 留言: ${colors.green}${sanitize(event.comment)}${colors.reset}` : '')
            );
        } else if (this.type === 'notice') {
            const event = this.content as NoticeEvent;
            const label = event.sub_type
                ? `${event.notice_type}/${event.sub_type}`
                : event.notice_type;
            console.log(
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
        }
    }
}
