import { describe, expect, test, afterAll } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { BotClient } from '../botClient';
import { BotConsole } from '../botConsole';
import { BotScheduler } from '../botScheduler';
import { BotStorage } from '../botStorage';

const root = mkdtempSync(join(tmpdir(), 'hotcat-test-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const groupEvent = (text: string, userId: number, role = 'member') => ({
    group_id: 1,
    user_id: userId,
    message_id: 2,
    sub_type: 'normal',
    message: [{ type: 'text', data: { text } }],
    raw_message: text,
    sender: { role, nickname: 'tester' },
});

describe('BotStorage', () => {
    test('namespace isolation and persistence', () => {
        const file = join(root, 'storage.json');
        const storage = new BotStorage(file);
        storage.set('a', 1);
        storage.namespace('plugin.x').set('b', 2);
        expect(storage.get('a')).toBe(1);
        expect(storage.namespace('plugin.x').get('b')).toBe(2);
        expect(storage.namespace('plugin.x').keys()).toEqual(['b']);
        expect(new BotStorage(file).namespace('plugin.x').get('b')).toBe(2);
    });
});

describe('BotScheduler', () => {
    test('noOverlap and retry', async () => {
        const scheduler = new BotScheduler();
        let active = 0;
        let peak = 0;
        let attempts = 0;
        scheduler.every('20ms', async () => {
            active++;
            peak = Math.max(peak, active);
            await new Promise((resolve) => setTimeout(resolve, 70));
            active--;
        }, { noOverlap: true });
        scheduler.every('20ms', async () => {
            attempts++;
            if (attempts < 3) throw new Error('retry');
        }, { retry: { attempts: 3, delay: 5 } });
        await new Promise((resolve) => setTimeout(resolve, 220));
        scheduler.cancelAll(true);
        expect(peak).toBe(1);
        expect(attempts).toBeGreaterThanOrEqual(3);
    });

    test('named jobs persist and restore', async () => {
        const storage = new BotStorage(join(root, 'scheduler.json'));
        const first = new BotScheduler(storage);
        let ticks = 0;
        first.define('tick', () => { ticks++; });
        first.schedule('tick', 'every', 20);
        await new Promise((resolve) => setTimeout(resolve, 70));
        first.cancelAll(false);

        const second = new BotScheduler(storage);
        second.define('tick', () => { ticks++; });
        expect(second.restore()).toBe(1);
        await new Promise((resolve) => setTimeout(resolve, 70));
        second.cancelAll(true);
        expect(ticks).toBeGreaterThanOrEqual(4);
    });
});

describe('BotCommandSystem', () => {
    test('parses args and enforces owner permission', async () => {
        const bot = new BotClient({ baseUrl: 'ws://127.0.0.1:1/', owner: 123, handleSignals: false, autoLoadPlugins: false, storagePath: join(root, 'bot.json') });
        let result: unknown = null;
        bot.command.command('ping', (ctx) => { result = { args: ctx.args, owner: ctx.isOwner }; });
        bot.command.command('secret', () => { result = 'secret'; }, { permission: 'owner' });
        bot.command.attach();
        (bot.api.napcat as any).emit('message.group', groupEvent('#ping a b', 123, 'owner'));
        await new Promise((resolve) => setTimeout(resolve, 30));
        expect(result).toEqual({ args: ['a', 'b'], owner: true });

        (bot.api.napcat as any).emit('message.group', groupEvent('#secret', 999));
        await new Promise((resolve) => setTimeout(resolve, 30));
        expect(result).toEqual({ args: ['a', 'b'], owner: true });

        bot.command.setPrefix('!');
        result = null;
        (bot.api.napcat as any).emit('message.group', groupEvent('!ping c', 123));
        await new Promise((resolve) => setTimeout(resolve, 30));
        expect(result).toEqual({ args: ['c'], owner: true });
    });
});

describe('BotClient status', () => {
    test('tracks connection and online changes', async () => {
        const bot = new BotClient({ baseUrl: 'ws://127.0.0.1:1/', owner: 123, handleSignals: false, autoLoadPlugins: false, storagePath: join(root, 'status.json') });
        const states: string[] = [];
        bot.onStatusChange((status) => states.push(`${status.connection}:${status.online}`));
        const napcat = bot.api.napcat as any;
        const reconnection = { enable: true, attempts: Infinity, delay: 0, nowAttempts: 1 };
        napcat.emit('socket.connecting', { reconnection });
        napcat.emit('socket.open', { reconnection });
        napcat.emit('meta_event.lifecycle.connect', {});
        napcat.emit('notice.bot_offline', { tag: 'test', message: 'offline' });
        await bot.stop();
        expect(states).toContain('connecting:false');
        expect(states).toContain('open:false');
        expect(states).toContain('open:true');
        expect(states).toContain('open:false');
        expect(states).toContain('stopped:false');
    });
});

describe('BotConsole', () => {
    test('writes JSON log file', () => {
        const file = join(root, 'bot.log');
        BotConsole.configure({ json: true, file, level: 'debug' });
        new BotConsole('info', 'hello').log();
        new BotConsole('debug', 'debug').log();
        BotConsole.reset();
        const lines = readFileSync(file, 'utf8').trim().split('\n');
        expect(lines).toHaveLength(2);
        expect(JSON.parse(lines[0]).level).toBe('info');
        expect(JSON.parse(lines[1]).level).toBe('debug');
    });
});
