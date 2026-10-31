NOTICELENS - QUICK START

1) Install Node.js 20.19+ (or Node 22.12+).
2) Create server/.env from server/.env.example.
3) Add your Google AI Studio API key as GEMINI_API_KEY in server/.env.

From the project root, run:
  npm install
  npm run dev

Open http://localhost:5173

Click “Try sample notice” and then “Analyse notice”. The included DTU scholarship sample is fictional and clearly marked as a demo.

The Gemini API key stays on the Express server. Do not put it in frontend code or a VITE_ variable.
