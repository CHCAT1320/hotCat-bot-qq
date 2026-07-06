import { Structs } from 'node-napcat-ts'
import { bot } from '../../index.ts'

// 配置常量
const CONFIG = {
    API_URL: 'https://pighub.top/api/images?sort=1',
    BASE_URL: 'https://pighub.top',
    TIMEOUT: 10000, // 10秒超时
    RETRY_COUNT: 2, // 失败重试次数
    RETRY_DELAY: 1000, // 重试间隔(ms)
}

// 浏览器请求头，模拟真实浏览器
const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': 'https://pighub.top/',
    'Origin': 'https://pighub.top',
    'Connection': 'keep-alive',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
}

/**
 * 带超时的 fetch 封装
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = CONFIG.TIMEOUT): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        })
        clearTimeout(timeoutId)
        return response
    } catch (error) {
        clearTimeout(timeoutId)
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`请求超时 (${timeout}ms)`)
        }
        throw error
    }
}

/**
 * 带重试机制的请求
 */
async function fetchWithRetry(url: string, options: RequestInit = {}, retries = CONFIG.RETRY_COUNT): Promise<Response> {
    let lastError: Error | null = null
    
    for (let i = 0; i <= retries; i++) {
        try {
            const response = await fetchWithTimeout(url, options)
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }
            return response
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error))
            console.warn(`[随机猪猪] 第 ${i + 1} 次请求失败: ${lastError.message}`)
            
            if (i < retries) {
                console.log(`[随机猪猪] ${CONFIG.RETRY_DELAY}ms 后重试...`)
                await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY))
            }
        }
    }
    
    throw lastError || new Error('请求失败，已用尽所有重试次数')
}

async function randomPig() {
    
    try {
        const res = await fetchWithRetry(CONFIG.API_URL, {
            method: 'GET',
            headers: BROWSER_HEADERS,
        })
        
        const data = await res.json()
        const randomRes = data.data[Math.floor(Math.random() * data.data.length)]
        console.log(randomRes)
        return randomRes
    } catch (error) {
        console.error('[随机猪猪] 获取失败:', error instanceof Error ? error.message : error)
        throw error
    }
}
// console.log('[随机猪猪] 开始获取随机猪猪图片...')
// randomPig().then(res => {
//     console.log(res)
// }).catch(err => {
//     console.error('测试调用失败:', err)
// })

export async function getPigHubImg(ctx: any) {
    if (!ctx.raw_message.startsWith('随机猪猪')) return
    
    try {
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
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '未知错误'
        console.error('[随机猪猪] 发送失败:', errorMsg)
        await bot.api.send_group_msg({
            group_id: ctx.group_id,
            message: [
                Structs.at(ctx.sender.user_id),
                Structs.text(`\n❌ 获取猪猪图片失败\n原因：${errorMsg}\n请稍后再试~`)
            ]
        })
    }
}