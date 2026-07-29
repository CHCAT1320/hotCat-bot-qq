import { NCWebsocketOptions } from 'node-napcat-ts';
import { BotApi } from './botApi';
import { BotConsole } from './botConsole';
import { BotEvent } from './botEvent';

/**
 * Bot 客户端，封装连接、启动流程及 bot 自身信息。
 *
 * @example
 * ```ts
 * const bot = new BotClient({
    baseUrl: 'ws://localhost:8082/onebot/v11/ws/',
    accessToken: 'yourAccessToken',
    reconnection: {
        enable: true,
        attempts: 10,
        delay: 5000,
    },
   });
 * await bot.start();
 * ```
 */
export class BotClient {
    /** API 调用入口 */
    public api: BotApi;
    /** 事件监听入口 */
    public event: BotEvent;
    /** 登录后 bot 自身昵称 */
    public nickname: string | null;
    /** 登录后 bot 自身 QQ 号 */
    public id: number | null;

    constructor(config: NCWebsocketOptions) {
        this.api = new BotApi(config);
        this.api.client = this;
        this.event = new BotEvent(this.api, this);
        this.nickname = null;
        this.id = null;
    }

    /**
     * 连接 napcat 并初始化事件监听，启动成功后自动填充 {@link nickname} 和 {@link id}。
     */
    async start() {
        await this.api.connect();
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
    }
}
