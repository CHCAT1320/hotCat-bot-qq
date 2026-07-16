import { YoloDetectionInference } from "ppu-yolo-onnx-inference";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { Structs } from 'node-napcat-ts'
// import { bot } from '../../index.ts'
import axios from 'axios';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const DEBUG_DIR = "plugins/ImageRecognitionChuScore/out";
mkdirSync(DEBUG_DIR, { recursive: true });

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
            debug: { debug: true, debugFolder: DEBUG_DIR },
        });
        await detector.init();
    }
    return detector;
}

async function downloadImage(url: string): Promise<ArrayBuffer> {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const buf = response.data as ArrayBuffer | Buffer;
    if (buf instanceof ArrayBuffer) return buf;
    const ab = new ArrayBuffer(buf.byteLength);
    new Uint8Array(ab).set(buf);
    return ab;
}

function readExifOrientation(bytes: Uint8Array): number {
    if (bytes[0] !== 0xFF || bytes[1] !== 0xD8) return 1;
    let offset = 2;
    while (offset < bytes.length - 1) {
        if (bytes[offset] !== 0xFF) break;
        const marker = bytes[offset + 1];
        const size = (bytes[offset + 2] << 8) | bytes[offset + 3];
        if (marker === 0xE1) {
            const start = offset + 4;
            if (start + 6 < bytes.length &&
                bytes[start] === 0x45 && bytes[start + 1] === 0x78 &&
                bytes[start + 2] === 0x69 && bytes[start + 3] === 0x66 &&
                bytes[start + 4] === 0x00 && bytes[start + 5] === 0x00) {
                const tiffStart = start + 6;
                const little = bytes[tiffStart] === 0x49;
                const get16 = (o: number) => little ? bytes[o] | (bytes[o + 1] << 8) : (bytes[o] << 8) | bytes[o + 1];
                const get32 = (o: number) => little ? (bytes[o] | (bytes[o + 1] << 8) | (bytes[o + 2] << 16) | (bytes[o + 3] << 24)) >>> 0
                                                    : ((bytes[o] << 24) | (bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3]) >>> 0;
                const ifd0 = tiffStart + get32(tiffStart + 4);
                const numEntries = get16(ifd0);
                for (let i = 0; i < numEntries; i++) {
                    const entry = ifd0 + 2 + i * 12;
                    if (get16(entry) === 0x0112) {
                        return get16(entry + 8);
                    }
                }
            }
            return 1;
        }
        offset += 2 + size;
    }
    return 1;
}

async function applyExifRotation(ab: ArrayBuffer): Promise<ArrayBuffer> {
    const bytes = new Uint8Array(ab);
    const orientation = readExifOrientation(bytes);
    if (orientation === 1) return ab;
    const { createCanvas, loadImage } = await import('@napi-rs/canvas');
    const img = await loadImage(Buffer.from(ab));
    const swap = orientation >= 5 && orientation <= 8;
    const canvas = createCanvas(swap ? img.height : img.width, swap ? img.width : img.height);
    const ctx = canvas.getContext('2d');
    const setTransform = (w: number, h: number) => {
        switch (orientation) {
            case 2: ctx.translate(w, 0); ctx.scale(-1, 1); break;
            case 3: ctx.translate(w, h); ctx.rotate(Math.PI); break;
            case 4: ctx.translate(0, h); ctx.scale(1, -1); break;
            case 5: ctx.rotate(0.5 * Math.PI); ctx.scale(1, -1); break;
            case 6: ctx.rotate(0.5 * Math.PI); ctx.translate(0, -h); break;
            case 7: ctx.rotate(0.5 * Math.PI); ctx.translate(w, -h); ctx.scale(-1, 1); break;
            case 8: ctx.rotate(-0.5 * Math.PI); ctx.translate(-w, 0); break;
        }
    };
    setTransform(canvas.width, canvas.height);
    ctx.drawImage(img as unknown as CanvasImageSource, 0, 0);
    return canvas.toBuffer('image/png').buffer.slice(0);
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

export async function _debugTestLocal() {
    const path = "plugins/ImageRecognitionChuScore/test3.jpg";
    const raw = readFileSync(path).buffer;
    const ab = await safeApplyExifRotation(raw);
    const stamp = Date.now();
    writeFileSync(`${DEBUG_DIR}/${stamp}_input.png`, Buffer.from(ab));
    const detector = await getDetector();
    const detections = await detector.detect(ab);
    console.log(`[local test] ${path} -> ${detections.length} detections`);
    console.log(detections);
    await drawBoxesOnOriginal(ab, detections, `${stamp}_annotated.png`);
    return detections;
}

async function drawBoxesOnOriginal(
    ab: ArrayBuffer,
    detections: { box: { x: number; y: number; width: number; height: number }; className: string; confidence: number }[],
    filename: string,
) {
    const img = await loadImage(Buffer.from(ab));
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img as unknown as CanvasImageSource, 0, 0);
    ctx.lineWidth = Math.max(2, Math.round(Math.min(img.width, img.height) / 400));
    ctx.font = `${Math.max(14, Math.round(Math.min(img.width, img.height) / 30))}px sans-serif`;
    for (const d of detections) {
        const w = img.width / 640;
        const h = img.height / 640;
        const x = d.box.x * w;
        const y = d.box.y * h;
        const bw = d.box.width * w;
        const bh = d.box.height * h;
        ctx.strokeStyle = '#00ff00';
        ctx.strokeRect(x, y, bw, bh);
        const label = `${d.className} ${(d.confidence * 100).toFixed(1)}%`;
        const tw = ctx.measureText(label).width;
        const th = Math.max(14, Math.round(Math.min(img.width, img.height) / 30));
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(x, Math.max(0, y - th), tw + 8, th);
        ctx.fillStyle = '#000';
        ctx.fillText(label, x + 4, Math.max(th - 2, y - 2));
    }
    writeFileSync(`${DEBUG_DIR}/${filename}`, canvas.toBuffer('image/png'));
    console.log(`[debug] annotated image saved: ${DEBUG_DIR}/${filename}`);
}

async function safeApplyExifRotation(ab: ArrayBuffer): Promise<ArrayBuffer> {
    try {
        return await applyExifRotation(ab);
    } catch (e) {
        console.warn('[exif] rotation failed, using original:', (e as Error).message);
        return ab;
    }
}
_debugTestLocal();