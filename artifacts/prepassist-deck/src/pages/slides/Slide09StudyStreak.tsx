export default function Slide09StudyStreak() {
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
              color: "#4F39F6",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              marginBottom: "2vh",
            }}
          >
            Feature 05
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
            Study Streak Calendar
          </div>
          <div className="flex flex-col" style={{ gap: "2.5vh" }}>
            <div className="flex" style={{ gap: "1.5vw", alignItems: "flex-start" }}>
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#4F39F6", marginTop: "1vh", flexShrink: 0 }} />
              <div style={{ fontSize: "2.1vw", fontFamily: "var(--font-body-family)", color: "#CBD5E1", lineHeight: 1.45 }}>
                Daily activity tracked across quizzes and evaluations
              </div>
            </div>
            <div className="flex" style={{ gap: "1.5vw", alignItems: "flex-start" }}>
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#4F39F6", marginTop: "1vh", flexShrink: 0 }} />
              <div style={{ fontSize: "2.1vw", fontFamily: "var(--font-body-family)", color: "#CBD5E1", lineHeight: 1.45 }}>
                GitHub-style heatmap shows your 4-week study pattern
              </div>
            </div>
            <div className="flex" style={{ gap: "1.5vw", alignItems: "flex-start" }}>
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#4F39F6", marginTop: "1vh", flexShrink: 0 }} />
              <div style={{ fontSize: "2.1vw", fontFamily: "var(--font-body-family)", color: "#CBD5E1", lineHeight: 1.45 }}>
                Consecutive streak counter keeps momentum going
              </div>
            </div>
            <div className="flex" style={{ gap: "1.5vw", alignItems: "flex-start" }}>
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#4F39F6", marginTop: "1vh", flexShrink: 0 }} />
              <div style={{ fontSize: "2.1vw", fontFamily: "var(--font-body-family)", color: "#CBD5E1", lineHeight: 1.45 }}>
                Visual accountability without gamification clutter
              </div>
            </div>
          </div>
        </div>

        {/* Right: heatmap visual */}
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
              fontSize: "1.5vw",
              fontFamily: "var(--font-body-family)",
              color: "#475569",
              marginBottom: "2vh",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            4-week heatmap
          </div>
          {/* Simulated heatmap grid - 4 rows x 7 cols */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6vw" }}>
            <div style={{ display: "flex", gap: "0.6vw" }}>
              <div style={{ width: "2.5vw", height: "2.5vw", borderRadius: "0.4vw", background: "#1E293B" }} />
              <div style={{ width: "2.5vw", height: "2.5vw", borderRadius: "0.4vw", background: "#4F39F645" }} />
              <div style={{ width: "2.5vw", height: "2.5vw", borderRadius: "0.4vw", background: "#4F39F6" }} />
              <div style={{ width: "2.5vw", height: "2.5vw", borderRadius: "0.4vw", background: "#1E293B" }} />
              <div style={{ width: "2.5vw", height: "2.5vw", borderRadius: "0.4vw", background: "#4F39F680" }} />
              <div style={{ width: "2.5vw", height: "2.5vw", borderRadius: "0.4vw", background: "#4F39F6" }} />
              <div style={{ width: "2.5vw", height: "2.5vw", borderRadius: "0.4vw", background: "#4F39F645" }} />
            </div>
            <div style={{ display: "flex", gap: "0.6vw" }}>
              <div style={{ width: "2.5vw", height: "2.5vw", borderRadius: "0.4vw", background: "#4F39F6" }} />
              <div style={{ width: "2.5vw", height: "2.5vw", borderRadius: "0.4vw", background: "#4F39F6" }} />
              <div style={{ width: "2.5vw", height: "2.5vw", borderRadius: "0.4vw", background: "#4F39F680" }} />
              <div style={{ width: "2.5vw", height: "2.5vw", borderRadius: "0.4vw", background: "#4F39F6" }} />
              <div style={{ width: "2.5vw", height: "2.5vw", borderRadius: "0.4vw", background: "#1E293B" }} />
              <div style={{ width: "2.5vw", height: "2.5vw", borderRadius: "0.4vw", background: "#4F39F6" }} />
              <div style={{ width: "2.5vw", height: "2.5vw", borderRadius: "0.4vw", background: "#4F39F6" }} />
            </div>
            <div style={{ display: "flex", gap: "0.6vw" }}>
              <div style={{ width: "2.5vw", height: "2.5vw", borderRadius: "0.4vw", background: "#4F39F645" }} />
              <div style={{ width: "2.5vw", height: "2.5vw", borderRadius: "0.4vw", background: "#4F39F680" }} />
              <div style={{ width: "2.5vw", height: "2.5vw", borderRadius: "0.4vw", background: "#4F39F6" }} />
              <div style={{ width: "2.5vw", height: "2.5vw", borderRadius: "0.4vw", background: "#4F39F6" }} />
              <div style={{ width: "2.5vw", height: "2.5vw", borderRadius: "0.4vw", background: "#4F39F6" }} />
              <div style={{ width: "2.5vw", height: "2.5vw", borderRadius: "0.4vw", background: "#4F39F680" }} />
              <div style={{ width: "2.5vw", height: "2.5vw", borderRadius: "0.4vw", background: "#1E293B" }} />
            </div>
            <div style={{ display: "flex", gap: "0.6vw" }}>
              <div style={{ width: "2.5vw", height: "2.5vw", borderRadius: "0.4vw", background: "#4F39F6" }} />
              <div style={{ width: "2.5vw", height: "2.5vw", borderRadius: "0.4vw", background: "#4F39F6" }} />
              <div style={{ width: "2.5vw", height: "2.5vw", borderRadius: "0.4vw", background: "#4F39F6" }} />
              <div style={{ width: "2.5vw", height: "2.5vw", borderRadius: "0.4vw", background: "#4F39F645" }} />
              <div style={{ width: "2.5vw", height: "2.5vw", borderRadius: "0.4vw", background: "#4F39F680" }} />
              <div style={{ width: "2.5vw", height: "2.5vw", borderRadius: "0.4vw", background: "#4F39F6", border: "0.15vw solid #06B6D4" }} />
              <div style={{ width: "2.5vw", height: "2.5vw", borderRadius: "0.4vw", background: "#1E293B" }} />
            </div>
          </div>
          <div
            style={{
              marginTop: "2.5vh",
              fontSize: "1.5vw",
              fontFamily: "var(--font-body-family)",
              color: "#06B6D4",
              fontWeight: 500,
            }}
          >
            Today — keep the streak going
          </div>
        </div>
      </div>
    </div>
  );
}
