import * as schedule from 'node-schedule';
import * as cronParserModule from 'cron-parser';
import { BotConsole, formatError } from './botConsole';

const cronParser = ((cronParserModule as { default?: typeof cronParserModule }).default ?? cronParserModule);

export type JobKind = 'cron' | 'every' | 'at';
export type JobHandler = () => void | Promise<void>;

/** 失败重试配置，attempts 为总执行次数（包含第一次） */
export interface RetryOptions {
    attempts?: number;
    delay?: number;
}

/** 定时任务选项 */
export interface JobOptions {
    /** 任务名，设置后可用于持久化 */
    name?: string;
    /** cron 时区，如 `Asia/Shanghai` */
    timezone?: string;
    /** 上一次未执行完时是否跳过本次，默认 false */
    noOverlap?: boolean;
    retry?: RetryOptions;
}

/** 可持久化的任务定义 */
export interface JobDefinition {
    id: number;
    name: string;
    kind: JobKind;
    spec: string | number;
    options: JobOptions;
    createdAt: number;
}

/** 调度器可用的最小存储接口 */
export interface SchedulerStorage {
    get<T>(key: string, fallback: T): T;
    set<T>(key: string, value: T): void;
}

interface Cancelable {
    cancel(): void;
}

/**
 * 定时任务调度器，支持 cron、间隔时间、指定时间三种模式。
 *
 * - 支持异步回调，异常和 Promise 拒绝都会被捕获
 * - 支持时区、防止任务重叠、失败重试
 * - 通过 `define()` + `schedule()` + `restore()` 可为命名任务做持久化
 */
export class BotScheduler {
    private jobs: Map<number, Cancelable> = new Map();
    private idCounter = 0;
    private running = new Set<number>();
    private definitions = new Map<number, JobDefinition>();
    private handlers = new Map<string, JobHandler>();
    private namedJobs = new Map<string, number>();

    constructor(private storage?: SchedulerStorage) {}

    /** 注册命名任务处理器，供 restore() 还原持久化任务 */
    define(name: string, handler: JobHandler): this {
        this.handlers.set(name, handler);
        return this;
    }

    /** 注册并调度一个可持久化的命名任务 */
    schedule(name: string, kind: JobKind, spec: string | number | Date, options: Omit<JobOptions, 'name'> = {}): number {
        const handler = this.handlers.get(name);
        if (!handler) throw new Error(`未注册任务处理器: ${name}`);
        const id = this.start(kind, spec, handler, { ...options, name });
        this.definitions.set(id, {
            id,
            name,
            kind,
            spec: spec instanceof Date ? spec.toISOString() : spec,
            options: { ...options, name },
            createdAt: Date.now(),
        });
        this.persist();
        return id;
    }

    /** 还原已持久化的命名任务，返回成功还原数量 */
    restore(): number {
        if (!this.storage) return 0;
        const saved = this.storage.get<JobDefinition[]>('jobs', []);
        let restored = 0;
        for (const def of saved) {
            if (!def || !def.name) continue;
            if (this.namedJobs.has(def.name)) continue;
            const handler = this.handlers.get(def.name);
            if (!handler) {
                new BotConsole('error', `恢复定时任务 "${def.name}" 失败: 未注册对应处理器`).log();
                this.definitions.set(def.id, def);
                this.idCounter = Math.max(this.idCounter, def.id);
                continue;
            }
            const spec = def.kind === 'at' && typeof def.spec === 'string' ? new Date(def.spec) : def.spec;
            const id = this.start(def.kind, spec, handler, { ...def.options, name: def.name });
            this.definitions.set(id, { ...def, id });
            this.idCounter = Math.max(this.idCounter, id);
            restored++;
        }
        this.persist();
        return restored;
    }

    cron(expr: string, fn: JobHandler, options: JobOptions = {}): number {
        return this.start('cron', expr, fn, options);
    }

    every(time: number | string, fn: JobHandler, options: JobOptions = {}): number {
        return this.start('every', time, fn, options);
    }

    at(time: string | Date, fn: JobHandler, options: JobOptions = {}): number {
        return this.start('at', time, fn, options);
    }

    cancel(id: number): void {
        const job = this.jobs.get(id);
        if (job) {
            job.cancel();
            this.jobs.delete(id);
        }
        const def = this.definitions.get(id);
        if (def?.name) {
            const namedId = this.namedJobs.get(def.name);
            if (namedId === id) this.namedJobs.delete(def.name);
        }
        this.definitions.delete(id);
        this.persist();
    }

    /** 取消全部任务；clearPersisted 为 true 时同时删除持久化定义 */
    cancelAll(clearPersisted = false): void {
        for (const job of this.jobs.values()) job.cancel();
        this.jobs.clear();
        this.namedJobs.clear();
        this.running.clear();
        if (clearPersisted) {
            this.definitions.clear();
            this.persist();
        }
    }

    /** 当前任务定义 */
    listJobs(): JobDefinition[] {
        return Array.from(this.definitions.values());
    }

