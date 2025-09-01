// src/app/page.tsx
"use client";
import useWasm from "@/hooks/useWasm";
import { useState } from "react";
export default function Home() {
// Preprocess image for ONNX model compatibility
async function preprocessImage(file: File, targetWidth = 224, targetHeight = 224): Promise<Float32Array> {
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
      resolve(floatArray);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
  const wasm = useWasm();
  const [input, setInput] = useState(10);
  const [result, setResult] = useState<number | null>(null);
  const computeFactorial = () => {
    if (!wasm) return;
    setResult(wasm.factorial(input));
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
        onClick={async (e) => {
          if (!wasm) return;
          const root = (e.currentTarget.parentElement?.parentElement as HTMLElement | null);
          const input = root?.querySelector('input[type="file"]') as HTMLInputElement | null;
          const file = input?.files?.[0];
          if (!file) return;
          // Preprocess image before passing to WASM/ONNX
          const preprocessed = await preprocessImage(file, 224, 224);
          // If your WASM exposes an image-processing entry point, call it here.
          const fn = (wasm as any).process_image || (wasm as any).apply_style;
          if (typeof fn === "function") {
            try {
              // Pass Float32Array to WASM/ONNX
              fn(preprocessed);
            } catch (err) {
              // swallow — adapt error handling as desired
            }
          }
        }}
        >
        Run WASM on image
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
          defaultValue="Picacco"
          aria-label="Choose art style"
        >
          <option value="Picacco">Picacco</option>
          <option value="Van Gogh">Van Gogh</option>
          <option value="Cyberpunk">Cyberpunk</option>
        </select>
      </label>
    </main>
  );
}