export default function Slide16Competitive() {
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
            color: "#06B6D4",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            marginBottom: "2vh",
          }}
        >
          Market
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
          Competitive Positioning
        </div>

        {/* Comparison table */}
        <div className="flex flex-col" style={{ gap: "1.5vh" }}>
          {/* Header row */}
          <div className="flex" style={{ gap: "2vw" }}>
            <div style={{ flex: "0 0 22vw" }} />
            <div style={{ flex: 1, fontSize: "1.6vw", fontFamily: "var(--font-body-family)", color: "#475569", textAlign: "center", letterSpacing: "0.08em", textTransform: "uppercase" }}>AI-Powered</div>
            <div style={{ flex: 1, fontSize: "1.6vw", fontFamily: "var(--font-body-family)", color: "#475569", textAlign: "center", letterSpacing: "0.08em", textTransform: "uppercase" }}>No Paywall</div>
            <div style={{ flex: 1, fontSize: "1.6vw", fontFamily: "var(--font-body-family)", color: "#475569", textAlign: "center", letterSpacing: "0.08em", textTransform: "uppercase" }}>UPSC-specific</div>
            <div style={{ flex: 1, fontSize: "1.6vw", fontFamily: "var(--font-body-family)", color: "#475569", textAlign: "center", letterSpacing: "0.08em", textTransform: "uppercase" }}>Doc-grounded</div>
          </div>

          {/* PrepAssist row */}
          <div
            className="flex items-center"
            style={{
              gap: "2vw",
              background: "linear-gradient(90deg, #4F39F615, #06B6D410)",
              borderRadius: "0.8vw",
              padding: "1.6vh 1.5vw",
              border: "0.1vw solid #4F39F640",
            }}
          >
            <div style={{ flex: "0 0 22vw", fontSize: "2vw", fontFamily: "var(--font-display-family)", fontWeight: 700, color: "#F1F5F9" }}>PrepAssist</div>
            <div style={{ flex: 1, textAlign: "center", fontSize: "2.2vw", color: "#06B6D4", fontWeight: 700 }}>✓</div>
            <div style={{ flex: 1, textAlign: "center", fontSize: "2.2vw", color: "#06B6D4", fontWeight: 700 }}>✓</div>
            <div style={{ flex: 1, textAlign: "center", fontSize: "2.2vw", color: "#06B6D4", fontWeight: 700 }}>✓</div>
            <div style={{ flex: 1, textAlign: "center", fontSize: "2.2vw", color: "#06B6D4", fontWeight: 700 }}>✓</div>
          </div>

          {/* ForumIAS row */}
          <div
            className="flex items-center"
            style={{
              gap: "2vw",
              background: "#111827",
              borderRadius: "0.8vw",
              padding: "1.6vh 1.5vw",
            }}
          >
            <div style={{ flex: "0 0 22vw", fontSize: "2vw", fontFamily: "var(--font-body-family)", color: "#64748B" }}>ForumIAS / InsightsIAS</div>
            <div style={{ flex: 1, textAlign: "center", fontSize: "2vw", color: "#334155" }}>—</div>
            <div style={{ flex: 1, textAlign: "center", fontSize: "2vw", color: "#334155" }}>—</div>
            <div style={{ flex: 1, textAlign: "center", fontSize: "2.2vw", color: "#06B6D4", fontWeight: 700 }}>✓</div>
            <div style={{ flex: 1, textAlign: "center", fontSize: "2vw", color: "#334155" }}>—</div>
          </div>

          {/* Unacademy row */}
          <div
            className="flex items-center"
            style={{
              gap: "2vw",
              background: "#111827",
              borderRadius: "0.8vw",
              padding: "1.6vh 1.5vw",
            }}
          >
            <div style={{ flex: "0 0 22vw", fontSize: "2vw", fontFamily: "var(--font-body-family)", color: "#64748B" }}>Unacademy / BYJU's</div>
            <div style={{ flex: 1, textAlign: "center", fontSize: "2.2vw", color: "#06B6D4", fontWeight: 700 }}>✓</div>
            <div style={{ flex: 1, textAlign: "center", fontSize: "2vw", color: "#334155" }}>—</div>
            <div style={{ flex: 1, textAlign: "center", fontSize: "2.2vw", color: "#06B6D4", fontWeight: 700 }}>✓</div>
            <div style={{ flex: 1, textAlign: "center", fontSize: "2vw", color: "#334155" }}>—</div>
          </div>

          {/* ChatGPT row */}
          <div
            className="flex items-center"
            style={{
              gap: "2vw",
              background: "#111827",
              borderRadius: "0.8vw",
              padding: "1.6vh 1.5vw",
            }}
          >
            <div style={{ flex: "0 0 22vw", fontSize: "2vw", fontFamily: "var(--font-body-family)", color: "#64748B" }}>ChatGPT</div>
            <div style={{ flex: 1, textAlign: "center", fontSize: "2.2vw", color: "#06B6D4", fontWeight: 700 }}>✓</div>
            <div style={{ flex: 1, textAlign: "center", fontSize: "2vw", color: "#334155" }}>—</div>
            <div style={{ flex: 1, textAlign: "center", fontSize: "2vw", color: "#334155" }}>—</div>
            <div style={{ flex: 1, textAlign: "center", fontSize: "2vw", color: "#334155" }}>—</div>
          </div>
        </div>
      </div>
    </div>
  );
}
