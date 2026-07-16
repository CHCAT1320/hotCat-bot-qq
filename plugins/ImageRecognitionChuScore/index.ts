import { InferenceSession, Tensor } from 'onnxruntime-node';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { Structs } from 'node-napcat-ts'
import { bot } from '../../index.ts'
import axios from 'axios';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const MODEL_PATH = "plugins/ImageRecognitionChuScore/best.onnx";
const CLASS_NAMES = ["chuScore"];
const CONFIDENCE_THRESHOLD = 0.5;
const IOU_THRESHOLD = 0.5;
const DEBUG_DIR = "plugins/ImageRecognitionChuScore/out";
mkdirSync(DEBUG_DIR, { recursive: true });

let session: InferenceSession | null = null;
let inputName = "images";
let inputShape: [number, number] = [640, 640];

async function getSession(): Promise<InferenceSession> {
    if (!session) {
        const buf = readFileSync(MODEL_PATH);
        session = await InferenceSession.create(buf);
        inputName = session.inputNames[0];
        const shape = session.inputMetadata[0].shape;
        if (shape && shape.length === 4) {
            inputShape = [Number(shape[2]), Number(shape[3])];
        }
        console.log(`[yolo] model loaded, input ${JSON.stringify(shape)}, output ${JSON.stringify(session.outputMetadata[0].shape)}`);
    }
    return session;
}

async function downloadImage(url: string): Promise<ArrayBuffer> {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const buf = response.data as ArrayBuffer | Buffer;
    if (buf instanceof ArrayBuffer) return buf;
    const ab = new ArrayBuffer(buf.byteLength);
    new Uint8Array(ab).set(buf);
    return ab;
}

