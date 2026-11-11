import { PluginBase } from 'hotcat-bot-qq/plugin';
import { Message } from 'hotcat-bot-qq/message';
import * as os from 'os';
export class HotCatPlugin extends PluginBase {
    constructor() {
        super(...arguments);
        this.startTime = 0;
        this.onGroupMsg = async (_bot, event) => {
            const msg = event.raw_message.trim();
            if (!this.isInfoCommand(msg))
                return;
            await this.api.sendGroupMessage(event.group_id, Message.reply(event.message_id), Message.text(this.buildInfo()));
        };
        this.onPrivateMsg = async (_bot, event) => {
            const msg = event.raw_message.trim();
            if (!this.isInfoCommand(msg))
                return;
            await this.api.sendPrivateMessage(event.user_id, Message.text(this.buildInfo()));
        };
    }
    static create(api, bot) {
        return new HotCatPlugin(api, bot);
    }
    async load() {
        this.startTime = Date.now();
        this.bot.event.message.onGroupMessage(this.onGroupMsg);
        this.bot.event.message.onPrivateMessage(this.onPrivateMsg);
    }
    async unload() {
        this.bot.event.message.offGroupMessage(this.onGroupMsg);
        this.bot.event.message.offPrivateMessage(this.onPrivateMsg);
    }
    isInfoCommand(msg) {
        return msg === '#hotCat' || msg === '#hotcat';
    }
    buildInfo() {
        const uptime = this.formatUptime(Date.now() - this.startTime);
        const platform = os.platform();
        const arch = os.arch();
        return `HotCat 信息\n` +
            `版本：${this.meta.version}\n` +
            `平台：${platform} ${arch}\n` +
            `运行时间：${uptime}\n` +
            `管理员QQ: ${this.bot.owner}\n` +
            `Github: https://github.com/CHCAT1320/hotCat-bot-qq\n` +
            `开发文档: https://hotcat-bot-qq.docs.chcat1320.top\n` +
            `交流群: 638144340\n` +
            `基于 MIT 许可发布 版权所有 © 2026 CHCAT1320`;
    }
    formatUptime(ms) {
        const s = Math.floor(ms / 1000);
        const d = Math.floor(s / 86400);
        const h = Math.floor((s % 86400) / 3600);
        const m = Math.floor((s % 3600) / 60);
        const parts = [];
        if (d > 0)
            parts.push(`${d}天`);
        if (h > 0)
            parts.push(`${h}小时`);
        if (m > 0)
            parts.push(`${m}分钟`);
        return parts.length > 0 ? parts.join(' ') : '小于1分钟';
    }
}
HotCatPlugin.meta = {
    name: 'hotCatPlugin',
    version: '0.1.11',
    description: 'HotCat 默认插件（群聊/私聊 #hotCat 指令查询 bot 状态）',
    author: 'CHCAT1320',
};
