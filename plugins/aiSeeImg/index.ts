import { Structs } from 'node-napcat-ts'
import { bot } from '../../index.ts'

// 配置：API 请求超时时间（毫秒）
const API_TIMEOUT_MS = 120000; // 120秒，可根据需要调整

export async function aiSeeImg(url: string, isComment: boolean = false) {
  let ask = "请用恶毒、犀利的语言评价一下这个图片，请不要用任何Markdoen语法，也不要分段，可以使用emoji，emoji密度均匀。"
  if (isComment) ask = "请用犀利的语言评价(夸赞)一下这个图片，请不要用任何Markdoen语法，也不要分段，可以使用emoji，emoji密度均匀。"
  const startTime = Date.now(); // 记录开始时间
  const API_KEY = "sk-odtijjzbqluwrwafjuperexeaaqkijxchvozigvahdjqgmkg";

  try {
    // 使用 AbortController 实现超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    const res = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "Qwen/Qwen3-VL-32B-Instruct",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: ask},
              { type: "image_url", image_url: { url: url } }
            ]
          }
        ]
      }),
      signal: controller.signal // 绑定取消信号
    });

    clearTimeout(timeoutId); // 请求完成，清除超时定时器
    const data = await res.json();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2); // 计算耗时（秒）

    if (data.choices && data.choices[0]?.message?.content) {
      const answer = data.choices[0].message.content;
      console.log(`[AI评图成功] 耗时: ${duration}s`);
      return { success: true, answer, duration };
    } else {
      throw new Error("API 返回格式异常" + JSON.stringify(data));
    }

  } catch (error: any) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // 判断是否为超时错误
    if (error.name === 'AbortError') {
      console.error(`[AI评图超时] 超过 ${API_TIMEOUT_MS/1000} 秒未响应`);
      return { 
        success: false, 
        answer: `图片评价超时了喵！AI 思考了超过 ${API_TIMEOUT_MS/1000} 秒还没想明白，请稍后再试~`, 
        duration,
        isTimeout: true 
      };
    }

    console.error(`[AI评图错误] 耗时: ${duration}s, 错误:`, error);
    return { 
      success: false, 
      answer: `出错了，愤怒喵！\n错误信息: ${error.message || '未知错误'}`, 
      duration,
      isTimeout: false 
    };
  }
}

export async function getAiSeeImg(ctx: any) {
  if (!ctx.raw_message.startsWith('评图') && !ctx.raw_message.endsWith('评图')) return;
  let isComment = false;
  if (ctx.raw_message.includes('正常')) isComment = true
  
  const processStartTime = Date.now(); // 记录整体流程开始时间

  for (const msg of ctx.message) {
    if (msg.type === 'reply') {
      console.log(msg.data);
      const msgid = msg.data.id;

      try {
        const msgInfo = await bot.api.get_group_msg_history({
          'group_id': ctx.group_id,
          'count': 10,
        //   'message_seq': msgid
        });

        for (const msg of msgInfo.messages) {
          for (const seg of msg.message) {
            if (seg.type === 'image' && Number(msgid) === msg.message_id) {
              console.log(seg);
              const imageUrl = seg.data.url;

              // 发送等待提示
              await bot.api.send_group_msg({
                'group_id': ctx.group_id,
                'message': [
                  Structs.text(`正在评价图片，请稍等...（超时限制: ${API_TIMEOUT_MS/1000}s）`),
                ]
              });

              // 调用 AI 评价
              const result = await aiSeeImg(imageUrl, isComment);
              const totalDuration = ((Date.now() - processStartTime) / 1000).toFixed(2);

              // 构建回复内容，包含耗时信息
              let replyMessage = result.answer;
              if (result.success) {
                replyMessage += `\n\n⏱️ AI处理: ${result.duration}s | 总耗时: ${totalDuration}s`;
              } else {
                replyMessage += `\n\n⏱️ 已耗时: ${totalDuration}s`;
              }

              await bot.api.send_group_msg({
                'group_id': ctx.group_id,
                'message': [
                  Structs.reply(ctx.message_id),
                  Structs.at(ctx.sender.user_id),
                  Structs.text("\n" + replyMessage),
                ]
              });
              return;
            }
          }
        }
        
        // 遍历完消息但没找到图片
        await bot.api.send_group_msg({
          'group_id': ctx.group_id,
          'message': [
            Structs.reply(ctx.message_id),
            Structs.at(ctx.sender.user_id),
            Structs.text('回复的消息里好像没有图片喵！'),
          ]
        });
        
      } catch (error: any) {
        const totalDuration = ((Date.now() - processStartTime) / 1000).toFixed(2);
        console.error('[获取历史消息失败]', error);
        
        await bot.api.send_group_msg({
          'group_id': ctx.group_id,
          'message': [
            Structs.reply(ctx.message_id),
            Structs.at(ctx.sender.user_id),
            Structs.text(`获取图片信息失败了喵！耗时: ${totalDuration}s\n错误: ${error.message || '未知错误'}`),
          ]
        });
      }
    }
  }
}