import { Structs } from 'node-napcat-ts'
import { bot } from '../../index.ts'

async function randomPig() {
    const res = await fetch('https://pighub.top/api/images?sort=1')
    const data = await res.json()
    // console.log(data)
    const randomRes = data.images[Math.floor(Math.random() * data.images.length)]
    console.log(randomRes)
    return randomRes
}

export async function getPigHubImg(ctx: any) {
    if (!ctx.raw_message.startsWith('随机猪猪')) return
    const randomRes = await randomPig()
    await bot.api.send_group_msg({
        group_id: ctx.group_id,
        message: [
            Structs.at(ctx.sender.user_id),
            Structs.text(`\n随机猪猪：${randomRes.title}\n`),
            Structs.text(`查看人数：${randomRes.view_count}\n`),
            Structs.text(`下载次数：${randomRes.download_count}\n`),
            Structs.text(`猪猪ID：${randomRes.id}\n`),
            Structs.text(`上传时间：${new Date(randomRes.mtime * 1000).toLocaleString()}\n`),
            Structs.text(`文件名称：${randomRes.filename}\n`),
            Structs.text(`duration：${randomRes.duration}\n`),
            Structs.text(`图片类型：${randomRes.image_type}\n`),
            Structs.image('https://pighub.top' + randomRes.thumbnail)
        ]
    })
}