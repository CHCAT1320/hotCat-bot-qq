import { Structs } from 'node-napcat-ts'
import { bot } from '../../index.ts'
import {
    renderChinaRadar,
    renderChinaCloud,
    renderChinaWind,
    renderGlobalWind,
    renderChinaTyphoon,
    renderTyphoonOverview,
    getTyphoonList,
    getTyphoonNew,
    extractTrack,
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
                Structs.text('\n数据来源：中国天气网 weather.com.cn\n底图：高德地图 Amap'),
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

const INTENSITY_MAP: Record<string, string> = {
    TD: '热带低压',
    TS: '热带风暴',
    STS: '强热带风暴',
    TY: '台风',
    STY: '强台风',
    SuperTY: '超强台风',
}

function sendText(ctx: any, text: string) {
    return bot.api.send_group_msg({
        group_id: ctx.group_id,
        message: [
            Structs.reply(ctx.message_id),
            Structs.at(ctx.sender.user_id),
            Structs.text(`\n${text}`),
        ],
    })
}

export async function handleWeather(ctx: any) {
    const msg = ctx.raw_message || ''
    if (!msg.startsWith('天气')) return

    const sub = msg.slice(2).trim()

    if (!sub) {
        await renderAndSend(ctx, renderChinaRadar, '全国雷达图', '雷达图获取失败')
        return
    }

    if (sub === '雷达图' || sub === '雷达') {
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
    if (sub === '全球风场' || sub === '全球风场图') {
        await renderAndSend(ctx, renderGlobalWind, '全球风场流线图', '全球风场图获取失败')
        return
    }
    if (sub === '台风列表') {
        try {
            const list = await getTyphoonList()
            if (list.length === 0) {
                await sendText(ctx, '当前没有活跃台风')
                return
            }
            const lines = list.map((t, i) => `${i + 1}. [${t.code}] ${t.title}`)
            await sendText(ctx, lines.join('\n'))
        } catch (e: any) {
            await sendText(ctx, `台风列表获取失败：${e.message || '未知错误'}`)
        }
        return
    }
    if (sub === '台风') {
        await renderAndSend(ctx, renderChinaTyphoon, '台风路径图', '台风图获取失败（当前可能没有活跃台风）')
        return
    }
    if (sub.startsWith('台风') && sub.length > 2) {
        const code = sub.startsWith('台风 ') ? sub.slice(3).trim() : sub.slice(2).trim()
        if (!/^\d{4}$/.test(code)) {
            await sendText(ctx, '台风编号格式错误，应为4位数字，如 2609')
            return
        }
        try {
            const year = '20' + code.slice(0, 2)
            const data = await getTyphoonNew(code, year)
            const track = extractTrack(data)
            if (track.length === 0) {
                await sendText(ctx, `台风 ${code} 无路径数据`)
                return
            }
            const latest = track[track.length - 1]
            const info = [
                `台风 ${code} — ${data.typhoon?.[2] || '未知'} (${data.typhoon?.[3] || ''})`,
                `状态：${data.typhoon?.[7] === 'stop' ? '已停编' : '活跃'}`,
                `更新时间：${data.update || '未知'}`,
                '',
                `最新位置：${latest.lat.toFixed(1)}°N, ${latest.lng.toFixed(1)}°E`,
                `强度：${INTENSITY_MAP[latest.intensity] || latest.intensity}`,
                `中心气压：${latest.pressure} hPa`,
                `最大风速：${latest.windSpeed} m/s`,
                `移动方向：${latest.direction}`,
                `移动速度：${latest.moveSpeed} km/h`,
            ]
            if (latest.windCircles) {
                info.push(
                    '',
                    `7级风圈：${latest.windCircles.lv7} km`,
                    `10级风圈：${latest.windCircles.lv10} km`,
                    `12级风圈：${latest.windCircles.lv12} km`,
                )
            }
            await sendText(ctx, info.join('\n'))
        } catch (e: any) {
            await sendText(ctx, `台风详情获取失败：${e.message || '未知错误'}`)
        }
        return
    }
    if (sub === '台风全览') {
        await renderAndSend(ctx, renderTyphoonOverview, '台风全览图', '台风全览图获取失败（当前可能没有活跃台风）')
        return
    }
}