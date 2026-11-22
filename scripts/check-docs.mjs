import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), 'utf8');
const missing = [];

const check = (label, names, haystack, patterns = (name) => [name]) => {
    for (const name of names) {
        if (!patterns(name).some((pattern) => haystack.includes(pattern))) {
            missing.push(`${label}: ${name}`);
        }
    }
};

const unique = (items) => [...new Set(items)];

// BotApi：源码方法名 vs 文档 ### 标题
const botApiCode = read('botApi.ts');
const botApiMethods = unique([...botApiCode.matchAll(/^    (?:async )?([A-Za-z_]\w*)\(/gm)].map((m) => m[1]))
    .filter((name) => name !== 'constructor');
const botApiDocs = read('docs/api/bot-api.md');
check('BotApi', botApiMethods, botApiDocs, (name) => [`### ${name}(`]);

// BotEvent：所有 onXxx 方法都要在文档中出现
const botEventCode = read('botEvent.ts');
const eventMethods = unique([...botEventCode.matchAll(/^    (on[A-Za-z0-9_]+)\(/gm)].map((m) => m[1]));
check('BotEvent', eventMethods, read('docs/api/bot-event.md'), (name) => [`### ${name}(`]);

// Message：静态方法
const messageCode = read('message.ts');
const messageMethods = unique([...messageCode.matchAll(/^    static ([A-Za-z_]\w*)\(/gm)].map((m) => m[1]));
check('Message', messageMethods, read('docs/api/message.md'), (name) => [`Message.${name}(`]);

// BotPluginSystem：公开方法
const pluginCode = read('botPlugin.ts');
const pluginMethods = unique([...pluginCode.matchAll(/^    (?:async )?([A-Za-z_]\w*)\(/gm)].map((m) => m[1]))
    .filter((name) => !name.startsWith('_') && name !== 'constructor');
check('BotPluginSystem', pluginMethods, read('docs/api/bot-plugin.md'), (name) => [`### ${name}(`]);

// BotScheduler：公开方法
const schedulerCode = read('botScheduler.ts');
const schedulerMethods = unique([...schedulerCode.matchAll(/^    (?:async )?([A-Za-z_]\w*)\(/gm)].map((m) => m[1]))
    .filter((name) => !['constructor', 'start', 'cronTimer', 'run', 'execute', 'persist', 'parseDate', 'parseTime'].includes(name));
check('BotScheduler', schedulerMethods, read('docs/api/bot-scheduler.md'), (name) => [`### ${name}(`]);

// BotClient：公开方法和属性
const clientCode = read('botClient.ts');
const clientMethods = unique([...clientCode.matchAll(/^    (?:async )?([A-Za-z_]\w*)\(/gm)].map((m) => m[1]))
    .filter((name) => ['start', 'stop', 'isOwner', 'onStatusChange', 'context', 'getStatus'].includes(name));
check('BotClient', clientMethods, read('docs/api/bot-client.md'), (name) => [`### ${name}(`]);

// 新增页面存在性
for (const file of ['docs/api/bot-command.md', 'docs/api/bot-storage.md', 'docs/api/bot-context.md', 'docs/api/bot-console.md']) {
    if (!existsSync(join(root, file))) missing.push(`Missing page: ${file}`);
}

if (missing.length) {
    console.error('文档检查失败，以下内容缺少文档：');
    for (const item of missing) console.error(`- ${item}`);
    process.exit(1);
}
console.log('文档检查通过');
