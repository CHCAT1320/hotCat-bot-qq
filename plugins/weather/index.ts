import { Structs } from 'node-napcat-ts'
import { bot } from '../../index.ts'
import {
    renderChinaRadar,
    renderChinaCloud,
    renderChinaWind,
    renderChinaTyphoon,
    renderTyphoonOverview,
} from 'weather-com-cn-api'
import type { RenderResult } from 'weather-com-cn-api'

function toBase64Url(dataUrl: string): string {
    return 'base64://' + dataUrl.slice(dataUrl.indexOf(',') + 1)
}

async function renderAndSend(
    ctx: any,
    renderFn: () => Promise<RenderResult>,
    label: string,
    fallbackMsg: string,
) {
    try {
        const result = await renderFn()
        await bot.api.send_group_msg({
            group_id: ctx.group_id,
            message: [
                Structs.reply(ctx.message_id),
                Structs.at(ctx.sender.user_id),
                Structs.text(`\n${label}`),
                Structs.image(toBase64Url(result.dataUrl)),
            ],
        })
    } catch (e: any) {
        await bot.api.send_group_msg({
            group_id: ctx.group_id,
            message: [
                Structs.reply(ctx.message_id),
                Structs.at(ctx.sender.user_id),
                Structs.text(`\n${fallbackMsg}：${e.message || '未知错误'}`),
            ],
        })
    }
}

export async function handleWeather(ctx: any) {
    const msg = ctx.raw_message || ''
    if (!msg.startsWith('天气')) return

    const sub = msg.slice(2).trim()

    if (sub === '雷达图') {
        await renderAndSend(ctx, renderChinaRadar, '全国雷达图', '雷达图获取失败')
        return
    }
    if (sub === '云图') {
        await renderAndSend(ctx, renderChinaCloud, '卫星云图', '云图获取失败')
        return
    }
    if (sub === '风场' || sub === '风场图') {
        await renderAndSend(ctx, renderChinaWind, '风场流线图', '风场图获取失败')
        return
    }
    if (sub === '台风') {
        await renderAndSend(ctx, renderChinaTyphoon, '台风路径图', '台风图获取失败（当前可能没有活跃台风）')
        return
    }
    if (sub === '台风全览') {
        await renderAndSend(ctx, renderTyphoonOverview, '台风全览图', '台风全览图获取失败（当前可能没有活跃台风）')
        return
    }
}