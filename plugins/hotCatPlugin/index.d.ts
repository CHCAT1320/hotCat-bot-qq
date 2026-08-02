import { PluginBase } from 'hotcat-bot-qq/plugin';
import { BotApi } from 'hotcat-bot-qq/botApi';
import { BotClient } from 'hotcat-bot-qq/botClient';
export declare class HotCatPlugin extends PluginBase {
    static meta: {
        name: string;
        version: string;
        description: string;
        author: string;
    };
    private startTime;
    static create(api: BotApi, bot: BotClient): HotCatPlugin;
    load(): Promise<void>;
    unload(): Promise<void>;
    private onGroupMsg;
    private formatUptime;
}
