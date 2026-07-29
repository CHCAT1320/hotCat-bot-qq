import { NCWebsocketOptions } from 'node-napcat-ts' // 导入必要的模块
import { BotClient, Message } from './' // 导入botClient类



const config: NCWebsocketOptions = {
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
// const nickname = bot.nickname;
// const id = bot.id;
// console.log(`Bot started with nickname: ${nickname}, ID: ${id}`);

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