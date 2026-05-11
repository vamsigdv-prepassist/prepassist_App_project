export default function Slide05Vault() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0B0F1A" }}>
      {/* Accent bar */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{ height: "0.4vh", background: "linear-gradient(90deg, #4F39F6, #06B6D4)" }}
      />

      {/* Large background word */}
      <div
        className="absolute"
        style={{
          right: "-4vw",
          bottom: "-4vh",
          fontSize: "28vw",
          fontFamily: "var(--font-display-family)",
          fontWeight: 800,
          color: "#4F39F6",
          opacity: 0.04,
          lineHeight: 1,
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        VAULT
      </div>

      <div
        className="absolute flex"
        style={{ top: "10vh", left: "7vw", right: "7vw", bottom: "8vh", gap: "6vw" }}
      >
        {/* Left: text */}
        <div className="flex flex-col" style={{ flex: "0 0 52vw" }}>
          <div
            style={{
              fontSize: "1.4vw",
              fontFamily: "var(--font-body-family)",
              fontWeight: 500,
              color: "#4F39F6",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              marginBottom: "2vh",
            }}
          >
            Feature 01
          </div>
          <div
            style={{
              fontSize: "4.8vw",
              fontFamily: "var(--font-display-family)",
              fontWeight: 800,
              color: "#F1F5F9",
              letterSpacing: "-0.025em",
              lineHeight: 1.05,
              marginBottom: "4.5vh",
            }}
          >
            Vault
          </div>
          <div
            style={{
              fontSize: "2vw",
              fontFamily: "var(--font-body-family)",
              color: "#94A3B8",
              marginBottom: "4vh",
            }}
          >
            Your AI document store
          </div>

          <div className="flex flex-col" style={{ gap: "2.5vh" }}>
            <div className="flex" style={{ gap: "1.5vw", alignItems: "flex-start" }}>
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#4F39F6", marginTop: "1vh", flexShrink: 0 }} />
              <div style={{ fontSize: "2.1vw", fontFamily: "var(--font-body-family)", color: "#CBD5E1", lineHeight: 1.45 }}>
                Upload PDFs, notes, and study material
              </div>
            </div>
            <div className="flex" style={{ gap: "1.5vw", alignItems: "flex-start" }}>
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#4F39F6", marginTop: "1vh", flexShrink: 0 }} />
              <div style={{ fontSize: "2.1vw", fontFamily: "var(--font-body-family)", color: "#CBD5E1", lineHeight: 1.45 }}>
                Each document becomes a searchable chat thread
              </div>
            </div>
            <div className="flex" style={{ gap: "1.5vw", alignItems: "flex-start" }}>
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#4F39F6", marginTop: "1vh", flexShrink: 0 }} />
              <div style={{ fontSize: "2.1vw", fontFamily: "var(--font-body-family)", color: "#CBD5E1", lineHeight: 1.45 }}>
                Ask questions, get sourced answers from your own notes
              </div>
            </div>
            <div className="flex" style={{ gap: "1.5vw", alignItems: "flex-start" }}>
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#4F39F6", marginTop: "1vh", flexShrink: 0 }} />
              <div style={{ fontSize: "2.1vw", fontFamily: "var(--font-body-family)", color: "#CBD5E1", lineHeight: 1.45 }}>
                Replaces highlighter + sticky notes with grounded AI chat
              </div>
            </div>
          </div>
        </div>

        {/* Right: visual accent panel */}
        <div
          className="flex flex-col justify-center items-center"
          style={{
            flex: 1,
            background: "#111827",
            borderRadius: "1.5vw",
            padding: "3vh 2vw",
            border: "0.1vw solid #1E293B",
          }}
        >
          <div
            style={{
              fontSize: "4vw",
              fontFamily: "var(--font-display-family)",
              fontWeight: 800,
              background: "linear-gradient(135deg, #4F39F6, #06B6D4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: "2vh",
              textAlign: "center",
            }}
          >
            RAG
          </div>
          <div
            style={{
              fontSize: "1.6vw",
              fontFamily: "var(--font-body-family)",
              color: "#475569",
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            Retrieval-Augmented Generation — your document text is injected directly into the AI system prompt
          </div>
        </div>
      </div>
    </div>
  );
}
