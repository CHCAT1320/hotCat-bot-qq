import { Structs } from 'node-napcat-ts'
import { bot } from '../../index.ts'

const SONG_LIST_URL = 'https://maimai.lxns.net/api/v0/chunithm/song/list?notes=true'
const ALIAS_LIST_URL = 'https://maimai.lxns.net/api/v0/chunithm/alias/list'
const API_TIMEOUT_MS = 30000
const CACHE_TTL_MS = 30 * 60 * 1000
const MAX_RESULTS_DISPLAY = 50

let cachedSongs: any[] | null = null
let cachedAliases: any[] | null = null
let cacheTimestamp = 0

interface Song {
    id: number
    title: string
    artist: string
    genre: string
    bpm: number | string
    difficulties: { level: string; level_value: number; note_designer: string }[]
}

interface AliasEntry {
    song_id: number
    aliases: string[]
    name: string
}

async function fetchWithTimeout(url: string, timeout: number): Promise<any> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    try {
        const res = await fetch(url, { signal: controller.signal })
        clearTimeout(timeoutId)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
    } catch (e) {
        clearTimeout(timeoutId)
        throw e
    }
}

async function fetchChunithmData(): Promise<{ songs: Song[]; aliases: AliasEntry[] }> {
    const now = Date.now()
    if (cachedSongs && cachedAliases && (now - cacheTimestamp) < CACHE_TTL_MS) {
        return { songs: cachedSongs, aliases: cachedAliases }
    }

    const [songData, aliasData] = await Promise.all([
        fetchWithTimeout(SONG_LIST_URL, API_TIMEOUT_MS),
        fetchWithTimeout(ALIAS_LIST_URL, API_TIMEOUT_MS)
    ])

    cachedSongs = songData.songs
    cachedAliases = aliasData.aliases
    cacheTimestamp = now
    return { songs: cachedSongs, aliases: cachedAliases }
}

interface SearchResult {
    song: Song
    matchedAliases: AliasEntry[]
}

function searchChunithmSong(query: string, songs: Song[], aliases: AliasEntry[]): { results: SearchResult[]; isIdMatch: boolean } {
    const results: SearchResult[] = []
    const queryClean = query.toLowerCase().replace(/\s/g, '')

    const idMatch = queryClean.match(/^id(\d+)$/)
    if (idMatch) {
        const targetId = parseInt(idMatch[1], 10)
        const song = songs.find(s => s.id === targetId)
        if (song) results.push({ song, matchedAliases: aliases.filter(a => a.song_id === targetId) })
        return { results, isIdMatch: true }
    }

    // Exact title match
    for (const song of songs) {
        if (song.title.toLowerCase().replace(/\s/g, '') === queryClean) {
            results.push({ song, matchedAliases: aliases.filter(a => a.song_id === song.id) })
            return { results, isIdMatch: false }
        }
    }

    // Alias match (exact)
    for (const alias of aliases) {
        const aliasNames = alias.aliases.map(a => a.replace(/\s/g, '').toLowerCase())
        if (aliasNames.includes(queryClean)) {
            const song = songs.find(s => s.id === alias.song_id)
            if (song && !results.some(r => r.song.id === song.id)) {
                results.push({ song, matchedAliases: aliases.filter(a => a.song_id === song.id) })
            }
        }
    }
    if (results.length > 0) return { results, isIdMatch: false }

    // Fuzzy match in titles
    for (const song of songs) {
        if (song.title.toLowerCase().replace(/\s/g, '').includes(queryClean)) {
            if (!results.some(r => r.song.id === song.id)) {
                results.push({ song, matchedAliases: aliases.filter(a => a.song_id === song.id) })
            }
        }
    }

    // Fuzzy match in aliases
    for (const alias of aliases) {
        if (alias.aliases.some(a => a.replace(/\s/g, '').toLowerCase().includes(queryClean))) {
            const song = songs.find(s => s.id === alias.song_id)
            if (song && !results.some(r => r.song.id === song.id)) {
                results.push({ song, matchedAliases: aliases.filter(a => a.song_id === song.id) })
            }
        }
    }

    return { results, isIdMatch: false }
}

