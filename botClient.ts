import type { NCWebsocketOptions } from 'node-napcat-ts';
import { BotApi } from './botApi';
import { BotConsole } from './botConsole';
import { BotEvent } from './botEvent';
import { BotScheduler } from './botScheduler';
import { existsSync, mkdirSync, cpSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

/** Bot 配置 */
export interface BotConfig {
    baseUrl: string;
    accessToken?: string;
    reconnection?: {
        enable?: boolean;
        attempts?: number;
        delay?: number;
    };
    apiTimeout?: number;
}

/**
 * Bot 客户端，封装连接、启动流程及 bot 自身信息。
 *
 * @example
 * const bot = new BotClient({
 *     baseUrl: 'ws://localhost:8082/onebot/v11/ws/',
 *     accessToken: 'yourAccessToken',
 * })
 * await bot.start()
 */
export class BotClient {
    public api: BotApi;
    public event: BotEvent;
    public scheduler: BotScheduler;
    public plugin!: import('./botPlugin').BotPluginSystem;
    public nickname: string | null;
    public id: number | null;

    constructor(config: BotConfig) {
        this.api = new BotApi(config as NCWebsocketOptions);
        this.api.client = this;
        this.event = new BotEvent(this.api, this);
        this.scheduler = new BotScheduler();
        this.nickname = null;
        this.id = null;
    }

    /**
     * 连接 napcat 并初始化事件监听，启动成功后自动填充 {@link nickname} 和 {@link id}。
     */
    async start() {
        await this.api.connect();
        const { BotPluginSystem } = await import('./botPlugin');
        this.plugin = new BotPluginSystem(this.api, this);
        this.api.napcat.on('meta_event.lifecycle.connect', () => {
            new BotConsole('system', 'napcat服务器连接成功').log();
        });
        try {
            const loginInfo = await this.api.getLoginInfo();
            new BotConsole('system', `bot启动成功，昵称: ${loginInfo.nickname}, 用户ID: ${loginInfo.user_id}`).log();
            this.nickname = loginInfo.nickname;
            this.id = loginInfo.user_id;
        } catch (e) {
            new BotConsole('error', e instanceof Error ? e.message : JSON.stringify(e)).log();
        }
        this.seedDefaultPlugin();
        await this.plugin.scan('./plugins');
        this.plugin.watch('./plugins');
    }

    private seedDefaultPlugin(): void {
        const dest = join(process.cwd(), 'plugins', 'hotCatPlugin')
        if (existsSync(dest)) return

        const selfDir = dirname(fileURLToPath(import.meta.url))
        const src = join(selfDir, '..', 'plugins', 'hotCatPlugin')
        if (!existsSync(src)) return

        mkdirSync(join(process.cwd(), 'plugins'), { recursive: true })
        cpSync(src, dest, { recursive: true })
        new BotConsole('system', '默认插件 hotCatPlugin 已创建').log()
    }
}
