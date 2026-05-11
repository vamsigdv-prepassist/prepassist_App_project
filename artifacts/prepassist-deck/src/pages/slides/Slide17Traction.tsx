export default function Slide17Traction() {
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
          Status
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
          Traction Indicators
        </div>

        <div className="flex" style={{ gap: "2.5vw" }}>
          <div
            style={{
              flex: 1,
              background: "#111827",
              borderRadius: "1.2vw",
              padding: "3.5vh 2vw",
              borderLeft: "0.4vw solid #4F39F6",
            }}
          >
            <div style={{ fontSize: "2vw", fontFamily: "var(--font-display-family)", fontWeight: 700, color: "#F1F5F9", marginBottom: "1.2vh", lineHeight: 1.2 }}>
              Full product built
            </div>
            <div style={{ fontSize: "1.7vw", fontFamily: "var(--font-body-family)", color: "#64748B", lineHeight: 1.5 }}>
              Functional on iOS, Android, and Web — all four modules live
            </div>
          </div>

          <div
            style={{
              flex: 1,
              background: "#111827",
              borderRadius: "1.2vw",
              padding: "3.5vh 2vw",
              borderLeft: "0.4vw solid #5B8DEF",
            }}
          >
            <div style={{ fontSize: "2vw", fontFamily: "var(--font-display-family)", fontWeight: 700, color: "#F1F5F9", marginBottom: "1.2vh", lineHeight: 1.2 }}>
              RAG + Vision + Quiz
            </div>
            <div style={{ fontSize: "1.7vw", fontFamily: "var(--font-body-family)", color: "#64748B", lineHeight: 1.5 }}>
              All AI pipelines live: chat, essay evaluation, MCQ generation, PDF extraction
            </div>
          </div>

          <div
            style={{
              flex: 1,
              background: "#111827",
              borderRadius: "1.2vw",
              padding: "3.5vh 2vw",
              borderLeft: "0.4vw solid #06B6D4",
            }}
          >
            <div style={{ fontSize: "2vw", fontFamily: "var(--font-display-family)", fontWeight: 700, color: "#F1F5F9", marginBottom: "1.2vh", lineHeight: 1.2 }}>
              One codebase
            </div>
            <div style={{ fontSize: "1.7vw", fontFamily: "var(--font-body-family)", color: "#64748B", lineHeight: 1.5 }}>
              Expo ships to all three platforms with a single build pipeline
            </div>
          </div>

          <div
            style={{
              flex: 1,
              background: "#111827",
              borderRadius: "1.2vw",
              padding: "3.5vh 2vw",
              borderLeft: "0.4vw solid #4F39F6",
            }}
          >
            <div style={{ fontSize: "2vw", fontFamily: "var(--font-display-family)", fontWeight: 700, color: "#F1F5F9", marginBottom: "1.2vh", lineHeight: 1.2 }}>
              Scale-ready architecture
            </div>
            <div style={{ fontSize: "1.7vw", fontFamily: "var(--font-body-family)", color: "#64748B", lineHeight: 1.5 }}>
              API server, auth, and DB layers ready to layer in as user base grows
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