function formatSongDetail(song: Song): string {
    const diffs = song.difficulties || []
    const levels = diffs.map(d => d.level).join(' / ') || '无数据'
    const levelValues = diffs.map(d => String(d.level_value)).join(' / ') || '无数据'
    const charters = diffs.map(d => d.note_designer).join(' / ') || '无数据'

    return [
        '\n[ 中二节奏 ] 曲目详情',
        `\n曲名：${song.title}`,
        `\n曲目id：${song.id}`,
        `\n艺术家：${song.artist}`,
        `\n分类：${song.genre}`,
        `\nBPM：${song.bpm}`,
        `\n定数：${levels}`,
        `\n详细定数：${levelValues}`,
        `\n谱师：${charters}`
    ].join('')
}

export async function getChunithmSong(ctx: any) {
    const rawMsg = ctx.raw_message || ''
    if (!rawMsg.endsWith('是什么歌')) return

    const query = rawMsg.slice(0, -4).trim()
    if (!query) return

    const startTime = Date.now()

    try {
        const { songs, aliases } = await fetchChunithmData()
        const { results, isIdMatch } = searchChunithmSong(query, songs, aliases)
        const searchTime = ((Date.now() - startTime) / 1000).toFixed(2)

        if (results.length === 0) {
            await bot.api.send_group_msg({
                group_id: ctx.group_id,
                message: [
                    Structs.reply(ctx.message_id),
                    Structs.at(ctx.sender.user_id),
                    Structs.text(`\n未找到歌曲：${query}\nTips: 支持的查找方式有: 曲名、别名\n搜索耗时：${searchTime}秒\n\n如果有需要提交的别名，请到 https://maimai.lxns.net/alias/vote 提交`)
                ]
            })
            return
        }

        if (results.length === 1) {
            const song = results[0].song
            const detail = formatSongDetail(song)

            // Send text + image
            await bot.api.send_group_msg({
                group_id: ctx.group_id,
                message: [
                    Structs.reply(ctx.message_id),
                    Structs.at(ctx.sender.user_id),
                    Structs.text(`\n${detail}\n\n搜索耗时：${searchTime}秒`),
                    Structs.image(`https://assets2.lxns.net/chunithm/jacket/${song.id}.png`)
                ]
            })

            // Upload audio file
            try {
                await bot.api.upload_group_file({
                    group_id: ctx.group_id,
                    file: `https://assets2.lxns.net/chunithm/music/${song.id}.mp3`,
                    name: `${song.title}.mp3`
                })
            } catch (e) {
                console.error('[Chunithm] 上传音频文件失败:', e)
            }

            // Send voice message
            try {
                await bot.api.send_group_msg({
                    group_id: ctx.group_id,
                    message: [
                        Structs.record(`https://assets2.lxns.net/chunithm/music/${song.id}.mp3`)
                    ]
                })
            } catch (e) {
                console.error('[Chunithm] 发送语音消息失败:', e)
            }

            return
        }

        // Multiple results
        const totalCount = results.length
        const displayResults = results.slice(0, MAX_RESULTS_DISPLAY)
        const resultLines = displayResults.map((r, i) =>
            `${i + 1}. ${r.song.title} - ${r.song.artist} (ID: ${r.song.id})`
        )

        const message = [
            '[ 中二节奏 ] 搜索结果列表',
            ...resultLines,
            '',
            totalCount > MAX_RESULTS_DISPLAY
                ? `共找到 ${totalCount} 条匹配结果（仅展示前 ${MAX_RESULTS_DISPLAY} 条）`
                : `共找到 ${totalCount} 条匹配结果`,
            `搜索耗时：${searchTime}秒`,
            '',
            '💡 提示：使用 ID 搜索可直接获取详细信息（格式：id[歌曲ID]是什么歌）'
        ].join('\n')

        await bot.api.send_group_msg({
            group_id: ctx.group_id,
            message: [
                Structs.reply(ctx.message_id),
                Structs.at(ctx.sender.user_id),
                Structs.text(`\n${message}`)
            ]
        })

    } catch (e: any) {
        const searchTime = ((Date.now() - startTime) / 1000).toFixed(2)
        console.error('[Chunithm] 搜索失败:', e)
        await bot.api.send_group_msg({
            group_id: ctx.group_id,
            message: [
                Structs.reply(ctx.message_id),
                Structs.at(ctx.sender.user_id),
                Structs.text(`\n数据获取失败：${e.message || '未知错误'}\n搜索耗时：${searchTime}秒`)
            ]
        })
    }
}