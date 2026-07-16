import { readFileSync, writeFileSync } from "fs";

const file = "node_modules/ppu-yolo-onnx-inference/core/base-yolo-inference.js";
const old1 = "if(x<0||y<0||x+w>this.modelMetadata.inputShape[0]||y+h>this.modelMetadata.inputShape[1]){continue}";
const new1 = "if(x<-2||y<-2||x+w>this.modelMetadata.inputShape[0]+2||y+h>this.modelMetadata.inputShape[1]+2){continue}";
const old2 = "if(x>=0&&y>=0&&x+w<=this.modelMetadata.inputShape[0]&&y+h<=this.modelMetadata.inputShape[1]){";
const new2 = "if(x>=-2&&y>=-2&&x+w<=this.modelMetadata.inputShape[0]+2&&y+h<=this.modelMetadata.inputShape[1]+2){";

let s = readFileSync(file, "utf8");
let changed = false;
if (s.includes(old1) && !s.includes(new1)) { s = s.replace(old1, new1); changed = true; }
if (s.includes(old2) && !s.includes(new2)) { s = s.replace(old2, new2); changed = true; }
if (changed) {
    writeFileSync(file, s);
    console.log("[postinstall] patched ppu-yolo-onnx-inference boundary check");
} else {
    console.log("[postinstall] ppu-yolo-onnx-inference already patched or upstream fixed");
}
