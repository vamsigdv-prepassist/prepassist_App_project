export default function Slide07QuizEngine() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0B0F1A" }}>
      {/* Accent bar */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{ height: "0.4vh", background: "linear-gradient(90deg, #4F39F6, #06B6D4)" }}
      />

      <div
        className="absolute flex flex-col"
        style={{ top: "10vh", left: "7vw", right: "7vw", bottom: "8vh" }}
      >
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
          Feature 03
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
          Quiz Engine
        </div>
        <div
          style={{
            fontSize: "2vw",
            fontFamily: "var(--font-body-family)",
            color: "#94A3B8",
            marginBottom: "4.5vh",
          }}
        >
          Adaptive prelims drill — topic-aware, instant, explained
        </div>

        {/* Two column */}
        <div className="flex" style={{ gap: "4vw", flex: 1 }}>
          {/* Left bullets */}
          <div className="flex flex-col" style={{ flex: 1, gap: "2.5vh", justifyContent: "flex-start" }}>
            <div className="flex" style={{ gap: "1.5vw", alignItems: "flex-start" }}>
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#4F39F6", marginTop: "1vh", flexShrink: 0 }} />
              <div style={{ fontSize: "2.1vw", fontFamily: "var(--font-body-family)", color: "#CBD5E1", lineHeight: 1.45 }}>
                Generate MCQs from any topic or custom prompt
              </div>
            </div>
            <div className="flex" style={{ gap: "1.5vw", alignItems: "flex-start" }}>
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#4F39F6", marginTop: "1vh", flexShrink: 0 }} />
              <div style={{ fontSize: "2.1vw", fontFamily: "var(--font-body-family)", color: "#CBD5E1", lineHeight: 1.45 }}>
                Choose 5, 10, or 20 questions with instant explanations
              </div>
            </div>
            <div className="flex" style={{ gap: "1.5vw", alignItems: "flex-start" }}>
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#4F39F6", marginTop: "1vh", flexShrink: 0 }} />
              <div style={{ fontSize: "2.1vw", fontFamily: "var(--font-body-family)", color: "#CBD5E1", lineHeight: 1.45 }}>
                Tracks weak areas across all attempts
              </div>
            </div>
          </div>

          {/* Right: drills */}
          <div className="flex flex-col" style={{ flex: 1 }}>
            <div
              style={{
                fontSize: "1.5vw",
                fontFamily: "var(--font-body-family)",
                fontWeight: 500,
                color: "#475569",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: "2vh",
              }}
            >
              Quick Drills
            </div>
            <div className="flex flex-wrap" style={{ gap: "1.2vw" }}>
              <div style={{ background: "#111827", border: "0.1vw solid #4F39F640", borderRadius: "0.8vw", padding: "1.2vh 1.8vw", fontSize: "1.8vw", fontFamily: "var(--font-body-family)", color: "#E2E8F0" }}>Polity</div>
              <div style={{ background: "#111827", border: "0.1vw solid #4F39F640", borderRadius: "0.8vw", padding: "1.2vh 1.8vw", fontSize: "1.8vw", fontFamily: "var(--font-body-family)", color: "#E2E8F0" }}>History</div>
              <div style={{ background: "#111827", border: "0.1vw solid #4F39F640", borderRadius: "0.8vw", padding: "1.2vh 1.8vw", fontSize: "1.8vw", fontFamily: "var(--font-body-family)", color: "#E2E8F0" }}>Geography</div>
              <div style={{ background: "#111827", border: "0.1vw solid #4F39F640", borderRadius: "0.8vw", padding: "1.2vh 1.8vw", fontSize: "1.8vw", fontFamily: "var(--font-body-family)", color: "#E2E8F0" }}>Economy</div>
              <div style={{ background: "#111827", border: "0.1vw solid #4F39F640", borderRadius: "0.8vw", padding: "1.2vh 1.8vw", fontSize: "1.8vw", fontFamily: "var(--font-body-family)", color: "#E2E8F0" }}>Environment</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
