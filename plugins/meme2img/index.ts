import { Structs } from 'node-napcat-ts'
import { bot } from '../../index.ts'

export async function meme2img(ctx: any) {
    if (ctx.raw_message.startsWith('给我表情') === false && ctx.raw_message.endsWith('给我表情') === false) return
    for (const msg of ctx.message) {
        if (msg.type === 'reply') {
            console.log(msg.data)
            const msgid = msg.data.id
            const msgInfo = await bot.api.get_group_msg_history({
                'group_id': ctx.group_id,
                'message_seq': msgid
            })
            for (const msg of msgInfo.messages) {
                for (const seg of msg.message) {
                    if (seg.type === 'image') {
                        console.log(seg)
                        await bot.api.send_group_msg({
                            'group_id': ctx.group_id,
                            'message': [
                                Structs.text(`收到！`),
                            ]
                        })
                        await bot.api.send_group_msg({
                            'group_id': ctx.group_id,
                            'message': [
                                Structs.file(seg.data.url, seg.data.file),
                            ]
                        })
                        return
                    }
                }
            }
        }
    }
}