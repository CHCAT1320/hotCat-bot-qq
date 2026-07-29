const cqEscape = (v: string) =>
    v.replace(/&/g, '&amp;').replace(/\[/g, '&#91;').replace(/\]/g, '&#93;').replace(/,/g, '&#44;');

const toBase64 = (file: string | Buffer): string =>
    Buffer.isBuffer(file) ? `base64://${file.toString('base64')}` : file;

/**
 * 消息段，搭配 {@link BotApi.sendMessage} / {@link BotApi.sendGroupMessage} 等发送方法使用。
 *
 * ## 收发支持情况
 * | 类型 | 发送 | 接收 | 说明 |
 * |------|:----:|:----:|------|
 * | `text` | ✅ | ✅ | 文本 |
 * | `at` | ✅ | ✅ | @某人 / @全体 |
 * | `reply` | ✅ | ✅ | 引用回复 |
 * | `face` | ✅ | ✅ | QQ 表情 |
 * | `image` | ✅ | ✅ | 图片 |
 * | `file` | ✅ | ✅ | 文件 |
 * | `video` | ✅ | ✅ | 短视频 |
 * | `record` | ✅ | ✅ | 语音 |
 * | `json` | ✅ | ✅ | JSON 消息段 |
 * | `dice` | ✅ | ✅ | 骰子 |
 * | `rps` | ✅ | ✅ | 猜拳 |
 * | `markdown` | ✅ | ✅ | Markdown |
 * | `forward` | ✅ | ✅ | 合并转发 |
 * | `mface` | ✅ | — | 商城表情（收归入 `image`） |
 * | `music` | ✅ | — | 音乐分享 |
 * | `node` | ✅ | — | 合并转发节点 |
 * | `contact` | ✅ | — | 推荐联系人/群 |
 * | `poke` | — | ✅ | 戳一戳（仅接收） |
 */
export class Message {
    type: string;
    data: Record<string, any>;

    private constructor(type: string, data: Record<string, any>) {
        this.type = type;
        this.data = data;
    }

    /** 文本消息段（发+收） */
    static text(text: string) {
        return new Message('text', { text });
    }

    /** @某人，传 QQ 号或 `'all'`（发+收） */
    static at(qq: string | number) {
        return new Message('at', { qq: String(qq) });
    }

    /** @全体成员（发） */
    static atAll() {
        return new Message('at', { qq: 'all' });
    }

    /** QQ 表情，传表情 ID（发+收） */
    static face(id: string | number) {
        return new Message('face', { id: String(id) });
    }

    /** 商城表情（仅发送，接收时归入 image 段） */
    static mface(emoji_id: string | number, emoji_package_id: string | number, key: string, summary?: string) {
        return new Message('mface', { emoji_id: String(emoji_id), emoji_package_id: String(emoji_package_id), key, summary: summary ?? '' });
    }

    /** 图片，`file` 支持本地路径 / URL / Buffer（发+收） */
    static image(file: string | Buffer, summary?: string, sub_type?: string | number) {
        return new Message('image', { file: toBase64(file), summary: summary ?? '', sub_type: sub_type != null ? String(sub_type) : '0' });
    }

    /** 引用回复，传消息 ID（发+收） */
    static reply(id: string | number) {
        return new Message('reply', { id: String(id) });
    }

    /** 文件，`file` 支持本地路径 / URL / Buffer（发+收） */
    static file(file: string | Buffer, name?: string) {
        return new Message('file', { file: toBase64(file), name: name ?? '' });
    }

    /** 短视频，`file` 支持本地路径 / URL / Buffer（发+收） */
    static video(file: string | Buffer, name?: string, thumb?: string) {
        return new Message('video', { file: toBase64(file), name: name ?? '', thumb: thumb ?? '' });
    }

    /** 语音，`file` 支持本地路径 / URL / Buffer（发+收） */
    static record(file: string | Buffer, name?: string, thumb?: string) {
        return new Message('record', { file: toBase64(file), name: name ?? '', thumb: thumb ?? '' });
    }

