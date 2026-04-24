# PrepAssist — Mobile

AI-powered UPSC exam preparation companion. An Expo (React Native) mobile app that mirrors the prepassist.in feature set on the phone.

## What's in the app

- **Home dashboard** — greeting, study streak, hero gradient card with key stats (documents indexed, mains average, accuracy), weekly minutes chart, syllabus coverage progress bars, recent activity feed.
- **Vault** — RAG-style document store. Add documents (PDFs / notes), then tap to open a chat thread that "speaks to" that source. Long-press to delete.
- **Mains AI** — capture or upload a photo of a handwritten essay, pick the paper (GS-1 to GS-4 / Essay), and get a structured rubric breakdown (Structure, Content, Relevance, Presentation, Value Addition) with examiner-style feedback and a ranker insight.
- **Quiz Engine** — generate prelims-grade MCQs from any topic or quick-drill preset (Polity, History, Geography, Economy, Environment), choose 5/10/20 questions, take the quiz with instant feedback + explanations, and review the score with all answers.

## Stack

- **Expo SDK 54** with Expo Router (file-based routing, typed routes).
- **NativeTabs** with iOS 26 liquid-glass + classic `Tabs` fallback for older OS / web.
- **AsyncStorage** for local persistence (documents, chats, evaluations, quiz attempts).
- **Inter** font (400/500/600/700/800).
- **expo-image-picker** for camera & gallery; **expo-haptics** for tactile feedback; **expo-linear-gradient** for the brand hero.
- **react-native-keyboard-controller** for the chat composer.

## Brand

- Primary: `#4F39F6` (indigo) → mid `#5B8DEF` → accent `#06B6D4` (cyan) gradient.
- Background: `#F8FAFC`, foreground: `#0F172B`.
- Pill-shaped buttons, 16–24px rounded cards, hairline borders.

## Project structure

```
artifacts/mobile/
  app/
    _layout.tsx                # Root providers, fonts, Stack
    (tabs)/_layout.tsx         # Native + classic tabs
    (tabs)/index.tsx           # Home dashboard
    (tabs)/vault.tsx           # Document list + add modal
    (tabs)/mains.tsx           # Mains evaluator + composer
    (tabs)/quiz.tsx            # Quiz generator + history
    vault-chat/[id].tsx        # Chat with a document
    mains-result/[id].tsx      # Evaluation breakdown
    quiz-session.tsx           # Quiz taking screen (modal)
  components/
    ui.tsx                     # Card, Button, GradientButton, Pill, etc.
  contexts/
    AppContext.tsx             # AsyncStorage-backed shared state
  lib/
    ai.ts                      # On-device mock RAG / evaluator / quiz generator
  constants/colors.ts          # Brand palette
  app.json                     # Camera & photo library permissions
```

## Notes

- AI features call the api-server backend (gpt-5.4 via Replit-managed OpenAI integration).
  - `/api/ai/rag` and `/api/ai/rag/stream` (SSE) — Vault chat, accepts `documentText` injected into system prompt.
  - `/api/ai/evaluate` — Mains essay vision grading from base64 image.
  - `/api/ai/quiz` — PDF→quiz generation from topic.
  - `/api/ai/extract-pdf` — Server-side PDF text extraction (unpdf), returns up to 60k chars.
- Vault: real PDFs picked via expo-document-picker, base64-encoded on device, sent to `/api/ai/extract-pdf`. Extracted text stored on the `VaultDocument` and passed to RAG calls so chat is grounded in the actual source.
- Camera capture works in Expo Go on iOS/Android; on web it falls back to file picker.
