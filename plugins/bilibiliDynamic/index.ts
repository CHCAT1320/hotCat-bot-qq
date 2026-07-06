import { Structs } from 'node-napcat-ts'
import { getNewDynamics } from 'bilibili-dynamic-get'
import { bot } from '../../index.ts'

const UPS = [404145357, 1148546890, 401742377, 564698247, 414149787, 1644970825, 481648327, 1311127373, 406599529, 1259975175]
const MAX_RETRIES = 15

export async function scheduleSendDynamic() {
    console.log('开始获取动态')
    
    const groupList = await bot.api.get_group_list()
    
    for (const up of UPS) {
        let dataUrl
        let retryCount = 0
        let hasNew = false
        
        while (retryCount <= MAX_RETRIES) {
            try {
                dataUrl = await getNewDynamics(up)
            } catch (err) {
                let error = err as Error
                console.error(`获取 UP ${up} 动态异常:`, error.message)
                dataUrl = 1
            }
            
            if (dataUrl === null) {
                console.log(`UP ${up} 没有新动态`)
                break
            }
            
            if (dataUrl !== 1) {
                hasNew = true
                break
            }
            
            retryCount++
            if (retryCount <= MAX_RETRIES) {
                console.log(`UP ${up} 获取动态错误，第 ${retryCount}/${MAX_RETRIES} 次重试...`)
                await new Promise(resolve => setTimeout(resolve, 10000))
            }
        }
        
        if (!hasNew) continue
        
        for (const group of groupList) {
            try {
                await bot.api.send_group_msg({
                    group_id: group.group_id,
                    message: [
                        Structs.text(`UP主 ${up} 发布了新的动态！`),
                        Structs.image(dataUrl)
                    ]
                })
                console.log(`UP ${up} 动态已发送到群 ${group.group_id}`)
            } catch (err) {
                let error = err as Error
                console.error(`向群 ${group.group_id} 发送消息失败:`, error.message)
            }
        }
    }
    
    console.log("获取结束")
}