    /** JSON 消息段（发+收） */
    static json(data: string) {
        return new Message('json', { data });
    }

    /** 骰子（发+收） */
    static dice() {
        return new Message('dice', {});
    }

    /** 猜拳（发+收） */
    static rps() {
        return new Message('rps', {});
    }

    /** Markdown 消息（发+收） */
    static markdown(content: string) {
        return new Message('markdown', { content });
    }

    /** 平台音乐分享，type 支持 qq/163/kugou/migu/kuwo（仅发送） */
    static music(type: 'qq' | '163' | 'kugou' | 'migu' | 'kuwo', id: string | number) {
        return new Message('music', { type, id: String(id) });
    }

    /** 自定义音乐分享，需配置签名服务器（仅发送） */
    static customMusic(type: 'qq' | '163' | 'kugou' | 'migu' | 'kuwo' | 'custom', url: string, image: string, audio?: string, title?: string, singer?: string) {
        return new Message('music', { type, url, image, audio: audio ?? '', title: title ?? '', singer: singer ?? '' });
    }

    /** 合并转发节点（引用已有消息，仅发送） */
    static node(id: string | number, user_id?: string | number, nickname?: string, source?: string, news?: { text: string }[], summary?: string, prompt?: string, time?: string | number) {
        return new Message('node', {
            id: String(id),
            user_id: user_id != null ? String(user_id) : '',
            nickname: nickname ?? '',
            source: source ?? '',
            news: news ?? [],
            summary: summary ?? '',
            prompt: prompt ?? '',
            time: time != null ? String(time) : '',
        });
    }

    /** 合并转发节点（自定义内容，仅发送） */
    static customNode(content: Message[], user_id?: string | number, nickname?: string, source?: string, news?: { text: string }[], summary?: string, prompt?: string, time?: string | number) {
        return new Message('node', {
            content: content.map(m => m.toJson()),
            user_id: user_id != null ? String(user_id) : '',
            nickname: nickname ?? '',
            source: source ?? '',
            news: news ?? [],
            summary: summary ?? '',
            prompt: prompt ?? '',
            time: time != null ? String(time) : '',
        });
    }

    /** 合并转发，传 message_id（发+收） */
    static forward(message_id: number) {
        return new Message('forward', { id: String(message_id) });
    }

    /** 推荐联系人/群（仅发送） */
    static contact(type: 'qq' | 'group', id: string | number) {
        return new Message('contact', { type, id: String(id) });
    }

    /**
     * 从 napcat 事件中的 message 段构造 Message（收消息还原）
     * 支持的接收类型：text/at/image/file/poke/dice/rps/face/reply/video/record/forward/json/markdown
     * @param seg - `{ type: string, data: object }`
     */
    static from(seg: { type: string; data: Record<string, any> }) {
        return new Message(seg.type, { ...seg.data });
    }

    /**
     * 转为 napcat API 所需的 JSON 格式
     * @returns `{ type, data }`
     */
    toJson() {
        const result: Record<string, any> = { type: this.type, data: {} };
        for (const key of Object.keys(this.data)) {
            const val = this.data[key];
            if (key === 'news' && Array.isArray(val)) {
                result.data[key] = val;
            } else if (key === 'content' && Array.isArray(val)) {
                result.data[key] = val;
            } else if (val !== '' && val != null) {
                result.data[key] = val;
            }
        }
        return result as { type: string; data: Record<string, any> };
    }

    /**
     * 转为 CQ 码字符串
     * @returns 例如 `[CQ:at,qq=123456]`
     */
    toCQ(): string {
        if (this.type === 'text') {
            return cqEscape(this.data.text ?? '');
        }
        const parts: string[] = [];
        for (const [k, v] of Object.entries(this.data)) {
            if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) continue;
            parts.push(`${k}=${cqEscape(Array.isArray(v) ? JSON.stringify(v) : String(v))}`);
        }
        return `[CQ:${this.type},${parts.join(',')}]`;
    }
}
