# NoticeLens

**From confusing notices to clear action.** A hackathon MVP that uses Gemma 4 through the Google GenAI SDK to understand college, scholarship, exam, internship and public-service notices.

## MVP features

- Upload text-based PDF, JPG, PNG, WEBP, or TXT notices (max 10 MB).
- Gemma-powered plain-language summary, key points, eligibility requirements, required documents, action steps, and dates.
- Evidence snippets attached to extracted information so users can verify important details.
- Ask Your Notice chat. The original file is sent with each question so answers stay grounded in the source document.
- Deadline countdown when the notice includes an unambiguous date.
- Interactive checklist for required actions.
- Sample fictional DTU scholarship notice for a quick demo.

## Requirements

- Node.js 20.19+ or 22.12+ recommended (Vite 7 requires a recent Node release).
- A Google AI Studio API key with access to Gemma 4.

## 1. Configure the API key

1. Copy `server/.env.example` to `server/.env` (Windows PowerShell: `Copy-Item server/.env.example server/.env`; macOS/Linux: `cp server/.env.example server/.env`).
2. Add your API key to `GEMINI_API_KEY`.
3. Keep the key in the server only. Never put it in a `VITE_` variable or frontend code.

The default model is `gemma-4-26b-a4b-it`. You can change it with `GEMMA_MODEL` if needed.

## 2. Install dependencies

From the project root (`noticelens/`), run:

```bash
npm install
```

## 3. Run locally

From the project root, run:

```bash
npm run dev
```

This starts both the Express API (`http://localhost:5000`) and React app (`http://localhost:5173`). Open the React URL in your browser.

## 4. Demo flow

1. Click **Try sample notice** to load the fictional scholarship notice.
2. Click **Analyse notice**.
3. Review the summary, deadline, eligibility, documents, and checklist.
4. Ask: **Can a student receiving partial scholarship assistance apply?**
5. Ask: **What is the last date and time for submission?**
6. Ask an unrelated question to demonstrate the honest “not stated in this notice” behavior.

## API routes

- `GET /api/health` — server status and model configuration.
- `POST /api/analyze` — multipart field `notice`; returns structured extraction.
- `POST /api/chat` — multipart fields `notice`, `question`, and optional JSON `history`.

## Notes / limitations

- This is a hackathon prototype. It does not store documents or chats in a database; the original file remains in browser memory during the current session.
- Uploaded files are held in server memory for the request and are not written to disk. Images are sent to Gemma as multimodal image input. Text-based PDFs are parsed to text on the server before being sent to Gemma; scanned/image-only PDFs should be uploaded as page images in this MVP. Notice content is sent to Google for model processing, subject to Google's applicable API terms and data policies.
- A model can still miss information or misread scanned text. Always verify deadlines, eligibility, fees, and legal or financial requirements against the original notice.
- Eligibility is not a personal verdict. The app extracts stated criteria but needs a student's circumstances to assess them.
- Local checklist changes are held in browser memory and reset on page refresh.
