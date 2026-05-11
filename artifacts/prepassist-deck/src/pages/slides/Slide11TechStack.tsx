export default function Slide11TechStack() {
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
          Technology Stack
        </div>

        <div className="flex" style={{ gap: "2.5vw" }}>
          {/* Mobile */}
          <div
            style={{
              flex: 1,
              background: "#111827",
              borderRadius: "1.2vw",
              padding: "3vh 2vw",
              borderTop: "0.3vh solid #4F39F6",
            }}
          >
            <div style={{ fontSize: "1.5vw", fontFamily: "var(--font-body-family)", color: "#4F39F6", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "2vh" }}>Mobile</div>
            <div style={{ fontSize: "2vw", fontFamily: "var(--font-display-family)", fontWeight: 700, color: "#F1F5F9", marginBottom: "1vh" }}>Expo SDK 54</div>
            <div style={{ fontSize: "1.7vw", fontFamily: "var(--font-body-family)", color: "#64748B", lineHeight: 1.5 }}>React Native — iOS, Android, Web from one codebase</div>
          </div>

          {/* AI */}
          <div
            style={{
              flex: 1,
              background: "#111827",
              borderRadius: "1.2vw",
              padding: "3vh 2vw",
              borderTop: "0.3vh solid #5B8DEF",
            }}
          >
            <div style={{ fontSize: "1.5vw", fontFamily: "var(--font-body-family)", color: "#5B8DEF", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "2vh" }}>AI</div>
            <div style={{ fontSize: "2vw", fontFamily: "var(--font-display-family)", fontWeight: 700, color: "#F1F5F9", marginBottom: "1vh" }}>OpenAI gpt-5.4</div>
            <div style={{ fontSize: "1.7vw", fontFamily: "var(--font-body-family)", color: "#64748B", lineHeight: 1.5 }}>RAG + Vision + Quiz generation via Replit-managed proxy</div>
          </div>

          {/* Backend */}
          <div
            style={{
              flex: 1,
              background: "#111827",
              borderRadius: "1.2vw",
              padding: "3vh 2vw",
              borderTop: "0.3vh solid #06B6D4",
            }}
          >
            <div style={{ fontSize: "1.5vw", fontFamily: "var(--font-body-family)", color: "#06B6D4", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "2vh" }}>Backend</div>
            <div style={{ fontSize: "2vw", fontFamily: "var(--font-display-family)", fontWeight: 700, color: "#F1F5F9", marginBottom: "1vh" }}>Express 5</div>
            <div style={{ fontSize: "1.7vw", fontFamily: "var(--font-body-family)", color: "#64748B", lineHeight: 1.5 }}>TypeScript API server, SSE streaming, PDF extraction</div>
          </div>

          {/* Storage */}
          <div
            style={{
              flex: 1,
              background: "#111827",
              borderRadius: "1.2vw",
              padding: "3vh 2vw",
              borderTop: "0.3vh solid #4F39F6",
            }}
          >
            <div style={{ fontSize: "1.5vw", fontFamily: "var(--font-body-family)", color: "#4F39F6", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "2vh" }}>Storage</div>
            <div style={{ fontSize: "2vw", fontFamily: "var(--font-display-family)", fontWeight: 700, color: "#F1F5F9", marginBottom: "1vh" }}>AsyncStorage</div>
            <div style={{ fontSize: "1.7vw", fontFamily: "var(--font-body-family)", color: "#64748B", lineHeight: 1.5 }}>Offline-first local data persistence</div>
          </div>
        </div>
      </div>
    </div>
  );
}
