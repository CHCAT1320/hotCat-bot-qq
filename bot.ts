import { BotClient } from './botClient'
import { Message } from './message'

const config = {
    baseUrl: 'ws://localhost:8082/onebot/v11/ws/',
    accessToken: 'chcat13201145',
    reconnection: {
        enable: true,
        attempts: 10,
        delay: 5000,
    },
};

export const bot = new BotClient(config);
await bot.start();

bot.event.message.onGroupMessage(async (bot, event) => {
    if (event.group_id !== 912458345) return;
    await bot.api.sendGroupMessage(event.group_id,
        Message.reply(event.message_id),
        Message.at(event.user_id),
        Message.text(' 收到消息: '),
        ...event.message.map(seg => Message.from(seg))
    );
});
bot.event.message.onPrivateMessage(async (bot, event) => {
    if (event.user_id !== 1095216448) return;
    await bot.api.sendPrivateMessage(event.user_id,
        Message.text('Hello, World!'),
    );
});
bot.event.notice.onPoke(async (bot, event) => {
    if (event.user_id !== 1095216448) return;
    await bot.api.sendPrivateMessage(event.user_id,
        Message.text('收到poke消息'),
    );
});