    private start(kind: JobKind, spec: string | number | Date, fn: JobHandler, options: JobOptions): number {
        const id = ++this.idCounter;
        const name = options.name;
        if (name) {
            const old = this.namedJobs.get(name);
            if (old != null) this.cancel(old);
            this.namedJobs.set(name, id);
        }

        if (kind === 'every') {
            const ms = typeof spec === 'number' ? spec : this.parseTime(String(spec));
            if (!Number.isFinite(ms) || ms <= 0) {
                new BotConsole('error', `间隔时间无效: ${String(spec)}`).log();
                return id;
            }
            const timer = setInterval(() => this.run(id, fn, options), ms);
            this.jobs.set(id, { cancel: () => clearInterval(timer) });
            return id;
        }

        if (kind === 'cron') {
            const expr = String(spec);
            if (options.timezone) {
                this.jobs.set(id, this.cronTimer(expr, options.timezone, () => this.run(id, fn, options)));
            } else {
                let job: schedule.Job | null = null;
                try {
                    job = schedule.scheduleJob(expr, () => this.run(id, fn, options));
                } catch (e) {
                    new BotConsole('error', `cron 表达式无效: ${expr} (${formatError(e)})`).log();
                    return id;
                }
                if (job) this.jobs.set(id, job);
                else new BotConsole('error', `cron 表达式无效: ${expr}`).log();
            }
            return id;
        }

        if (kind === 'at') {
            if (typeof spec === 'string') {
                const daily = spec.match(/^(\d{1,2}):(\d{2})$/);
                if (daily) {
                    const hour = Number(daily[1]);
                    const minute = Number(daily[2]);
                    if (hour <= 23 && minute <= 59) {
                        return this.start('cron', `${minute} ${hour} * * *`, fn, options);
                    }
                }
            }
        }

        const target = spec instanceof Date ? spec : this.parseDate(String(spec));
        if (!target) {
            new BotConsole('error', `时间格式无效: ${String(spec)}`).log();
            return id;
        }
        if (target.getTime() - Date.now() <= 0) {
            this.run(id, fn, options);
            return id;
        }
        let job: schedule.Job | null = null;
        try {
            job = schedule.scheduleJob(target, () => this.run(id, fn, options));
        } catch (e) {
            new BotConsole('error', `定时任务创建失败: ${formatError(e)}`).log();
            return id;
        }
        if (job) this.jobs.set(id, job);
        return id;
    }

    private cronTimer(expr: string, timezone: string, fire: () => void): Cancelable {
        let timer: NodeJS.Timeout | null = null;
        let stopped = false;

        const scheduleNext = () => {
            if (stopped) return;
            let next: Date;
            try {
                next = cronParser.parseExpression(expr, { tz: timezone }).next().toDate();
            } catch (e) {
                new BotConsole('error', `cron 表达式或时区无效: ${expr} (${formatError(e)})`).log();
                return;
            }
            const delay = Math.max(0, Math.min(next.getTime() - Date.now(), 2147483647));
            timer = setTimeout(() => {
                if (stopped) return;
                fire();
                scheduleNext();
            }, delay);
        };

        scheduleNext();
        return {
            cancel: () => {
                stopped = true;
                if (timer) clearTimeout(timer);
            },
        };
    }

    private run(id: number, fn: JobHandler, options: JobOptions): void {
        if (options.noOverlap && this.running.has(id)) return;
        this.running.add(id);
        void this.execute(fn, options).finally(() => this.running.delete(id));
    }

    private async execute(fn: JobHandler, options: JobOptions): Promise<void> {
        const attempts = Math.max(1, options.retry?.attempts ?? 1);
        const delay = Math.max(0, options.retry?.delay ?? 1000);
        for (let attempt = 1; attempt <= attempts; attempt++) {
            try {
                await fn();
                return;
            } catch (e) {
                if (attempt >= attempts) {
                    new BotConsole('error', `定时任务执行失败: ${formatError(e)}`).log();
                    return;
                }
                new BotConsole('error', `定时任务执行失败（第 ${attempt}/${attempts} 次），${delay}ms 后重试: ${formatError(e)}`).log();
                if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }

    private persist(): void {
        if (!this.storage) return;
        this.storage.set('jobs', Array.from(this.definitions.values()));
    }

    private parseDate(time: string): Date | null {
        if (time.includes('-')) {
            const target = new Date(time);
            return isNaN(target.getTime()) ? null : target;
        }
        const target = new Date();
        const match = time.match(/^(\d{1,2}):(\d{2})$/);
        if (!match) return null;
        const hour = Number(match[1]);
        const minute = Number(match[2]);
        if (hour > 23 || minute > 59) return null;        target.setHours(hour, minute, 0, 0);
        if (target.getTime() <= Date.now()) target.setDate(target.getDate() + 1);
        return target;
    }

    private parseTime(t: string): number {
        const m = t.match(/^(\d+)\s*(ms|s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)$/i);
        if (!m) return 0;
        const v = parseInt(m[1], 10);
        const unit = m[2].toLowerCase();
        if (unit === 'ms') return v;
        switch (unit[0]) {
            case 's': return v * 1000;
            case 'm': return v * 60000;
            case 'h': return v * 3600000;
            case 'd': return v * 86400000;
            default: return 0;
        }
    }
}
