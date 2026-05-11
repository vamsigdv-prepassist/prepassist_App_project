export default function Slide06MainsAI() {
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
            Feature 02
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
            Mains AI
          </div>
          <div
            style={{
              fontSize: "2vw",
              fontFamily: "var(--font-body-family)",
              color: "#94A3B8",
              marginBottom: "4vh",
            }}
          >
            Essay evaluator with examiner-grade feedback
          </div>

          <div className="flex flex-col" style={{ gap: "2.5vh" }}>
            <div className="flex" style={{ gap: "1.5vw", alignItems: "flex-start" }}>
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#06B6D4", marginTop: "1vh", flexShrink: 0 }} />
              <div style={{ fontSize: "2.1vw", fontFamily: "var(--font-body-family)", color: "#CBD5E1", lineHeight: 1.45 }}>
                Photograph a handwritten answer — feedback in seconds
              </div>
            </div>
            <div className="flex" style={{ gap: "1.5vw", alignItems: "flex-start" }}>
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#06B6D4", marginTop: "1vh", flexShrink: 0 }} />
              <div style={{ fontSize: "2.1vw", fontFamily: "var(--font-body-family)", color: "#CBD5E1", lineHeight: 1.45 }}>
                Examiner-style scoring with ranker insights
              </div>
            </div>
            <div className="flex" style={{ gap: "1.5vw", alignItems: "flex-start" }}>
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#06B6D4", marginTop: "1vh", flexShrink: 0 }} />
              <div style={{ fontSize: "2.1vw", fontFamily: "var(--font-body-family)", color: "#CBD5E1", lineHeight: 1.45 }}>
                Supports GS-1 through GS-4 and Essay paper
              </div>
            </div>
          </div>
        </div>

        {/* Right: rubric breakdown */}
        <div className="flex flex-col justify-center" style={{ flex: 1, gap: "1.8vh" }}>
          <div
            style={{
              fontSize: "1.5vw",
              fontFamily: "var(--font-body-family)",
              fontWeight: 500,
              color: "#475569",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "1vh",
            }}
          >
            Rubric
          </div>
          {["Structure", "Content", "Relevance", "Presentation", "Value Addition"].map((item, i) => (
            <div
              key={item}
              style={{
                background: "#111827",
                borderRadius: "0.8vw",
                padding: "1.5vh 1.8vw",
                display: "flex",
                alignItems: "center",
                gap: "1.5vw",
                border: "0.1vw solid #1E293B",
              }}
            >
              <div
                style={{
                  width: "0.4vw",
                  height: "3vh",
                  borderRadius: "0.2vw",
                  background: `hsl(${240 - i * 18}, 80%, ${60 + i * 4}%)`,
                  flexShrink: 0,
                }}
              />
              <div style={{ fontSize: "1.9vw", fontFamily: "var(--font-body-family)", fontWeight: 500, color: "#E2E8F0" }}>
                {item}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
