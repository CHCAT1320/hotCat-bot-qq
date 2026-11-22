import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { BotConsole, formatError } from './botConsole';

/** 存储数据快照 */
export type StorageData = Record<string, unknown>;

/**
 * 简单的 JSON 文件键值存储，写入时使用临时文件 + rename 保证原子性。
 *
 * 默认所有键共享一个文件；通过 {@link namespace} 可以为插件隔离命名空间。
 */
export class BotStorage {
    private data: StorageData = {};

    constructor(public readonly file: string) {
        this.load();
    }

    private load(): void {
        if (!existsSync(this.file)) return;
        try {
            const raw = readFileSync(this.file, 'utf8').trim();
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                this.data = parsed as StorageData;
            }
        } catch (e) {
            new BotConsole('error', `读取存储文件失败 (${this.file}): ${formatError(e)}`).log();
        }
    }

    private flush(): void {
        try {
            mkdirSync(dirname(this.file), { recursive: true });
            const tmp = `${this.file}.${process.pid}.tmp`;
            writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf8');
            renameSync(tmp, this.file);
        } catch (e) {
            new BotConsole('error', `写入存储文件失败 (${this.file}): ${formatError(e)}`).log();
        }
    }

    get<T>(key: string): T | undefined;
    get<T>(key: string, fallback: T): T;
    get<T>(key: string, fallback?: T): T | undefined {
        if (!Object.prototype.hasOwnProperty.call(this.data, key)) return fallback;
        return this.data[key] as T;
    }

    set<T>(key: string, value: T): void {
        this.data[key] = value;
        this.flush();
    }

    has(key: string): boolean {
        return Object.prototype.hasOwnProperty.call(this.data, key);
    }

    delete(key: string): boolean {
        if (!this.has(key)) return false;
        delete this.data[key];
        this.flush();
        return true;
    }

    keys(prefix = ''): string[] {
        return Object.keys(this.data).filter((key) => key.startsWith(prefix));
    }

    all(): StorageData {
        return { ...this.data };
    }

    clear(): void {
        this.data = {};
        this.flush();
    }

    /** 创建一个以 `prefix.` 开头的隔离命名空间 */
    namespace(prefix: string): NamespacedStorage {
        return new NamespacedStorage(this, `${prefix}.`);
    }

    /** 文件大小（字节），不存在时为 0 */
    size(): number {
        try {
            return existsSync(this.file) ? statSync(this.file).size : 0;
        } catch {
            return 0;
        }
    }
}

/** 带命名空间前缀的存储视图 */
export class NamespacedStorage {
    constructor(private root: BotStorage, private prefix: string) {}

    private key(key: string): string {
        return `${this.prefix}${key}`;
    }

    get<T>(key: string): T | undefined;
    get<T>(key: string, fallback: T): T;
    get<T>(key: string, fallback?: T): T | undefined {
        return this.root.get<T>(this.key(key), fallback as T);
    }

    set<T>(key: string, value: T): void {
        this.root.set(this.key(key), value);
    }

    has(key: string): boolean {
        return this.root.has(this.key(key));
    }

    delete(key: string): boolean {
        return this.root.delete(this.key(key));
    }

    keys(): string[] {
        return this.root.keys(this.prefix).map((key) => key.slice(this.prefix.length));
    }

    all(): StorageData {
        const result: StorageData = {};
        for (const key of this.keys()) {
            result[key] = this.root.get(this.key(key));
        }
        return result;
    }

    clear(): void {
        for (const key of this.keys()) {
            this.root.delete(this.key(key));
        }
    }
}
