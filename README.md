# Image style transfer with WebAssembly  

A Rust and WebAssembly image style transfer web application that runs entirely in the browser

## ✨ Features

- A Rust/WebAssembly inference pipeline that loads compact ONNX style-transfer models in the browser and runs them on WebGPU
- A web app where users can upload an image, pick from multiple styles, and preview results side-by-side (original vs. stylized)

## 🛠️ Tech Stack

- React  
- Next.js  
- Rust  
- RMachine learning
- LLM

## 🔐 Environment Variables

Create a `.env` file in the `wasm-nextjs` directory with the following values:

```env
OPENAI_API_KEY=your_openai_api_key_here
```
## 📦 Installation

Follow these steps to install and run the project locally:

1. Clone the repository:
   
```
git clone https://github.com/noor188/Image-Style-Transfer-with-WebAssembly.git
cd Image-Style-Transfer-with-WebAssembly
```

2. Install dependencies:
```
npm install
# or
yarn install
```

3. Add environment variables:

Create a .env file in the root directory and copy the environment variable keys from above.

4. Run the development server:

```
npm run dev
# or
yarn dev
# or
pnpm dev
```

5. Visit your app:

Open your browser and go to http://localhost:3000

## Demo
<a href="https://youtu.be/hT_c5IZgp1s"> Youtube Video</a>

## 🧠 Future Improvements
- Add a "Style Strength" control that blends original and stylized outputs; include "Download PNG" and "Reset" actions
- Provide a small model registry (3–5 styles) with metadata (name, size, expected input/output tensor names, recommended resolution) and lazy-load per selection
- Ensure offline support by caching WebAssembly, JS, and model files (Service Worker), your app should work without internet after first load
- Bonus: Add a webcam mode for live stylization at real-time or near real-time FPS


