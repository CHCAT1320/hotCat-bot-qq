import { YoloDetectionInference } from "ppu-yolo-onnx-inference";
import { readFileSync } from "fs";
import { Structs } from 'node-napcat-ts'
import { bot } from '../../index.ts'
import axios from 'axios';

let detector: YoloDetectionInference | null = null;

async function getDetector(): Promise<YoloDetectionInference> {
    if (!detector) {
        const modelBuffer = readFileSync("plugins/ImageRecognitionChuScore/best.onnx").buffer;
        const classNames = ["chuScore"];
        detector = new YoloDetectionInference({
            model: {
                onnx: modelBuffer,
                classNames: classNames,
            },
            thresholds: { confidence: 0.5 },
        });
        await detector.init();
    }
    return detector;
}

async function downloadImage(url: string): Promise<ArrayBuffer> {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return response.data;
}

async function isChuScoreImage(imageBuffer: ArrayBuffer): Promise<boolean> {
    const detector = await getDetector();
    const detections = await detector.detect(imageBuffer);
    console.log(detections);
    return detections.length > 0 && detections[0].className === "chuScore";
}

export async function imageRecognitionChuScore(ctx: any) {
    for (const msg of ctx.message) {
        if (msg.type === 'image') {
            const imageUrl = msg.data.url;
            try {
                const imgBuffer = await downloadImage(imageUrl);
                const result = await isChuScoreImage(imgBuffer);
                if (result) {
                    bot.api.send_group_msg({
                        group_id: ctx.group_id,
                        message: [
                            Structs.at(ctx.sender.user_id),
                            Structs.text(" 大神啊！"),
                        ]
                    });
                }
            } catch (error) {
                console.error('图片处理出错:', error);
            }
        }
    }
}
