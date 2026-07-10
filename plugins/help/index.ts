import { Structs } from 'node-napcat-ts'
import { bot } from '../../index.ts'
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'

GlobalFonts.registerFromPath('C:\\Windows\\Fonts\\msyh.ttc', 'Microsoft YaHei')

const SCALE = 2
const W = 780
const PAD = 30
const CW = W - PAD * 2

interface CmdItem {
  cmd: string
  desc: string
}

interface Section {
  title: string
  accent: string
  cmds: CmdItem[]
}

const SECTIONS: Section[] = [
  {
    title: '机厅功能',
    accent: '#FF6B6B',
    cmds: [
      { cmd: '添加机厅 / tjjt [名称]', desc: '将机厅加入本群（管理员）' },
      { cmd: '删除机厅 / scjt [名称]', desc: '从本群移除机厅（管理员）' },
      { cmd: '机厅别名 / jtbm [名称] [别名]', desc: '添加机厅别名（管理员）' },
      { cmd: '删除别名 / scbm [别名]', desc: '删除机厅别名（管理员）' },
      { cmd: '机厅几 / jtj', desc: '查看本群所有机厅人数' },
      { cmd: '[机厅名]j / [机厅名]几', desc: '查看单个机厅详情' },
      { cmd: '[机厅名]+N / [机厅名]-N', desc: '更新人数（范围 0-100，同步广播至绑定群）' },
      { cmd: '机厅排行 / jtph', desc: '查看机厅人数排行' },
      { cmd: '本群机厅 / bqjt', desc: '查看本群机厅绑定信息（管理员）' },
      { cmd: '获取所有门店 / hqsymd [关键词...]', desc: '查询门店（支持多关键词筛选）' },
    ],
  },
  {
    title: '中二节奏',
    accent: '#4ECDC4',
    cmds: [
      { cmd: '[曲名]是什么歌', desc: '搜索中二节奏曲目详情' },
      { cmd: 'id[歌曲ID]是什么歌', desc: 'ID 搜索歌曲' },
    ],
  },
  {
    title: 'AI 评图',
    accent: '#A78BFA',
    cmds: [
      { cmd: '评图（回复图片消息）', desc: 'AI 评价图片' },
      { cmd: '正常评图（回复图片消息）', desc: 'AI 正常评价（夸赞）图片' },
    ],
  },
  {
    title: '表情包',
    accent: '#FBBF24',
    cmds: [
      { cmd: '给我表情（回复图片消息）', desc: '将图片转为表情文件发送' },
    ],
  },
  {
    title: '群友结婚',
    accent: '#F472B6',
    cmds: [
      { cmd: '娶群友', desc: '随机或 @某人 结婚' },
      { cmd: '闹离婚', desc: '与当前配偶离婚' },
    ],
  },
  {
    title: '娱乐',
    accent: '#34D399',
    cmds: [
      { cmd: '随机猪猪', desc: '随机获取猪猪图片' },
    ],
  },
  {
    title: '交互',
    accent: '#60A5FA',
    cmds: [
      { cmd: '戳一戳 Bot', desc: '随机回复文字+音频' },
    ],
  },
  {
    title: '自动功能',
    accent: '#FB923C',
    cmds: [
      { cmd: 'B站 UP 主动态推送（每10分钟）', desc: '自动推送关注的UP主动态' },
      { cmd: '每日零点机厅人数自动清零', desc: '' },
    ],
  },
{
    title: '气象',
    accent: '#38BDF8',
    cmds: [
      { cmd: '天气 <城市名>', desc: '城市天气（如 天气 北京）' },
      { cmd: '天气 / 天气 雷达 / 雷达图', desc: '全国雷达拼图（默认）' },
      { cmd: '天气 云图', desc: '卫星云图' },
      { cmd: '天气 风场 / 风场图', desc: '全国风场流线图' },
      { cmd: '天气 全球风场 / 全球风场图', desc: '全球风场流线图' },
      { cmd: '天气 台风', desc: '台风路径图' },
      { cmd: '天气 台风全览', desc: '台风全览图' },
      { cmd: '天气 台风列表', desc: '查看活跃台风列表' },
      { cmd: '天气 台风 <编号>', desc: '台风详情（如 天气 台风2609）' },
    ],
  },
]

const CARD_R = 14
const CARD_PX = 20
const CARD_PY = 16
const HEADER_H = 30
const LINE_H = 26
const GAP = 14

