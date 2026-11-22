import type { NCWebsocketOptions } from 'node-napcat-ts';
import { BotApi } from './botApi';
import { BotConsole, formatError, type BotConsoleOptions } from './botConsole';
import { BotCommandSystem } from './botCommand';
import { MessageContext, type MessageEventLike } from './botContext';
import { BotEvent } from './botEvent';
import { BotScheduler } from './botScheduler';
import { BotStorage } from './botStorage';
import { existsSync, mkdirSync, cpSync, readdirSync, readFileSync, statSync, lstatSync } from 'fs';
import { join, dirname, relative, resolve } from 'path';
import { fileURLToPath } from 'url';

/** 连接状态 */
export type BotConnectionState = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed' | 'stopped';

/** 连接状态快照 */
export interface BotStatus {
    connection: BotConnectionState;
    online: boolean;
    attempts: number;
}

/** 状态变化监听器 */
export type BotStatusListener = (status: BotStatus) => void;

/** 可注入的组件，便于测试和多实例 */
export interface BotClientDeps {
    api?: BotApi;
    event?: BotEvent;
    scheduler?: BotScheduler;
    storage?: BotStorage;
}

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
    /** 插件目录，默认 ./plugins */
    pluginDir?: string;
    /** 是否自动扫描并监听插件目录，默认 true */
    autoLoadPlugins?: boolean;
    /** 是否注册 SIGINT/SIGTERM 优雅退出，默认 true */
    handleSignals?: boolean;
    /** 存储文件路径，默认 ./data/storage.json */
    storagePath?: string;
    /** 命令前缀，默认 # */
    commandPrefix?: string | string[];
    /** 命令冷却时是否回复提示，默认 false */
    commandCooldownReply?: boolean;
    /** 日志配置，等价于 BotConsole.configure() */
    log?: BotConsoleOptions;
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
    public command: BotCommandSystem;
    public storage: BotStorage;
    public nickname: string | null;
    public id: number | null;
    /** Bot 主人（管理员）QQ 号，来自配置项 `owner` */
    public owner: number;
    /** bot QQ 是否在线 */
    public online: boolean;
    /** 当前连接状态 */
    public status: BotConnectionState;
    /** 插件目录 */
    public pluginDir: string;
    /** 是否自动扫描插件目录 */
    public autoLoadPlugins: boolean;
    private handleSignals: boolean;
    private statusListeners = new Set<BotStatusListener>();
    private signalHandlers: { sigint: () => void; sigterm: () => void } | null = null;
    private attempts = 0;
    private started = false;
    private stopping = false;
    private runId = 0;

    constructor(config: BotConfig, deps: BotClientDeps = {}) {
        const owner = Number(config?.owner);
        if (!Number.isInteger(owner) || owner <= 0) {
            throw new Error('未配置 bot 主人 QQ 号：请在 BotClient 配置中填写 owner 字段，例如 owner: 123456789，未配置前无法启动');
        }
        const baseUrl = typeof config?.baseUrl === 'string' ? config.baseUrl.trim() : '';
        if (!baseUrl) {
            throw new Error('未配置 NapCat WebSocket 地址：请在 BotClient 配置中填写 baseUrl 字段，例如 baseUrl: "ws://localhost:8082/onebot/v11/ws/"，未配置前无法启动');
        }
        let parsedUrl: URL;
        try {
            parsedUrl = new URL(baseUrl);
        } catch {
            throw new Error('baseUrl 格式错误：不是合法的 URL，例如 ws://localhost:8082/onebot/v11/ws/');
        }
        if (parsedUrl.protocol !== 'ws:' && parsedUrl.protocol !== 'wss:') {
            throw new Error('baseUrl 格式错误：必须以 ws:// 或 wss:// 开头，例如 ws://localhost:8082/onebot/v11/ws/');
        }
        this.owner = owner;
        this.online = false;
        this.status = 'idle';
        if (config.log) BotConsole.configure(config.log);
        this.pluginDir = config.pluginDir ?? './plugins';
        this.autoLoadPlugins = config.autoLoadPlugins ?? true;
        this.handleSignals = config.handleSignals ?? true;
        this.storage = deps.storage ?? new BotStorage(config.storagePath ?? join(process.cwd(), 'data', 'storage.json'));
        const reconnection = {
            enable: config.reconnection?.enable ?? true,
            attempts: config.reconnection?.attempts ?? Infinity,
            delay: config.reconnection?.delay ?? 5000,
        };
        this.api = deps.api ?? new BotApi({ ...config, baseUrl, reconnection } as NCWebsocketOptions);
        this.api.client = this;
        this.event = deps.event ?? new BotEvent(this.api, this);
        this.scheduler = deps.scheduler ?? new BotScheduler(this.storage.namespace('scheduler'));
        this.command = new BotCommandSystem(this, {
            prefix: config.commandPrefix,
            cooldownReply: config.commandCooldownReply,
        });
        this.nickname = null;
        this.id = null;
        this.setupSocketLogging();
        this.setupBotStatusLogging();
    }

    /** 当前连接状态快照 */
    getStatus(): BotStatus {
        return { connection: this.status, online: this.online, attempts: this.attempts };
    }

    /** 监听连接/在线状态变化，返回取消函数 */
    onStatusChange(listener: BotStatusListener): () => void {
        this.statusListeners.add(listener);
        try {
            listener(this.getStatus());
        } catch (e) {
            new BotConsole('error', `状态监听器执行失败: ${formatError(e)}`).log();
        }
        return () => this.statusListeners.delete(listener);
    }

    /** 创建消息上下文，便捷回复/撤回/权限判断 */
    context(event: MessageEventLike): MessageContext {
        return new MessageContext(this, event);
    }

    private emitStatus(): void {
        const status = this.getStatus();
        for (const listener of Array.from(this.statusListeners)) {
            try {
                listener(status);
            } catch (e) {
                new BotConsole('error', `状态监听器执行失败: ${formatError(e)}`).log();
            }
        }
    }

    private setConnection(connection: BotConnectionState, attempts = this.attempts): void {
        this.attempts = attempts;
        if (this.status === connection) return;
        this.status = connection;
        this.emitStatus();
    }

    private setOnline(online: boolean): void {
        if (this.online === online) return;
        this.online = online;
        this.emitStatus();
    }

    private setupBotStatusLogging(): void {
        const napcat = this.api.napcat;
        napcat.on('notice.bot_offline', (event) => {
            this.setOnline(false);
            const detail = [event.tag, event.message].filter(Boolean).join(': ');
            new BotConsole('error', `bot QQ 已掉线${detail ? `（${detail}）` : ''}，请检查 NapCat / QQ 登录状态`).log();
        });
        napcat.on('meta_event.lifecycle.connect', () => {
            if (!this.online) {
                this.setOnline(true);
                new BotConsole('system', 'bot QQ 已上线').log();
            }
        });
        napcat.on('meta_event.lifecycle.enable', () => {
            if (!this.online) {
                this.setOnline(true);
                new BotConsole('system', 'bot QQ 已上线（账号恢复）').log();
            }
        });
        napcat.on('meta_event.lifecycle.disable', () => {
            if (this.online) {
                this.setOnline(false);
                new BotConsole('error', 'bot QQ 已下线，请检查 NapCat / QQ 登录状态').log();
            }
        });
        napcat.on('meta_event.heartbeat', (event) => {
            const offline = event.status?.online === false || event.status?.good === false;
            if (offline && this.online) {
                this.setOnline(false);
                new BotConsole('error', 'bot QQ 心跳异常，已离线，请检查 NapCat / QQ 登录状态').log();
            } else if (!offline && !this.online) {
                this.setOnline(true);
                new BotConsole('system', 'bot QQ 已恢复在线').log();
            }
        });
    }

    private setupSocketLogging(): void {
        const napcat = this.api.napcat;
        napcat.on('socket.connecting', ({ reconnection }) => {
            this.setConnection(reconnection.nowAttempts > 1 ? 'reconnecting' : 'connecting', reconnection.nowAttempts);
            new BotConsole('system', `正在连接 napcat...（第 ${reconnection.nowAttempts} 次）`).log();
        });
        napcat.on('socket.open', () => {
            this.setConnection('open', 1);
            new BotConsole('system', 'napcat WebSocket 已连接').log();
        });
        napcat.on('socket.close', ({ code, reason, reconnection }) => {
            this.setOnline(false);
            const detail = reason ? `，原因: ${reason}` : '';
            if (this.stopping) {
                this.setConnection('stopped', reconnection.nowAttempts);
                return;
            }
            if (!reconnection.enable) {
                this.setConnection('closed', reconnection.nowAttempts);
                new BotConsole('error', `napcat 连接已断开 (code: ${code}${detail})，自动重连已关闭`).log();
                return;
            }
            if (reconnection.nowAttempts >= reconnection.attempts) {
                this.setConnection('closed', reconnection.nowAttempts);
                new BotConsole('error', `napcat 连接已断开 (code: ${code}${detail})，已达到最大重连次数 ${reconnection.attempts}，停止重连`).log();
                return;
            }
            this.setConnection('reconnecting', reconnection.nowAttempts);
            new BotConsole('error', `napcat 连接已断开 (code: ${code}${detail})，${reconnection.delay}ms 后进行第 ${reconnection.nowAttempts + 1} 次重连`).log();
        });
        napcat.on('socket.error', (event) => {
            if (event.error_type === 'connect_error') {
                const errors = Array.isArray(event.errors) ? event.errors : [];
                const detail = errors
                    .filter((e): e is NonNullable<typeof e> => !!e)
                    .map((e) => {
                        const item = e as any;
                        return [item.code, item.syscall, item.address, item.message].filter(Boolean).join(' ');
                    })
                    .filter(Boolean)
                    .join('; ')
                    .replace(/(access_token=)[^&\s'"]+/gi, '$1***');
                new BotConsole('error', `napcat 连接失败${detail ? `: ${detail}` : ''}`).log();
            } else {
                const info = event.info;
                new BotConsole('error', `napcat 服务端错误: ${info?.message ?? '未知错误'} (errno: ${info?.errno ?? '?'})`).log();
            }
        });
    }

    /**
     * 判断指定 QQ 号是否为 bot 主人
     * @param qq - 待判断的 QQ 号
     */
    isOwner(qq: number): boolean {
        return qq === this.owner;
    }

    /**
     * 连接 napcat 并初始化事件监听，启动成功后自动填充 {@link nickname} 和 {@link id}。
     */
    async start(): Promise<void> {
        if (this.started) return;
        this.started = true;
        this.stopping = false;
        const runId = ++this.runId;
        this.installSignals();

        try {
            await this.api.connect();
        } catch (e) {
            this.started = false;
            this.removeSignals();
            this.setConnection('closed');
            throw e;
        }
        if (runId !== this.runId) return;
        const { BotPluginSystem } = await import('./botPlugin');
        if (runId !== this.runId) return;
        this.plugin = new BotPluginSystem(this.api, this);
        try {
            const loginInfo = await this.api.getLoginInfo();
            if (runId !== this.runId) return;
            new BotConsole('system', `bot启动成功，昵称: ${loginInfo.nickname}, 用户ID: ${loginInfo.user_id}`).log();
            this.nickname = loginInfo.nickname;
            this.id = loginInfo.user_id;
            this.setOnline(true);
        } catch (e) {
            new BotConsole('error', formatError(e)).log();
        }

        if (runId !== this.runId) return;
        if (this.autoLoadPlugins) {
            try {
                this.seedDefaultPlugin();
            } catch (e) {
                new BotConsole('error', `初始化默认插件失败: ${formatError(e)}`).log();
            }
            await this.plugin.scan(this.pluginDir);
            if (runId !== this.runId) return;
            this.plugin.watch(this.pluginDir);
        }

        if (runId !== this.runId) return;
        const restored = this.scheduler.restore();
        if (restored > 0) new BotConsole('system', `已恢复 ${restored} 个定时任务`).log();
        this.command.attach();
    }

    /**
     * 优雅退出：卸载插件、取消任务、断开连接并停止监听信号。
     * 可安全重复调用。
     */
    async stop(): Promise<void> {
        if (this.stopping) return;
        this.stopping = true;
        this.runId++;
        this.removeSignals();
        this.command.detach();
        this.plugin?.unwatch();
        try {
            await this.plugin?.unloadAll();
        } catch (e) {
            new BotConsole('error', `卸载插件失败: ${formatError(e)}`).log();
        }
        this.scheduler.cancelAll(false);
        try {
            await this.api.disconnect();
        } catch (e) {
            new BotConsole('error', `断开连接失败: ${formatError(e)}`).log();
        }
        this.setOnline(false);
        this.setConnection('stopped');
        this.started = false;
        this.stopping = false;
    }

    private installSignals(): void {
        if (!this.handleSignals || this.signalHandlers) return;
        const shutdown = (signal: string) => {
            new BotConsole('system', `收到 ${signal}，正在优雅退出...`).log();
            void this.stop().finally(() => process.exit(0));
        };
        this.signalHandlers = {
            sigint: () => shutdown('SIGINT'),
            sigterm: () => shutdown('SIGTERM'),
        };
        process.once('SIGINT', this.signalHandlers.sigint);
        process.once('SIGTERM', this.signalHandlers.sigterm);
    }

    private removeSignals(): void {
        if (!this.signalHandlers) return;
        process.removeListener('SIGINT', this.signalHandlers.sigint);
        process.removeListener('SIGTERM', this.signalHandlers.sigterm);
        this.signalHandlers = null;
    }

    private seedDefaultPlugin(): void {
        const selfDir = dirname(fileURLToPath(import.meta.url))
        const src = join(selfDir, '..', 'plugins', 'hotCatPlugin')
        if (!existsSync(src)) return

        const pluginRoot = resolve(process.cwd(), this.pluginDir)
        const dest = join(pluginRoot, 'hotCatPlugin')
        mkdirSync(pluginRoot, { recursive: true })

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
