import { NCWebsocket, Structs } from 'node-napcat-ts'
import { getAiSeeImg } from './plugins/aiSeeImg/index.ts'
import { getPigHubImg } from './plugins/getPigHubImg/index.ts'
import { getChunithmSong } from './plugins/chunithmSong/index.ts'
import { marryGroupMember, unmarryGroupMember } from './plugins/marryGroup/index.ts'
import schedule from 'node-schedule'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url';
import { meme2img } from './plugins/meme2img/index.ts'
import { scheduleSendDynamic } from './plugins/bilibiliDynamic/index.ts'
import { addJiting, deleteJiting, addJitingAlias, deleteJitingAlias, updateJitingMembers, lookUpJiting, lookUpOneJiting, jitingRank, getGroupShopInfo, getAllShops, scheduleDailyReset } from './plugins/jiting/index.ts'
import { sendHelp } from './plugins/help/index.ts'
import { handleWeather } from './plugins/weather/index.ts'
import { imageRecognitionChuScore } from './plugins/ImageRecognitionChuScore/index.ts'

class botClient {
    public api!: NCWebsocket
    public onGroupMessageFns: ((ctx: any) => Promise<void>)[]
    public selfData = {}
    constructor() {
        this.onGroupMessageFns = []
    }
    async start() {
        this.api = new NCWebsocket({
        baseUrl: 'ws://localhost:8082/onebot/v11/ws/',
        accessToken: 'chcat13201145',
        // 是否需要在触发 socket.error 时抛出错误, 默认关闭
        // throwPromise: true,
        // ↓ 自动重连(可选)
        reconnection: {
            enable: true,
            attempts: 10,
            delay: 5000
        }
        // ↓ 是否开启 DEBUG 模式
        }, false)
        await this.api.connect()
        this.api.on('meta_event.lifecycle.connect', () => {
            console.log('连接成功')
        })
    }
    async onGroupMessage() {
        this.api.on('message.group', async (ctx) => {
            // if (ctx.group_id !== 106520723) return
            console.log('收到群消息')
            console.log(ctx)
            console.log(ctx.message)
            console.log(ctx.raw_message)
            for (const fn of this.onGroupMessageFns) {
                try {
                    await fn(ctx)
                }
                catch (e) {
                    console.log(e)
                }
            }
        })
    }
    async onNoticePoke() {
        this.api.on('notice.notify.poke', async (ctx) => {
            const botInfo = await this.api.get_login_info()
            if (ctx.target_id != botInfo.user_id) return;
            console.log('收到戳一戳')
            console.log(ctx)
            // this.api.send_poke(ctx.group_id, ctx.sender.user_id)
            const pokeText = [
                "别戳我啦~", "再戳我就要生气了！", "戳我干嘛？", 
                "别戳了，你是不是喜欢我？", "我烫猫是你能戳的？",
                "你是不是想让我生气？", "你是不是在逗我？",
                "你是不是想让我开心一下？", "你是不是在找茬？",
                "你是不是在找事？","我喜欢你"
            ]
            await this.api.send_group_msg({
                group_id: ctx.group_id,
                message: [
                    Structs.text(pokeText[Math.floor(Math.random() * pokeText.length)])
                ]
            })
            // 随机发送pockAudio文件夹里面的音频文件
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = path.dirname(__filename);
            const pockAudioPath = path.join(__dirname, 'pockAudio')
            const pockAudioList = await fs.promises.readdir(pockAudioPath)
            console.log(pockAudioList)
            const pockAudio = pockAudioList[Math.floor(Math.random() * pockAudioList.length)]
            await this.api.send_group_msg({
                group_id: ctx.group_id,
                message: [
                    Structs.record(path.join(pockAudioPath, pockAudio))
                ]
            })
        })
    }
    setScheduledTask(fn: () => void, t: any) {
        schedule.scheduleJob(t, fn)
    }
}
export const bot: botClient = new botClient()
await bot.start()
await bot.onGroupMessage()
await bot.onNoticePoke()




async function scheduleGroupSign() {
    const groupList = await bot.api.get_group_list()
    console.log(groupList)
    for (const group of groupList) {
        // const res = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
        //     method: "POST",
        //     headers: {
        //         "Authorization": `Bearer sk-odtijjzbqluwrwafjuperexeaaqkijxchvozigvahdjqgmkg`,
        //         "Content-Type": "application/json"
        //     },
        //     body: JSON.stringify({
        //         model: "Qwen/Qwen3-VL-32B-Instruct",
        //         messages: [
        //         {
        //             role: "user",
        //             content: [
        //             { type: "text", text: "写一句激励别人的话，可以用经典名言，或古诗词，或现代歌词，或者随心所欲。"}
        //             ]
        //         }
        //         ]
        //     }),
        // });
        // const data = await res.json();
        // console.log(data)
        // const message = data.choices[0].message.content;
        // console.log(message)
        // await bot.api.send_group_msg({
        //     group_id: group.group_id,
        //     message: [
        //         Structs.text(message),
        //     ]
        // })
        await bot.api.set_group_sign({
            group_id: group.group_id,
        })
    }
    console.log('群签到完成')
}
// scheduleGroupSign()

bot.setScheduledTask(scheduleGroupSign, '0 0 0 * * *')
// 每五分钟获取一次动态
scheduleSendDynamic()
bot.setScheduledTask(scheduleSendDynamic, '0 */10 * * * *')


bot.onGroupMessageFns.push(marryGroupMember)
bot.onGroupMessageFns.push(unmarryGroupMember)
bot.onGroupMessageFns.push(meme2img)
bot.onGroupMessageFns.push(getAiSeeImg)
bot.onGroupMessageFns.push(getPigHubImg)
bot.onGroupMessageFns.push(getChunithmSong)
bot.onGroupMessageFns.push(addJiting)
bot.onGroupMessageFns.push(deleteJiting)
bot.onGroupMessageFns.push(addJitingAlias)
bot.onGroupMessageFns.push(deleteJitingAlias)
bot.onGroupMessageFns.push(updateJitingMembers)
bot.onGroupMessageFns.push(lookUpJiting)
bot.onGroupMessageFns.push(lookUpOneJiting)
bot.onGroupMessageFns.push(jitingRank)
bot.onGroupMessageFns.push(getGroupShopInfo)
bot.onGroupMessageFns.push(getAllShops)
bot.onGroupMessageFns.push(sendHelp)
bot.onGroupMessageFns.push(handleWeather)
// bot.onGroupMessageFns.push(imageRecognitionChuScore) 该功能效果不佳，弃用

scheduleDailyReset()