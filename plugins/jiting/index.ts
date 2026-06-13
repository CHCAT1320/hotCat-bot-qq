import { Structs } from 'node-napcat-ts'
import { bot } from '../../index.ts'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const STORE_API = 'https://sega-register.wahlap.net/api/sega/midtr/rest/location'

let cachedStores: any[] | null = null
let storeCacheTime = 0
const STORE_CACHE_TTL = 60 * 60 * 1000

async function fetchAllStores(): Promise<any[]> {
  if (cachedStores && Date.now() - storeCacheTime < STORE_CACHE_TTL) return cachedStores
  const res = await fetch(STORE_API)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data: any = await res.json()
  const stores = Array.isArray(data) ? data : data?.locations ?? data?.shops ?? data ?? []
  cachedStores = stores
  storeCacheTime = Date.now()
  return stores
}

interface ShopInfo {
  arcadeName: string
  address: string
  id: string
  placeId: string
  group?: string[]
  aliases?: string[]
  members?: number
  reporter?: string
  reportTime?: string
}

interface ShopDataFile {
  lastUpdated: string
  shops: ShopInfo[]
}

interface CooldownEntry {
  memberUpdate: number
  addJiting: number
  addAlias: number
  deleteJiting: number
  deleteAlias: number
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_FILE = path.join(__dirname, 'shopInfo.json')
const ADMIN_QQ = '1095216448'
const MAX_MEMBERS = 100
const MAX_ALIAS_LENGTH = 20
const COOLDOWN_MS = {
  memberUpdate: 3000,
  addJiting: 5000,
  addAlias: 5000,
  deleteJiting: 5000,
  deleteAlias: 5000,
}

let writeLock: Promise<void> = Promise.resolve()
const cooldowns = new Map<string, CooldownEntry>()

function acquireLock<T>(fn: () => T): Promise<T> {
  const prev = writeLock
  let release: () => void
  writeLock = new Promise<void>(resolve => { release = resolve })
  return prev.then(() => fn()).finally(() => release!()) as Promise<T>
}

function loadShopData(): ShopDataFile {
  try {
    if (!fs.existsSync(DATA_FILE)) return { lastUpdated: '', shops: [] }
    const data: ShopDataFile = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
    if (!Array.isArray(data.shops)) data.shops = []
    return data
  } catch { return { lastUpdated: '', shops: [] } }
}

function saveShopDataSync(data: ShopDataFile): void {
  const tmp = DATA_FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8')
  fs.renameSync(tmp, DATA_FILE)
}

function getCooldownKey(gid: number, uid: number): string {
  return `${gid}-${uid}`
}

function isOnCooldown(gid: number, uid: number, action: keyof CooldownEntry): boolean {
  const e = cooldowns.get(getCooldownKey(gid, uid))
  return e ? Date.now() - e[action] < COOLDOWN_MS[action] : false
}

function setCooldown(gid: number, uid: number, action: keyof CooldownEntry): void {
  const key = getCooldownKey(gid, uid)
  const e = cooldowns.get(key) || { memberUpdate: 0, addJiting: 0, addAlias: 0, deleteJiting: 0, deleteAlias: 0 }
  e[action] = Date.now()
  cooldowns.set(key, e)
}

function checkAdmin(userId: string, role: string): boolean {
  return userId === ADMIN_QQ || role === 'owner' || role === 'admin'
}

function cleanCount(s: string): { sign: string; value: number } {
  const t = s.trim()
  if (t.startsWith('+')) return { sign: '+', value: parseInt(t.slice(1), 10) }
  if (t.startsWith('-')) return { sign: '-', value: parseInt(t.slice(1), 10) }
  return { sign: '=', value: parseInt(t, 10) }
}

function parseTimeStr(reportTime: string | undefined): Date | null {
  if (!reportTime || reportTime === '暂无' || reportTime.length < 19) return null
  const d = new Date(reportTime.replace(' ', 'T') + '+08:00')
  return isNaN(d.getTime()) ? null : d
}

function minutesSince(reportTime: string | undefined): string {
  if (!reportTime || reportTime === '暂无') return '未知'
  const d = parseTimeStr(reportTime)
  return d ? String(Math.floor((Date.now() - d.getTime()) / 60000)) : '未知'
}

function shopInGroup(shop: ShopInfo, groupId: number): boolean {
  return shop.group?.includes(String(groupId)) ?? false
}

function getMatchName(shop: ShopInfo, query: string): string | null {
  const ids: { key: string }[] = [
    { key: shop.arcadeName },
    { key: shop.id },
    { key: shop.placeId },
    { key: shop.address },
    ...(shop.aliases || []).map(a => ({ key: a })),
  ]
  ids.sort((a, b) => b.key.length - a.key.length)
  for (const item of ids) {
    if (query.startsWith(item.key)) return item.key
  }
  return null
}

function formatTime(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

async function sendMsg(gid: number, text: string): Promise<void> {
  await bot.api.send_group_msg({ group_id: gid, message: [Structs.text(text)] })
}

function dailyResetMembers(): boolean {
  const today = formatTime().slice(0, 10)
  const data = loadShopData()
  if (data.lastUpdated === today) return false
  let changed = false
  for (const shop of data.shops) {
    const d = parseTimeStr(shop.reportTime)
    if (!d || d.toISOString().slice(0, 10) !== today) {
      shop.members = 0
      shop.reporter = '零点自动清零'
      shop.reportTime = today + ' 00:00:00'
      changed = true
    }
  }
  data.lastUpdated = today
  saveShopDataSync(data)
  return changed
}

export async function addJiting(ctx: any): Promise<void> {
  const raw = ctx.raw_message || ''
  if (!raw.startsWith('添加机厅') && !raw.startsWith('tjjt')) return

  const gid = ctx.group_id
  const uid = String(ctx.sender.user_id)
  const role = ctx.sender.role || 'member'

  if (!checkAdmin(uid, role)) {
    await sendMsg(gid, '你没有权限执行此操作！')
    return
  }

  const parts = raw.split(/\s+/)
  if (parts.length < 2) {
    await sendMsg(gid, '请使用格式：添加机厅 [机厅名称/ID/地址]')
    return
  }
  const name = parts.slice(1).join(' ') || parts[1]

  if (isOnCooldown(gid, ctx.sender.user_id, 'addJiting')) {
    await sendMsg(gid, '操作太快，请稍后再试！')
    return
  }
  setCooldown(gid, ctx.sender.user_id, 'addJiting')

  const data = loadShopData()
  for (const shop of data.shops) {
    if (name === shop.address || name === shop.arcadeName || name === shop.id || name === shop.placeId) {
      if (!shop.group) shop.group = []
      if (shop.group.includes(String(gid))) {
        await sendMsg(gid, `机厅 ${shop.arcadeName} 已在本群中！`)
        return
      }
      shop.group.push(String(gid))
      shop.members = shop.members ?? 0
      shop.reporter = shop.reporter ?? ''
      shop.reportTime = shop.reportTime ?? ''
      shop.aliases = shop.aliases ?? []
      saveShopDataSync(data)
      await sendMsg(gid, `添加机厅 ${shop.arcadeName} 成功！`)
      return
    }
  }

  try {
    const stores = await fetchAllStores()
    const found = stores.find((s: any) => {
      const apiName = s.arcadeName || s.name || ''
      const apiId = s.id || s.placeId || ''
      const apiAddr = s.address || ''
      return name && (
        name === apiName || name === apiId || name === apiAddr ||
        apiName.includes(name) || apiAddr.includes(name)
      )
    })
    if (!found) {
      await sendMsg(gid, `未找到机厅 ${name} ！\n提示：使用 获取所有门店 [关键词] 搜索门店名称/地址/ID`)
      return
    }
    const newShop: ShopInfo = {
      arcadeName: found.arcadeName || found.name || name,
      address: found.address || '',
      id: found.id || '',
      placeId: found.placeId || '',
      group: [String(gid)],
      aliases: [],
      members: 0,
      reporter: '',
      reportTime: '',
    }
    data.shops.push(newShop)
    saveShopDataSync(data)
    await sendMsg(gid, `添加机厅 ${newShop.arcadeName} 成功！\n（首次添加，已从在线数据库中登记该机厅）`)
  } catch (e: any) {
    await sendMsg(gid, `查询机厅失败：${e.message || '网络错误'}\n请使用 获取所有门店 [关键词] 手动搜索后重试`)
  }
}

export async function deleteJiting(ctx: any): Promise<void> {
  const raw = ctx.raw_message || ''
  if (!raw.startsWith('删除机厅') && !raw.startsWith('scjt')) return

  const gid = ctx.group_id
  const uid = String(ctx.sender.user_id)
  const role = ctx.sender.role || 'member'

  if (!checkAdmin(uid, role)) {
    await sendMsg(gid, '你没有权限执行此操作！')
    return
  }

  const parts = raw.split(/\s+/)
  if (parts.length < 2) {
    await sendMsg(gid, '请使用格式：删除机厅 [机厅名称/ID/地址]')
    return
  }
  const name = parts.slice(1).join(' ') || parts[1]

  if (isOnCooldown(gid, ctx.sender.user_id, 'deleteJiting')) {
    await sendMsg(gid, '操作太快，请稍后再试！')
    return
  }
  setCooldown(gid, ctx.sender.user_id, 'deleteJiting')

  const data = loadShopData()
  for (const shop of data.shops) {
    if (name === shop.address || name === shop.arcadeName || name === shop.id || name === shop.placeId) {
      if (!shop.group?.includes(String(gid))) {
        await sendMsg(gid, `机厅 ${shop.arcadeName} 未在本群中！`)
        return
      }
      shop.group = shop.group.filter(g => g !== String(gid))
      shop.members = 0
      shop.reporter = ''
      shop.reportTime = ''
      saveShopDataSync(data)
      await sendMsg(gid, `删除机厅 ${shop.arcadeName} 成功！`)
      return
    }
  }
  await sendMsg(gid, `未找到机厅 ${name} ！`)
}

export async function addJitingAlias(ctx: any): Promise<void> {
  const raw = ctx.raw_message || ''
  if (!raw.startsWith('机厅别名') && !raw.startsWith('jtbm')) return

  const gid = ctx.group_id
  const uid = String(ctx.sender.user_id)
  const role = ctx.sender.role || 'member'

  if (!checkAdmin(uid, role)) {
    await sendMsg(gid, '你没有权限执行此操作！')
    return
  }

  const parts = raw.split(/\s+/)
  if (parts.length < 3) {
    await sendMsg(gid, '请使用格式：机厅别名 [机厅名称] [别名]')
    return
  }
  const name = parts[1]
  const alias = parts.slice(2).join(' ')

  if (!alias) {
    await sendMsg(gid, '别名不能为空！')
    return
  }
  if (alias.length > MAX_ALIAS_LENGTH) {
    await sendMsg(gid, `别名长度不能超过 ${MAX_ALIAS_LENGTH} 个字符！`)
    return
  }

  if (isOnCooldown(gid, ctx.sender.user_id, 'addAlias')) {
    await sendMsg(gid, '操作太快，请稍后再试！')
    return
  }
  setCooldown(gid, ctx.sender.user_id, 'addAlias')

  const data = loadShopData()
  for (const shop of data.shops) {
    shop.aliases = shop.aliases ?? []
    const matchCheck = name === shop.arcadeName || name === shop.id || name === shop.placeId || name === shop.address || shop.aliases.includes(name)
    if (!matchCheck) continue

    if (!shop.group?.includes(String(gid))) {
      await sendMsg(gid, `机厅 ${shop.arcadeName} 未在本群中！`)
      return
    }
    if (shop.aliases.includes(alias)) {
      await sendMsg(gid, `机厅 ${shop.arcadeName} 已存在别名 ${alias}！`)
      return
    }
    if (alias === shop.arcadeName || alias === shop.id || alias === shop.placeId || alias === shop.address) {
      await sendMsg(gid, `别名 ${alias} 不能与机厅名称相同！`)
      return
    }
    if (/[\r\n]/.test(alias)) {
      await sendMsg(gid, '机厅别名不能包含换行符！')
      return
    }
    if (alias.includes(' ')) {
      await sendMsg(gid, '机厅别名不能包含空格！')
      return
    }
    if (/[\x00-\x08\x0B\x0C\x0E-\x1F\u200B-\u200F\uFEFF]/.test(alias)) {
      await sendMsg(gid, '机厅别名不能包含控制字符！')
      return
    }
    if (alias.endsWith('j') || alias.endsWith('几')) {
      await sendMsg(gid, '机厅别名不能以「j」或「几」结尾！')
      return
    }
    shop.aliases.push(alias)
    saveShopDataSync(data)
    await sendMsg(gid, `添加机厅 ${shop.arcadeName} 别名 ${alias} 成功！`)
    return
  }
  await sendMsg(gid, `未找到机厅 ${name} ！`)
}

export async function deleteJitingAlias(ctx: any): Promise<void> {
  const raw = ctx.raw_message || ''
  if (!raw.startsWith('删除别名') && !raw.startsWith('scbm')) return

  const gid = ctx.group_id
  const uid = String(ctx.sender.user_id)
  const role = ctx.sender.role || 'member'

  if (!checkAdmin(uid, role)) {
    await sendMsg(gid, '你没有权限执行此操作！')
    return
  }

  const parts = raw.split(/\s+/)
  if (parts.length < 2) {
    await sendMsg(gid, '请使用格式：删除别名 [别名]')
    return
  }
  const alias = parts[1]

  if (isOnCooldown(gid, ctx.sender.user_id, 'deleteAlias')) {
    await sendMsg(gid, '操作太快，请稍后再试！')
    return
  }
  setCooldown(gid, ctx.sender.user_id, 'deleteAlias')

  const data = loadShopData()
  for (const shop of data.shops) {
    if (!shop.aliases || !shop.group?.includes(String(gid))) continue
    const idx = shop.aliases.indexOf(alias)
    if (idx === -1) continue
    shop.aliases.splice(idx, 1)
    saveShopDataSync(data)
    await sendMsg(gid, `删除机厅 ${shop.arcadeName} 别名 ${alias} 成功！`)
    return
  }
  await sendMsg(gid, `未找到别名 ${alias} ！`)
}

export async function updateJitingMembers(ctx: any): Promise<void> {
  const raw = ctx.raw_message || ''
  if (raw.endsWith('j') || raw.endsWith('几')) return

  const gid = ctx.group_id
  const uid = ctx.sender.user_id
  const nick = ctx.sender.nickname || String(uid)

  if (isOnCooldown(gid, uid, 'memberUpdate')) return
  setCooldown(gid, uid, 'memberUpdate')

  const data = loadShopData()
  const sorted = [...data.shops].sort((a, b) => b.arcadeName.length - a.arcadeName.length)

  for (const shop of sorted) {
    if (!shop.group?.includes(String(gid))) continue

    const matchName = getMatchName(shop, raw)
    if (!matchName) continue

    let countStr = raw.slice(matchName.length).trim()
    if (!countStr) {
      await sendMsg(gid, `机厅 ${shop.arcadeName} 当前人数：${shop.members ?? 0}`)
      return
    }

    const { sign, value } = cleanCount(countStr)
    if (isNaN(value)) {
      await sendMsg(gid, '人数格式错误，请使用数字！')
      return
    }
    if (countStr.includes('.') || String(value) !== countStr.replace(/^[+-]/, '')) {
      await sendMsg(gid, '愤怒喵！')
      return
    }

    shop.members = shop.members ?? 0
    shop.reporter = shop.reporter ?? ''
    shop.reportTime = shop.reportTime ?? ''

    if (sign === '+') shop.members += value
    else if (sign === '-') shop.members -= value
    else shop.members = value

    const now = formatTime()
    if (shop.members < 0) {
      shop.members = 0
      shop.reporter = nick
      shop.reportTime = now
      saveShopDataSync(data)
      await sendMsg(gid, '愤怒喵！')
      return
    }
    if (shop.members > MAX_MEMBERS) {
      shop.members = 0
      shop.reporter = nick
      shop.reportTime = now
      saveShopDataSync(data)
      await sendMsg(gid, `[ 机厅人数更新 ]\n${shop.arcadeName}\n当前人数：0（爆炸了！无人幸免，人数归0！）\n报告人：${nick}\n报告时间：${now}`)
      await syncToGroups(shop, gid, nick, now)
      return
    }

    shop.reporter = nick
    shop.reportTime = now
    saveShopDataSync(data)
    await sendMsg(gid, `[ 机厅人数更新 ]\n${shop.arcadeName}\n当前人数：${shop.members}\n报告人：${nick}\n报告时间：${now}`)
    await syncToGroups(shop, gid, nick, now)
    return
  }
}

async function syncToGroups(shop: ShopInfo, sourceGid: number, reporter: string, time: string): Promise<void> {
  const targetGroups = (shop.group || []).filter(g => g !== String(sourceGid))
  if (targetGroups.length === 0) return
  const msg = `[ 机厅人数更新 ]\n${shop.arcadeName}\n当前人数：${shop.members ?? 0}\n报告人：${reporter}\n来源群：${sourceGid}\n报告时间：${time}`
  for (const g of targetGroups) {
    try { await sendMsg(Number(g), msg) } catch {}
  }
}

export async function lookUpJiting(ctx: any): Promise<void> {
  const raw = ctx.raw_message || ''
  if (!raw.startsWith('机厅几') && !raw.startsWith('jtj')) return

  const gid = ctx.group_id
  dailyResetMembers()
  const list = loadShopData().shops
    .filter(s => s.group?.includes(String(gid)))
    .map(s => {
      s.members = s.members ?? 0
      s.reporter = s.reporter ?? '暂无'
      s.reportTime = s.reportTime ?? '暂无'
      s.aliases = s.aliases ?? []
      return s
    })

  if (list.length === 0) {
    await sendMsg(gid, '本群未添加任何机厅！')
    return
  }

  const lines = list.map((s, i) =>
    [
      `${i + 1}. ${s.arcadeName}(${s.aliases?.[0] || '无别名'})`,
      `人数：${s.members}`,
      `报告人：${s.reporter}`,
      `更新时间：${s.reportTime}`,
      `距离上次报告已过去：${minutesSince(s.reportTime)} 分钟`,
    ].join('\n'),
  )

  await sendMsg(
    gid,
    `本群共添加了 ${list.length} 个机厅：\n现在是：${formatTime()}\n${lines.join('\n')}`,
  )
}

export async function lookUpOneJiting(ctx: any): Promise<void> {
  const raw = ctx.raw_message || ''
  if (!raw.endsWith('j') && !raw.endsWith('几')) return

  const gid = ctx.group_id
  const query = raw.slice(0, -1)

  for (const shop of loadShopData().shops) {
    if (!shopInGroup(shop, gid)) continue
    shop.aliases = shop.aliases ?? []
    shop.members = shop.members ?? 0
    shop.reporter = shop.reporter ?? '暂无'
    shop.reportTime = shop.reportTime ?? '暂无'

    const identifiers = [shop.arcadeName, shop.id, shop.placeId, shop.address, ...shop.aliases]
    if (!identifiers.includes(query)) continue

    await sendMsg(
      gid,
      [
        '[ 单机厅查询 ]',
        `名称：${shop.arcadeName}`,
        `别名：${shop.aliases.join(', ') || '无'}`,
        `地址：${shop.address}`,
        `ID：${shop.id}`,
        `地点ID：${shop.placeId}`,
        `人数：${shop.members}`,
        `报告人：${shop.reporter}`,
        `更新时间：${shop.reportTime}`,
        `距离上次报告已过去：${minutesSince(shop.reportTime)} 分钟`,
      ].join('\n'),
    )
    return
  }
}

export async function getGroupShopInfo(ctx: any): Promise<void> {
  const raw = ctx.raw_message || ''
  if (!raw.startsWith('本群机厅') && !raw.startsWith('bqjt')) return

  const gid = ctx.group_id
  const userId = String(ctx.sender.user_id)
  const role = ctx.sender.role || 'member'

  if (!checkAdmin(userId, role)) {
    await sendMsg(gid, '你没有权限执行此操作！')
    return
  }

  const all = loadShopData().shops
  const inGroup = all.filter(s => s.group?.includes(String(gid)))

  if (inGroup.length === 0) {
    await sendMsg(gid, '本群未添加任何机厅！')
    return
  }

  const lines: string[] = []
  for (let i = 0; i < inGroup.length; i++) {
    const s = inGroup[i]
    const aliasStr = s.aliases?.length ? `(${s.aliases.join(', ')})` : ''
    const groupIds = s.group || []
    const boundStr = groupIds.length > 0 ? ` [群: ${groupIds.join(', ')}]` : ' [未绑定任何群]'
    lines.push(`${i + 1}. ${s.arcadeName}${aliasStr}${boundStr}`)
  }

  await sendMsg(gid, `[ 本群机厅绑定信息 ]\n共 ${inGroup.length} 个机厅：\n${lines.join('\n')}`)
}

export async function jitingRank(ctx: any): Promise<void> {
  const raw = ctx.raw_message || ''
  if (!raw.startsWith('机厅排行') && !raw.startsWith('jtph')) return

  const gid = ctx.group_id
  const list = loadShopData()
    .shops.filter(s => s.group?.includes(String(gid)) && s.reportTime && s.reportTime !== '暂无')
    .sort((a, b) => (b.members ?? 0) - (a.members ?? 0))

  if (list.length === 0) {
    await sendMsg(gid, '本群暂无任何机厅数据！')
    return
  }

  const lines = list.map((s, i) =>
    `${i + 1}. ${s.arcadeName}\n   人数：${s.members ?? 0}\n   更新时间：${s.reportTime || '暂无'}`
  )
  await sendMsg(gid, `[ 机厅人数排行 ]\n共 ${list.length} 个机厅：\n\n${lines.join('\n\n')}`)
}

export async function getAllShops(ctx: any): Promise<void> {
  const raw = ctx.raw_message || ''
  if (!raw.startsWith('获取所有门店') && !raw.startsWith('hqsymd')) return

  const gid = ctx.group_id
  const parts = raw.split(/\s+/)
  const keywords = parts.length >= 2 ? parts.slice(1) : []

  try {
    const stores = await fetchAllStores()
    let filtered = stores
    if (keywords.length > 0) {
      filtered = stores.filter((s: any) => {
        const searchable = [s.province, s.name, s.arcadeName, s.address, s.id, s.placeId].filter(Boolean).join(' ')
        return keywords.every(kw => searchable.includes(kw))
      })
    }

    if (filtered.length === 0) {
      await sendMsg(gid, keywords.length > 0 ? `未找到匹配「${keywords.join(' ')}」的门店！` : '未找到任何门店数据！')
      return
    }

    const lines: string[] = []
    for (let i = 0; i < Math.min(filtered.length, 30); i++) {
      const s = filtered[i]
      const name = s.arcadeName || s.name || s.id || '未知'
      const addr = s.address || ''
      const id = s.id || s.placeId || ''
      lines.push(`${i + 1}. ${name}${addr ? ' - ' + addr : ''}${id ? ' (ID: ' + id + ')' : ''}`)
    }

    let header = `[ 门店列表 ]\n`
    if (keywords.length > 0) header += `筛选：${keywords.join(' ')}\n`
    header += `共 ${filtered.length} 家门店`
    if (filtered.length > 30) header += `（仅显示前30家）`
    await sendMsg(gid, `${header}\n${lines.join('\n')}`)
  } catch (e: any) {
    console.error('[Jiting] 获取门店失败:', e)
    await sendMsg(gid, `获取门店数据失败：${e.message || '网络错误'}`)
  }
}

export function scheduleDailyReset(): void {
  dailyResetMembers()
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2)
  setTimeout(() => {
    dailyResetMembers()
    scheduleDailyReset()
  }, next.getTime() - now.getTime())
}