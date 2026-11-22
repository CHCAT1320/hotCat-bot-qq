import * as schedule from 'node-schedule';
import { BotConsole, formatError } from './botConsole';

type SchedulerJob = ReturnType<typeof schedule.scheduleJob>;

/**
 * 定时任务调度器，支持 cron、间隔、指定时间三种模式。
 *
 * cron('0 8 * * *', fn)    每天 8:00
 * every('5m', fn)          每5分钟
 * at('08:00', fn)          每天 8:00
 */
export class BotScheduler {
    private jobs: Map<number, SchedulerJob | NodeJS.Timeout> = new Map();
    private idCounter = 0;

    /**
     * cron 表达式定时
     * @param expr - cron 表达式，如 `'0 8 * * *'`（每天 8:00）
     * @param fn - 回调函数
     * @returns job id，可用于 cancel
     */
    cron(expr: string, fn: () => void | Promise<void>): number {
        const id = ++this.idCounter;
        let job: SchedulerJob | null = null;
        try {
            job = schedule.scheduleJob(expr, () => {
                this.run(fn);
            });
        } catch (e) {
            new BotConsole('error', `cron 表达式无效: ${expr} (${formatError(e)})`).log();
            return id;
        }
        if (job) this.jobs.set(id, job);
        else new BotConsole('error', `cron 表达式无效: ${expr}`).log();
        return id;
    }

    /**
     * 间隔重复执行
     * @param time - 间隔，支持数字(ms)或字符串 `'5s'` `'10m'` `'1h'` `'2d'`
     * @param fn - 回调函数
     * @returns job id
     */
    every(time: number | string, fn: () => void | Promise<void>): number {
        const ms = typeof time === 'number' ? time : this.parseTime(time);
        const id = ++this.idCounter;
        if (!Number.isFinite(ms) || ms <= 0) {
            new BotConsole('error', `间隔时间无效: ${String(time)}`).log();
            return id;
        }
        const timer = setInterval(() => {
            this.run(fn);
        }, ms);
        this.jobs.set(id, timer);
        return id;
    }

    /**
     * 指定时间执行（一次性或每日重复）
     * @param time - 字符串 `'08:00'`（每日）/ `'2026-08-01 12:00'`（一次性），或 Date
     * @param fn - 回调函数
     * @returns job id
     */
    at(time: string | Date, fn: () => void | Promise<void>): number {
        const id = ++this.idCounter;

        if (typeof time === 'string' && time.includes('-')) {
            const target = new Date(time);
            if (isNaN(target.getTime())) {
                new BotConsole('error', `时间格式无效: ${time}`).log();
                return id;
            }
            return this.scheduleAt(id, target, fn);
        }

        if (typeof time === 'string') {
            return this.cron(this.timeToCron(time), fn);
        }

        return this.scheduleAt(id, time, fn);
    }

    private scheduleAt(id: number, target: Date, fn: () => void | Promise<void>): number {
        if (target.getTime() - Date.now() <= 0) {
            this.run(fn);
            return id;
        }
        let job: SchedulerJob | null = null;
        try {
            job = schedule.scheduleJob(target, () => {
                this.run(fn);
            });
        } catch (e) {
            new BotConsole('error', `定时任务创建失败: ${formatError(e)}`).log();
            return id;
        }
        if (job) this.jobs.set(id, job);
        return id;
    }

    private run(fn: () => void | Promise<void>): void {
        const onError = (e: unknown) => {
            new BotConsole('error', `定时任务执行失败: ${formatError(e)}`).log();
        };
        try {
            const result = fn();
            if (result && typeof (result as Promise<void>).catch === 'function') {
                (result as Promise<void>).catch(onError);
            }
        } catch (e) {
            onError(e);
        }
    }

    /**
     * 取消指定任务
     * @param id - cron/every/at 返回的 id
     */
    cancel(id: number): void {
        const job = this.jobs.get(id);
        if (!job) return;
        if ('cancel' in job) {
            (job as SchedulerJob).cancel();
        } else {
            clearInterval(job as NodeJS.Timeout);
        }
        this.jobs.delete(id);
    }

    /** 取消全部任务 */
    cancelAll(): void {
        for (const id of Array.from(this.jobs.keys())) {
            this.cancel(id);
        }
    }

    private parseTime(t: string): number {
        const m = t.match(/^(\d+)\s*(ms|s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)$/i);
        if (!m) return 0;
        const v = parseInt(m[1]);
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

    private timeToCron(t: string): string {
        const m = t.match(/^(\d{1,2}):(\d{2})$/);
        if (!m) return '';
        return `${m[2]} ${m[1]} * * *`;
    }
}
