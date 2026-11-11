import type { NCWebsocketOptions } from 'node-napcat-ts';
import { BotApi } from './botApi';
import { BotConsole } from './botConsole';
import { BotEvent } from './botEvent';
import { BotScheduler } from './botScheduler';
import { existsSync, mkdirSync, cpSync, readdirSync, readFileSync, statSync, lstatSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

/** Bot 配置 */
export interface BotConfig {
    baseUrl: string;
    accessToken?: string;
    /** Bot 主人（管理员）QQ 号，必填，未配置将拒绝启动 */
    owner: number;
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
 *     owner: 123456789,
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
    /** Bot 主人（管理员）QQ 号，来自配置项 `owner` */
    public owner: number;

    constructor(config: BotConfig) {
        const owner = Number(config?.owner);
        if (!Number.isInteger(owner) || owner <= 0) {
            throw new Error('未配置 bot 主人 QQ 号：请在 BotClient 配置中填写 owner 字段，例如 owner: 123456789，未配置前无法启动');
        }
        const baseUrl = typeof config?.baseUrl === 'string' ? config.baseUrl.trim() : '';
        if (!baseUrl) {
            throw new Error('未配置 NapCat WebSocket 地址：请在 BotClient 配置中填写 baseUrl 字段，例如 baseUrl: "ws://localhost:8082/onebot/v11/ws/"，未配置前无法启动');
        }
        if (!/^wss?:\/\/\S+$/i.test(baseUrl)) {
            throw new Error('baseUrl 格式错误：必须以 ws:// 或 wss:// 开头，例如 ws://localhost:8082/onebot/v11/ws/');
        }
        this.owner = owner;
        this.api = new BotApi({ ...config, baseUrl } as NCWebsocketOptions);
        this.api.client = this;
        this.event = new BotEvent(this.api, this);
        this.scheduler = new BotScheduler();
        this.nickname = null;
        this.id = null;
    }

    /**
     * 判断指定 QQ 号是否为 bot 主人
     * @param qq - 待判断的 QQ 号
     */
    isOwner(qq: number | string): boolean {
        return Number(qq) === this.owner;
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
        const selfDir = dirname(fileURLToPath(import.meta.url))
        const src = join(selfDir, '..', 'plugins', 'hotCatPlugin')
        if (!existsSync(src)) return

        const dest = join(process.cwd(), 'plugins', 'hotCatPlugin')
        mkdirSync(join(process.cwd(), 'plugins'), { recursive: true })

        if (!existsSync(dest)) {
            cpSync(src, dest, { recursive: true })
            new BotConsole('system', '默认插件 hotCatPlugin 已创建').log()
            return
        }

        const updated = this.syncPluginFiles(src, dest)
        if (updated.length > 0) {
            new BotConsole('system', `默认插件 hotCatPlugin 已更新: ${updated.join(', ')}`).log()
        }
    }

    private syncPluginFiles(src: string, dest: string): string[] {
        const updated: string[] = []

        const walkDir = (dir: string): string[] => {
            const entries = readdirSync(dir)
            const files: string[] = []
            for (const entry of entries) {
                const full = join(dir, entry)
                if (lstatSync(full).isDirectory()) {
                    files.push(...walkDir(full))
                } else {
                    files.push(full)
                }
            }
            return files
        }

        const srcFiles = walkDir(src)

        for (const file of srcFiles) {
            const rel = relative(src, file)
            const target = join(dest, rel)

            if (!existsSync(target)) {
                mkdirSync(dirname(target), { recursive: true })
                cpSync(file, target)
                updated.push(rel)
                continue
            }

            if (statSync(file).size !== statSync(target).size) {
                cpSync(file, target)
                updated.push(rel)
                continue
            }

            const srcContent = readFileSync(file)
            const destContent = readFileSync(target)
            if (!srcContent.equals(destContent)) {
                cpSync(file, target)
                updated.push(rel)
            }
        }

        return updated
    }
}
