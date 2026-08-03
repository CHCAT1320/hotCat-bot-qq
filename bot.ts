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
bot.event.message.onPrivateMessage(async (bot, event) => {
    await bot.api.sendPrivateMessage(event.user_id,
        Message.text('Hello, World!'),
    );
});
bot.event.notice.onPoke(async (bot, event) => {
    await bot.api.sendGroupMessage(event.user_id,
        Message.text('哎呀戳我干啥嘛，讨厌！'),
    );
});
bot.event.notice.onGroupIncrease(async (bot, event) => {
    await bot.api.sendGroupMessage(event.group_id,
        Message.text(`欢迎新人！`),
    );
});
bot.event.message.onGroupMessage(async (bot, event) => {
    for (const message of event.message) {
        if (message.type === 'text') {
            if (message.data.text === '回应续标识') {
                await bot.api.setMsgEmojiLike(event.message_id, '424');
            }
        }
    }
})
bot.event.notice.onGroupEmojiLike(async (bot, event) => {
    await bot.api.sendGroupMessage(event.group_id,
        Message.text(`收到id为${event.likes[0].emoji_id}的emoji表情！`),
    );
});