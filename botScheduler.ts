import * as schedule from 'node-schedule';

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
    cron(expr: string, fn: () => void): number {
        const id = ++this.idCounter;
        const job = schedule.scheduleJob(expr, () => {
            try { fn(); } catch {}
        });
        if (job) this.jobs.set(id, job);
        return id;
    }

    /**
     * 间隔重复执行
     * @param time - 间隔，支持数字(ms)或字符串 `'5s'` `'10m'` `'1h'` `'2d'`
     * @param fn - 回调函数
     * @returns job id
     */
    every(time: number | string, fn: () => void): number {
        const ms = typeof time === 'number' ? time : this.parseTime(time);
        const id = ++this.idCounter;
        const timer = setInterval(() => {
            try { fn(); } catch {}
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
    at(time: string | Date, fn: () => void): number {
        const id = ++this.idCounter;

        if (typeof time === 'string' && time.includes('-')) {
            const target = new Date(time);
            if (isNaN(target.getTime())) return id;
            const ms = target.getTime() - Date.now();
            if (ms <= 0) { try { fn(); } catch {} return id; }
            const timer = setTimeout(() => { try { fn(); } catch {} }, ms);
            this.jobs.set(id, timer);
            return id;
        }

        if (typeof time === 'string') {
            return this.cron(this.timeToCron(time), fn);
        }

        const ms = time.getTime() - Date.now();
        if (ms <= 0) { try { fn(); } catch {} return id; }
        const timer = setTimeout(() => { try { fn(); } catch {} }, ms);
        this.jobs.set(id, timer);
        return id;
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
        const m = t.match(/^(\d+)\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)$/i);
        if (!m) return 0;
        const v = parseInt(m[1]);
        switch (m[2][0].toLowerCase()) {
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
