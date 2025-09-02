// src/app/page.tsx
"use client";
import useWasm from "@/hooks/useWasm";
import { useState } from "react";
import * as ort from "onnxruntime-web";
export default function Home() {
// Preprocess image for ONNX model compatibility
async function preprocessImage(file: File, targetWidth: number, targetHeight: number): Promise<{data: Float32Array, width: number, height: number}> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('Canvas context not available');
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight).data;
      // Convert RGBA to normalized RGB
      const floatArray = new Float32Array(targetWidth * targetHeight * 3);
      for (let i = 0, j = 0; i < imageData.length; i += 4, j += 3) {
        floatArray[j] = imageData[i] / 255;     // R
        floatArray[j + 1] = imageData[i + 1] / 255; // G
        floatArray[j + 2] = imageData[i + 2] / 255; // B
      }
      resolve({data: floatArray, width: targetWidth, height: targetHeight});
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
  const wasm = useWasm();
  const [input, setInput] = useState(10);
  const [result, setResult] = useState<number | null>(null);
  const [stylizedImg, setStylizedImg] = useState<string | null>(null);
  const [inputDims, setInputDims] = useState<{width: number, height: number} | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string>("Picacco");
  const [isProcessing, setIsProcessing] = useState(false);
  const styleModelMap: Record<string, string> = {
    "Picacco": "/models/picasso.onnx",
    "Van Gogh": "/models/vangogh.onnx",
    "Cyberpunk": "/models/cyberpunk.onnx"
  };
  return (
    <main className="min-h-screen p-24">
      <h1 className="text-4xl font-bold mb-8">Next.js + WASM = 🔥</h1>

      <div className="flex flex-col gap-4">
      <label className="flex flex-col items-start gap-2">
        <span className="font-medium">Upload an image</span>
        <input
        type="file"
        accept="image/*"
        className="p-2 border rounded"
        onChange={(e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) return;
          const img = (e.currentTarget.nextElementSibling as HTMLImageElement | null);
          if (img) img.src = URL.createObjectURL(file);
          // Get image dimensions
          const tempImg = new window.Image();
          tempImg.onload = () => {
            setInputDims({width: tempImg.width, height: tempImg.height});
          };
          tempImg.src = URL.createObjectURL(file);
        }}
        />
      </label>

      {typeof window !== "undefined" &&
        (() => {
          const fi = document.querySelector<HTMLInputElement>('input[type="file"]');
          const file = fi?.files?.[0];
          if (!file) return null;
          return (
            <img
              src={URL.createObjectURL(file)}
              alt="preview"
              className="max-w-xs max-h-64 object-contain border rounded"
            />
          );
        })()}

      <div className="flex gap-2">
        <button
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        disabled={isProcessing}
        onClick={async (e) => {
          setIsProcessing(true);
          setStylizedImg(null);
          const root = (e.currentTarget.parentElement?.parentElement as HTMLElement | null);
          const input = root?.querySelector('input[type="file"]') as HTMLInputElement | null;
          const file = input?.files?.[0];
          if (!file) { setIsProcessing(false); return; }
          // Always preprocess to 224x224 for ONNX model compatibility
          const {data: preprocessed} = await preprocessImage(file, 224, 224);
          // Prepare ONNX input tensor with fixed shape
          const tensor = new ort.Tensor("float32", preprocessed, [1, 3, 224, 224]);
          try {
            const session = await ort.InferenceSession.create(styleModelMap[selectedStyle]);
            const feeds: Record<string, ort.Tensor> = {};
            feeds[session.inputNames[0]] = tensor;
            const results = await session.run(feeds);
            if (!results || !session.outputNames[0] || !results[session.outputNames[0]]) {
              console.error('ONNX inference did not return a valid output tensor.', {results, outputName: session.outputNames[0]});
              setStylizedImg(null);
              setIsProcessing(false);
              return;
            }
            const outputTensor = results[session.outputNames[0]];
            if (!outputTensor || !outputTensor.data) {
              console.error('ONNX output tensor is missing or invalid.', outputTensor);
              setStylizedImg(null);
              setIsProcessing(false);
              return;
            }
            const output = outputTensor.data as Float32Array;
            const dims = outputTensor.dims;
            // Log output shape and sample values for debugging
            console.log('ONNX output shape:', dims);
            console.log('ONNX output sample:', output.slice(0, 10));
            // Try to handle common output shapes
            let outW = 224, outH = 224;
            let rIdx = 0, gIdx = 0, bIdx = 0;
            if (dims.length === 4 && dims[0] === 1 && dims[1] === 3) {
              // [1, 3, H, W]
              outH = dims[2];
              outW = dims[3];
              rIdx = 0;
              gIdx = outH * outW;
              bIdx = 2 * outH * outW;
            } else if (dims.length === 3 && dims[0] === 3) {
              // [3, H, W]
              outH = dims[1];
              outW = dims[2];
              rIdx = 0;
              gIdx = outH * outW;
              bIdx = 2 * outH * outW;
            } else if (dims.length === 4 && dims[0] === 1 && dims[3] === 3) {
              // [1, H, W, 3]
              outH = dims[1];
              outW = dims[2];
            }
            const canvas = document.createElement('canvas');
            canvas.width = outW;
            canvas.height = outH;
            const ctx = canvas.getContext('2d');
            const imgData = ctx!.createImageData(outW, outH);
            if (dims.length === 4 && dims[0] === 1 && dims[1] === 3) {
              // [1, 3, H, W]
              for (let i = 0; i < outH * outW; i++) {
                imgData.data[i * 4] = Math.min(255, Math.max(0, output[rIdx + i] * 255)); // R
                imgData.data[i * 4 + 1] = Math.min(255, Math.max(0, output[gIdx + i] * 255)); // G
                imgData.data[i * 4 + 2] = Math.min(255, Math.max(0, output[bIdx + i] * 255)); // B
                imgData.data[i * 4 + 3] = 255; // A
              }
            } else if (dims.length === 3 && dims[0] === 3) {
              // [3, H, W]
              for (let i = 0; i < outH * outW; i++) {
                imgData.data[i * 4] = Math.min(255, Math.max(0, output[rIdx + i] * 255)); // R
                imgData.data[i * 4 + 1] = Math.min(255, Math.max(0, output[gIdx + i] * 255)); // G
                imgData.data[i * 4 + 2] = Math.min(255, Math.max(0, output[bIdx + i] * 255)); // B
                imgData.data[i * 4 + 3] = 255; // A
              }
            } else if (dims.length === 4 && dims[0] === 1 && dims[3] === 3) {
              // [1, H, W, 3]
              for (let i = 0; i < outH * outW; i++) {
                imgData.data[i * 4] = Math.min(255, Math.max(0, output[i * 3] * 255)); // R
                imgData.data[i * 4 + 1] = Math.min(255, Math.max(0, output[i * 3 + 1] * 255)); // G
                imgData.data[i * 4 + 2] = Math.min(255, Math.max(0, output[i * 3 + 2] * 255)); // B
                imgData.data[i * 4 + 3] = 255; // A
              }
            } else {
              // Unknown output shape
              console.error('Unknown ONNX output shape:', dims);
              setStylizedImg(null);
              setIsProcessing(false);
              return;
            }
            ctx!.putImageData(imgData, 0, 0);
            setStylizedImg(canvas.toDataURL());
          } catch (err) {
            // Handle error (model not found, inference error, etc.)
            console.error('ONNX inference error:', err);
            setStylizedImg(null);
          }
          setIsProcessing(false);
        }}
        >
        {isProcessing ? "Processing..." : "Run Style Transfer"}
        </button>

        <button
        className="px-4 py-2 bg-gray-200 rounded"
        onClick={() => {
          // clear preview and file input
          const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
          if (fileInput) fileInput.value = "";
          const img = document.querySelector<HTMLImageElement>('img[alt="preview"]');
          if (img) img.src = "";
        }}
        >
        Clear
        </button>
      </div>
      </div>
      <label className="flex flex-col items-start gap-2 mt-4">
        <span className="font-medium">Choose a style</span>
        <select
          className="p-2 border rounded"
          value={selectedStyle}
          onChange={e => setSelectedStyle(e.target.value)}
          aria-label="Choose art style"
        >
          <option value="Picacco">Picacco</option>
          <option value="Van Gogh">Van Gogh</option>
          <option value="Cyberpunk">Cyberpunk</option>
        </select>
      </label>
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Stylized Image</h2>
        {stylizedImg ? (
          <img src={stylizedImg} alt="stylized" className="max-w-xs max-h-64 border rounded" />
        ) : (
          <div className="text-red-600">Stylized image could not be generated. Please check your model output and try again.</div>
        )}
      </div>
    </main>
  );
}