function calcHeight(): number {
  let y = PAD + 45 + 25 + 24
  for (const s of SECTIONS) {
    y += CARD_PY + HEADER_H + s.cmds.length * LINE_H + CARD_PY + GAP
  }
  return y + PAD
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function drawCard(
  ctx: any,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + CARD_R, y)
  ctx.lineTo(x + w - CARD_R, y)
  ctx.arcTo(x + w, y, x + w, y + CARD_R, CARD_R)
  ctx.lineTo(x + w, y + h - CARD_R)
  ctx.arcTo(x + w, y + h, x + w - CARD_R, y + h, CARD_R)
  ctx.lineTo(x + CARD_R, y + h)
  ctx.arcTo(x, y + h, x, y + h - CARD_R, CARD_R)
  ctx.lineTo(x, y + CARD_R)
  ctx.arcTo(x, y, x + CARD_R, y, CARD_R)
  ctx.closePath()
}

export async function sendHelp(ctx: any): Promise<void> {
  const raw = ctx.raw_message || ''
  if (!raw.startsWith('#help') && !raw.startsWith('#帮助') && !raw.startsWith('bot帮助')) return

  const H = calcHeight()
  const canvas = createCanvas(W * SCALE, H * SCALE)
  const c = canvas.getContext('2d')
  c.scale(SCALE, SCALE)

  // Background gradient
  const grad = c.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#1a1a2e')
  grad.addColorStop(0.5, '#16213e')
  grad.addColorStop(1, '#0f3460')
  c.fillStyle = grad
  c.fillRect(0, 0, W, H)

  // Title
  c.textAlign = 'center'
  c.fillStyle = '#ffffff'
  c.font = 'bold 28px "Microsoft YaHei"'
  c.fillText('烫猫 Bot 功能帮助', W / 2, PAD + 45)

  // Subtitle
  c.font = '14px "Microsoft YaHei"'
  c.fillStyle = 'rgba(255,255,255,0.5)'
  c.fillText('发送 #help / #帮助 / bot帮助 查看此帮助', W / 2, PAD + 45 + 25)

  let curY = PAD + 45 + 25 + 24

  for (const s of SECTIONS) {
    const cardH = CARD_PY + HEADER_H + s.cmds.length * LINE_H + CARD_PY

    // Card background
    c.save()
    drawCard(c, PAD, curY, CW, cardH)
    c.fillStyle = 'rgba(255,255,255,0.06)'
    c.fill()
    c.strokeStyle = 'rgba(255,255,255,0.08)'
    c.lineWidth = 1
    c.stroke()
    c.restore()

    // Left accent bar
    c.fillStyle = s.accent
    c.fillRect(PAD, curY + 12, 4, cardH - 24)

    // Section title
    const titleX = PAD + CARD_PX + 4
    const titleY = curY + CARD_PY + 22
    c.textAlign = 'left'
    c.font = 'bold 19px "Microsoft YaHei"'
    c.fillStyle = s.accent
    c.fillText(s.title, titleX, titleY)

    // Separator line
    c.strokeStyle = hexToRgba(s.accent, 0.3)
    c.lineWidth = 1
    c.beginPath()
    c.moveTo(titleX, titleY + 8)
    c.lineTo(PAD + CW - CARD_PX - 4, titleY + 8)
    c.stroke()

    // Commands
    for (let i = 0; i < s.cmds.length; i++) {
      const lineY = titleY + 8 + 16 + i * LINE_H + 18
      c.fillStyle = '#e0e0e0'
      c.font = 'bold 15px "Microsoft YaHei"'
      const cmdText = s.cmds[i].cmd
      const cmdWidth = c.measureText(cmdText).width
      c.fillText(cmdText, titleX, lineY)

      if (s.cmds[i].desc) {
        c.fillStyle = 'rgba(255,255,255,0.45)'
        c.font = '13px "Microsoft YaHei"'
        c.fillText('— ' + s.cmds[i].desc, titleX + cmdWidth + 8, lineY + 1)
      }
    }

    curY += cardH + GAP
  }

  // Footer
  c.textAlign = 'center'
  c.font = '12px "Microsoft YaHei"'
  c.fillStyle = 'rgba(255,255,255,0.3)'
  c.fillText('hotCat-bot-qq  ·  by CHCAT1320', W / 2, H - 16)

  const pngBuffer = canvas.encodeSync('png')
    const dataUrl = 'base64://' + pngBuffer.toString('base64')

    await bot.api.send_group_msg({
        group_id: ctx.group_id,
        message: [
            Structs.image(dataUrl),
        ],
    })
}