async function isChuScoreImage(imageBuffer: ArrayBuffer): Promise<boolean> {
    const detections = await detect(imageBuffer);
    console.log(detections);
    return detections.length > 0 && detections[0].className === "chuScore" && detections[0].confidence > CONFIDENCE_THRESHOLD && detections[0].confidence <= 1.0;
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

interface Detection {
    box: { x: number; y: number; width: number; height: number };
    className: string;
    classId: number;
    confidence: number;
}

async function detect(imageBuffer: ArrayBuffer): Promise<Detection[]> {
    const sess = await getSession();
    const [modelW, modelH] = inputShape;

    const img = await loadImage(Buffer.from(imageBuffer));
    const origW = img.width;
    const origH = img.height;

    const scale = Math.min(modelW / origW, modelH / origH);
    const scaledW = Math.round(origW * scale);
    const scaledH = Math.round(origH * scale);
    const padX = (modelW - scaledW) / 2;
    const padY = (modelH - scaledH) / 2;

    const canvas = createCanvas(modelW, modelH);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgb(114, 114, 114)';
    ctx.fillRect(0, 0, modelW, modelH);
    ctx.drawImage(img as unknown as CanvasImageSource, padX, padY, scaledW, scaledH);

    const imageData = ctx.getImageData(0, 0, modelW, modelH).data;
    const float32Data = new Float32Array(3 * modelH * modelW);
    const channelSize = modelH * modelW;
    for (let i = 0; i < channelSize; i++) {
        float32Data[i] = imageData[i * 4] / 255;
        float32Data[channelSize + i] = imageData[i * 4 + 1] / 255;
        float32Data[2 * channelSize + i] = imageData[i * 4 + 2] / 255;
    }
    const inputTensor = new Tensor('float32', float32Data, [1, 3, modelH, modelW]);

    const outputs = await sess.run({ [inputName]: inputTensor });
    const output = outputs[session!.outputNames[0]];
    const shape = output.dims;

    let detections: Detection[] = [];
    if (shape.length === 3 && shape[shape.length - 1] >= 6) {
        const numDetections = shape[1];
        const stride = shape[2];
        for (let i = 0; i < numDetections; i++) {
            const confidence = Number(output.data[i * stride + 4]);
            if (confidence < CONFIDENCE_THRESHOLD) continue;
            const classId = Math.round(Number(output.data[i * stride + 5]));
            const x1 = Number(output.data[i * stride + 0]);
            const y1 = Number(output.data[i * stride + 1]);
            const x2 = Number(output.data[i * stride + 2]);
            const y2 = Number(output.data[i * stride + 3]);
            const ox = Math.max(0, (x1 - padX) / scale);
            const oy = Math.max(0, (y1 - padY) / scale);
            const ox2 = Math.min(origW, (x2 - padX) / scale);
            const oy2 = Math.min(origH, (y2 - padY) / scale);
            detections.push({
                box: { x: Math.round(ox), y: Math.round(oy), width: Math.round(ox2 - ox), height: Math.round(oy2 - oy) },
                className: CLASS_NAMES[classId] || `class_${classId}`,
                classId,
                confidence,
            });
        }
    } else if (shape.length === 3) {
        const numParams = shape[1];
        const numPreds = shape[2];
        for (let i = 0; i < numPreds; i++) {
            const cx = Number(output.data[i]);
            const cy = Number(output.data[numPreds + i]);
            const w = Number(output.data[2 * numPreds + i]);
            const h = Number(output.data[3 * numPreds + i]);
            const numClasses = numParams - 4;
            let bestClass = 0;
            let bestScore = numClasses === 1
                ? Number(output.data[4 * numPreds + i])
                : Math.max(...Array.from({ length: numClasses }, (_, c) => Number(output.data[(4 + c) * numPreds + i])));
            for (let c = 0; c < numClasses; c++) {
                const s = Number(output.data[(4 + c) * numPreds + i]);
                if (s > bestScore) { bestScore = s; bestClass = c; }
            }
            const confidence = 1 / (1 + Math.exp(-bestScore));
            if (confidence < CONFIDENCE_THRESHOLD) continue;
            const x1 = cx - w / 2, y1 = cy - h / 2;
            const ox = Math.max(0, (x1 - padX) / scale);
            const oy = Math.max(0, (y1 - padY) / scale);
            const ox2 = Math.min(origW, (x1 + w - padX) / scale);
            const oy2 = Math.min(origH, (y1 + h - padY) / scale);
            detections.push({
                box: { x: Math.round(ox), y: Math.round(oy), width: Math.round(ox2 - ox), height: Math.round(oy2 - oy) },
                className: CLASS_NAMES[bestClass] || `class_${bestClass}`,
                classId: bestClass,
                confidence,
            });
        }
    }
    return detections;
}

async function drawBoxesOnOriginal(
    ab: ArrayBuffer,
    detections: Detection[],
    filename: string,
) {
    const img = await loadImage(Buffer.from(ab));
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img as unknown as CanvasImageSource, 0, 0);
    ctx.lineWidth = Math.max(2, Math.round(Math.min(img.width, img.height) / 400));
    ctx.font = `${Math.max(14, Math.round(Math.min(img.width, img.height) / 30))}px sans-serif`;
    for (const d of detections) {
        ctx.strokeStyle = '#00ff00';
        ctx.strokeRect(d.box.x, d.box.y, d.box.width, d.box.height);
        const label = `${d.className} ${(d.confidence * 100).toFixed(1)}%`;
        const tw = ctx.measureText(label).width;
        const th = Math.max(14, Math.round(Math.min(img.width, img.height) / 30));
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(d.box.x, Math.max(0, d.box.y - th), tw + 8, th);
        ctx.fillStyle = '#000';
        ctx.fillText(label, d.box.x + 4, Math.max(th - 2, d.box.y - 2));
    }
    writeFileSync(`${DEBUG_DIR}/${filename}`, canvas.toBuffer('image/png'));
    console.log(`[debug] annotated image saved: ${DEBUG_DIR}/${filename}`);
}

export async function _debugTestLocal() {
    const path = "plugins/ImageRecognitionChuScore/test.jpg";
    const ab = readFileSync(path).buffer;
    const stamp = Date.now();
    writeFileSync(`${DEBUG_DIR}/${stamp}_input.png`, Buffer.from(ab));
    const detections = await detect(ab);
    console.log(`[local test] ${path} -> ${detections.length} detections`);
    console.log(detections);
    await drawBoxesOnOriginal(ab, detections, `${stamp}_annotated.png`);
    return detections;
}
// _debugTestLocal();
