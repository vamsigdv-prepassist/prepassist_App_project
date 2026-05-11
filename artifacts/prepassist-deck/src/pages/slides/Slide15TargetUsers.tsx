export default function Slide15TargetUsers() {
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
          Audience
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
          Target Users
        </div>

        {/* Three profiles */}
        <div className="flex" style={{ gap: "3vw" }}>
          <div
            style={{
              flex: 1,
              background: "#111827",
              borderRadius: "1.2vw",
              padding: "4vh 2.5vw",
              borderTop: "0.3vh solid #4F39F6",
            }}
          >
            <div
              style={{
                fontSize: "4vw",
                fontFamily: "var(--font-display-family)",
                fontWeight: 800,
                color: "#4F39F630",
                lineHeight: 1,
                marginBottom: "2vh",
              }}
            >
              01
            </div>
            <div
              style={{
                fontSize: "2.2vw",
                fontFamily: "var(--font-display-family)",
                fontWeight: 700,
                color: "#F1F5F9",
                marginBottom: "1.5vh",
                lineHeight: 1.2,
              }}
            >
              First-attempt aspirants
            </div>
            <div style={{ fontSize: "1.8vw", fontFamily: "var(--font-body-family)", color: "#64748B", lineHeight: 1.5 }}>
              Building a study system from scratch — need structure, feedback, and a habit
            </div>
          </div>

          <div
            style={{
              flex: 1,
              background: "#111827",
              borderRadius: "1.2vw",
              padding: "4vh 2.5vw",
              borderTop: "0.3vh solid #5B8DEF",
            }}
          >
            <div
              style={{
                fontSize: "4vw",
                fontFamily: "var(--font-display-family)",
                fontWeight: 800,
                color: "#5B8DEF30",
                lineHeight: 1,
                marginBottom: "2vh",
              }}
            >
              02
            </div>
            <div
              style={{
                fontSize: "2.2vw",
                fontFamily: "var(--font-display-family)",
                fontWeight: 700,
                color: "#F1F5F9",
                marginBottom: "1.5vh",
                lineHeight: 1.2,
              }}
            >
              Repeat candidates
            </div>
            <div style={{ fontSize: "1.8vw", fontFamily: "var(--font-body-family)", color: "#64748B", lineHeight: 1.5 }}>
              Sharpening weak subject areas with targeted drills and detailed answer feedback
            </div>
          </div>

          <div
            style={{
              flex: 1,
              background: "#111827",
              borderRadius: "1.2vw",
              padding: "4vh 2.5vw",
              borderTop: "0.3vh solid #06B6D4",
            }}
          >
            <div
              style={{
                fontSize: "4vw",
                fontFamily: "var(--font-display-family)",
                fontWeight: 800,
                color: "#06B6D430",
                lineHeight: 1,
                marginBottom: "2vh",
              }}
            >
              03
            </div>
            <div
              style={{
                fontSize: "2.2vw",
                fontFamily: "var(--font-display-family)",
                fontWeight: 700,
                color: "#F1F5F9",
                marginBottom: "1.5vh",
                lineHeight: 1.2,
              }}
            >
              Self-study learners
            </div>
            <div style={{ fontSize: "1.8vw", fontFamily: "var(--font-body-family)", color: "#64748B", lineHeight: 1.5 }}>
              Outside metro coaching centres — getting top-quality guidance on a phone
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
