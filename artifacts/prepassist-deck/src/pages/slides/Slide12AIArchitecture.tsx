export default function Slide12AIArchitecture() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0B0F1A" }}>
      {/* Accent bar */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{ height: "0.4vh", background: "linear-gradient(90deg, #4F39F6, #06B6D4)" }}
      />

      <div
        className="absolute flex"
        style={{ top: "10vh", left: "7vw", right: "7vw", bottom: "8vh", gap: "5vw" }}
      >
        {/* Left */}
        <div className="flex flex-col" style={{ flex: "0 0 50vw" }}>
          <div
            style={{
              fontSize: "1.4vw",
              fontFamily: "var(--font-body-family)",
              fontWeight: 500,
              color: "#06B6D4",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              marginBottom: "2vh",
            }}
          >
            Engineering
          </div>
          <div
            style={{
              fontSize: "4.8vw",
              fontFamily: "var(--font-display-family)",
              fontWeight: 800,
              color: "#F1F5F9",
              letterSpacing: "-0.025em",
              lineHeight: 1.05,
              marginBottom: "5vh",
            }}
          >
            AI Architecture
          </div>
          <div className="flex flex-col" style={{ gap: "2.5vh" }}>
            <div className="flex" style={{ gap: "1.5vw", alignItems: "flex-start" }}>
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#06B6D4", marginTop: "1vh", flexShrink: 0 }} />
              <div style={{ fontSize: "2.1vw", fontFamily: "var(--font-body-family)", color: "#CBD5E1", lineHeight: 1.45 }}>
                Express 5 API server handles all AI calls server-side
              </div>
            </div>
            <div className="flex" style={{ gap: "1.5vw", alignItems: "flex-start" }}>
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#06B6D4", marginTop: "1vh", flexShrink: 0 }} />
              <div style={{ fontSize: "2.1vw", fontFamily: "var(--font-body-family)", color: "#CBD5E1", lineHeight: 1.45 }}>
                Streaming SSE for real-time vault chat responses
              </div>
            </div>
            <div className="flex" style={{ gap: "1.5vw", alignItems: "flex-start" }}>
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#06B6D4", marginTop: "1vh", flexShrink: 0 }} />
              <div style={{ fontSize: "2.1vw", fontFamily: "var(--font-body-family)", color: "#CBD5E1", lineHeight: 1.45 }}>
                PDF extraction via unpdf — up to 60k chars per document
              </div>
            </div>
            <div className="flex" style={{ gap: "1.5vw", alignItems: "flex-start" }}>
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#06B6D4", marginTop: "1vh", flexShrink: 0 }} />
              <div style={{ fontSize: "2.1vw", fontFamily: "var(--font-body-family)", color: "#CBD5E1", lineHeight: 1.45 }}>
                Chunked parallel quiz extraction — deduplication, 200-Q cap
              </div>
            </div>
          </div>
        </div>

        {/* Right: API routes panel */}
        <div
          className="flex flex-col justify-center"
          style={{
            flex: 1,
            background: "#0D1120",
            borderRadius: "1.5vw",
            padding: "3vh 2vw",
            border: "0.1vw solid #1E293B",
            fontFamily: "monospace",
            gap: "1.8vh",
          }}
        >
          <div style={{ fontSize: "1.4vw", color: "#475569", marginBottom: "0.5vh", fontFamily: "var(--font-body-family)", letterSpacing: "0.1em", textTransform: "uppercase" }}>API Routes</div>
          <div style={{ fontSize: "1.7vw", color: "#06B6D4" }}>/api/ai/rag</div>
          <div style={{ fontSize: "1.5vw", color: "#334155", paddingLeft: "1.5vw" }}>Vault chat + streaming SSE</div>
          <div style={{ fontSize: "1.7vw", color: "#06B6D4" }}>/api/ai/evaluate</div>
          <div style={{ fontSize: "1.5vw", color: "#334155", paddingLeft: "1.5vw" }}>Mains essay vision grading</div>
          <div style={{ fontSize: "1.7vw", color: "#06B6D4" }}>/api/ai/quiz</div>
          <div style={{ fontSize: "1.5vw", color: "#334155", paddingLeft: "1.5vw" }}>Topic → MCQ generation</div>
          <div style={{ fontSize: "1.7vw", color: "#06B6D4" }}>/api/ai/extract-pdf</div>
          <div style={{ fontSize: "1.5vw", color: "#334155", paddingLeft: "1.5vw" }}>PDF text extraction (60k chars)</div>
          <div style={{ fontSize: "1.7vw", color: "#4F39F6" }}>/api/ai/extract-quiz</div>
          <div style={{ fontSize: "1.5vw", color: "#334155", paddingLeft: "1.5vw" }}>PDF → 200 MCQ batch extractor</div>
        </div>
      </div>
    </div>
  );
}
