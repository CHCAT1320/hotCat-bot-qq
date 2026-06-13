import { Structs } from 'node-napcat-ts'
import { bot } from '../../index.ts'

interface Marriage {
    userId: string
    spouseId: string
}

const marriages: Marriage[] = []

function addMarriage(userId: string, spouseId: string): void {
    marriages.push({ userId, spouseId })
}

function removeMarriage(userId: string): Marriage | null {
    const idx = marriages.findIndex(m => m.userId === userId || m.spouseId === userId)
    if (idx === -1) return null
    return marriages.splice(idx, 1)[0]
}

function getSpouseId(userId: string): string | null {
    const m = marriages.find(m => m.userId === userId || m.spouseId === userId)
    if (!m) return null
    return m.userId === userId ? m.spouseId : m.userId
}

function getMarriedUserIds(): Set<string> {
    const ids = new Set<string>()
    for (const m of marriages) {
        ids.add(m.userId)
        ids.add(m.spouseId)
    }
    return ids
}

function avatarUrl(qq: string | number): string {
    return `http://q1.qlogo.cn/g?b=qq&nk=${qq}&s=640`
}

async function getNickname(groupId: number, userId: number): Promise<string> {
    const info = await bot.api.get_group_member_info({ group_id: groupId, user_id: userId })
    return info.nickname
}

export async function marryGroupMember(ctx: any): Promise<void> {
    if (!ctx.raw_message.startsWith('娶群友')) return

    const senderId = String(ctx.sender.user_id)
    const atUser = ctx.message.find((msg: any) => msg.type === 'at')?.data?.qq

    const selfSpouseId = getSpouseId(senderId)
    if (selfSpouseId) {
        const spouseName = await getNickname(ctx.group_id, Number(selfSpouseId))
        await bot.api.send_group_msg({
            group_id: ctx.group_id,
            message: [
                Structs.text(`你已经跟 ${spouseName} 结婚了，不能再跟别人结婚了！`),
                Structs.image(avatarUrl(selfSpouseId))
            ]
        })
        return
    }

    const members = await bot.api.get_group_member_list({ group_id: ctx.group_id })
    let targetIdStr: string
    let targetIdNum: number

    if (atUser) {
        targetIdStr = String(atUser)
        targetIdNum = Number(atUser)

        const targetSpouseId = getSpouseId(targetIdStr)
        if (targetSpouseId) {
            const [targetName, targetSpouseName] = await Promise.all([
                getNickname(ctx.group_id, targetIdNum),
                getNickname(ctx.group_id, Number(targetSpouseId))
            ])
            await bot.api.send_group_msg({
                group_id: ctx.group_id,
                message: [
                    Structs.text(`${targetName} 已经跟 ${targetSpouseName} 结婚了，你不能娶TA！`),
                    Structs.image(avatarUrl(targetIdStr))
                ]
            })
            return
        }
    } else {
        const marriedIds = getMarriedUserIds()
        const singleMembers = members.filter((m: any) => {
            const mid = String(m.user_id)
            return !marriedIds.has(mid) && mid !== senderId
        })

        if (singleMembers.length === 0) {
            await bot.api.send_group_msg({
                group_id: ctx.group_id,
                message: [Structs.text('群里已经没有合适的单身对象了！')]
            })
            return
        }

        const selected = singleMembers[Math.floor(Math.random() * singleMembers.length)]
        targetIdNum = Number(selected.user_id)
        targetIdStr = String(selected.user_id)
    }

    addMarriage(senderId, targetIdStr)

    const targetName = await getNickname(ctx.group_id, targetIdNum)

    if (targetIdStr === senderId) {
        await bot.api.send_group_msg({
            group_id: ctx.group_id,
            message: [Structs.text('哇你好自恋啊，既然这样，我就满足你吧！')]
        })
    }

    await bot.api.send_group_msg({
        group_id: ctx.group_id,
        message: [
            Structs.text(`恭喜 ${ctx.sender.nickname} 跟 ${targetName} 结婚成功！`),
            Structs.image(avatarUrl(targetIdStr))
        ]
    })
}

export async function unmarryGroupMember(ctx: any): Promise<void> {
    if (ctx.raw_message !== '闹离婚') return

    const senderId = String(ctx.sender.user_id)
    const spouseId = getSpouseId(senderId)

    if (!spouseId) {
        await bot.api.send_group_msg({
            group_id: ctx.group_id,
            message: [Structs.text('你没有结婚，不能离婚！')]
        })
        return
    }

    const spouseName = await getNickname(ctx.group_id, Number(spouseId))

    await bot.api.send_group_msg({
        group_id: ctx.group_id,
        message: [
            Structs.text(`你跟 ${spouseName} 离婚成功！`),
            Structs.image(avatarUrl(spouseId))
        ]
    })

    removeMarriage(senderId)
}