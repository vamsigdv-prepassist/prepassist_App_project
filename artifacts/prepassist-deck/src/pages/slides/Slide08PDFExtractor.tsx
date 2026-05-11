export default function Slide08PDFExtractor() {
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
        <div className="flex flex-col" style={{ flex: "0 0 52vw" }}>
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
            Feature 04
          </div>
          <div
            style={{
              fontSize: "4.8vw",
              fontFamily: "var(--font-display-family)",
              fontWeight: 800,
              color: "#F1F5F9",
              letterSpacing: "-0.025em",
              lineHeight: 1.05,
              marginBottom: "2vh",
            }}
          >
            PDF Quiz Extractor
          </div>
          <div
            style={{
              fontSize: "2vw",
              fontFamily: "var(--font-body-family)",
              color: "#94A3B8",
              marginBottom: "4.5vh",
            }}
          >
            Upload a question-bank PDF — instant quiz
          </div>
          <div className="flex flex-col" style={{ gap: "2.5vh" }}>
            <div className="flex" style={{ gap: "1.5vw", alignItems: "flex-start" }}>
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#06B6D4", marginTop: "1vh", flexShrink: 0 }} />
              <div style={{ fontSize: "2.1vw", fontFamily: "var(--font-body-family)", color: "#CBD5E1", lineHeight: 1.45 }}>
                AI extracts up to 200 MCQs per document automatically
              </div>
            </div>
            <div className="flex" style={{ gap: "1.5vw", alignItems: "flex-start" }}>
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#06B6D4", marginTop: "1vh", flexShrink: 0 }} />
              <div style={{ fontSize: "2.1vw", fontFamily: "var(--font-body-family)", color: "#CBD5E1", lineHeight: 1.45 }}>
                Paragraph-bounded chunking, parallel processing, deduplication
              </div>
            </div>
            <div className="flex" style={{ gap: "1.5vw", alignItems: "flex-start" }}>
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#06B6D4", marginTop: "1vh", flexShrink: 0 }} />
              <div style={{ fontSize: "2.1vw", fontFamily: "var(--font-body-family)", color: "#CBD5E1", lineHeight: 1.45 }}>
                One tap from PDF to full quiz session
              </div>
            </div>
          </div>
        </div>

        {/* Right: stat */}
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
              fontSize: "9vw",
              fontFamily: "var(--font-display-family)",
              fontWeight: 800,
              background: "linear-gradient(135deg, #4F39F6, #06B6D4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              lineHeight: 1,
              marginBottom: "1.5vh",
            }}
          >
            200
          </div>
          <div
            style={{
              fontSize: "1.7vw",
              fontFamily: "var(--font-body-family)",
              color: "#475569",
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            MCQs extracted per PDF — automatically deduplicated
          </div>
        </div>
      </div>
    </div>
  );
}
