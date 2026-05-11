export default function Slide18Roadmap() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0B0F1A" }}>
      {/* Accent bar */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{ height: "0.4vh", background: "linear-gradient(90deg, #4F39F6, #06B6D4)" }}
      />

      <div
        className="absolute flex"
        style={{ top: "10vh", left: "7vw", right: "7vw", bottom: "8vh", gap: "6vw" }}
      >
        {/* Left: title */}
        <div className="flex flex-col" style={{ flex: "0 0 32vw" }}>
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
            What's Next
          </div>
          <div
            style={{
              fontSize: "4.8vw",
              fontFamily: "var(--font-display-family)",
              fontWeight: 800,
              color: "#F1F5F9",
              letterSpacing: "-0.025em",
              lineHeight: 1.05,
            }}
          >
            Roadmap
          </div>
        </div>

        {/* Right: two phases */}
        <div className="flex flex-col" style={{ flex: 1, gap: "4vh" }}>
          {/* Near term */}
          <div
            style={{
              background: "#111827",
              borderRadius: "1.2vw",
              padding: "3vh 2.5vw",
              borderTop: "0.3vh solid #4F39F6",
            }}
          >
            <div
              style={{
                fontSize: "1.5vw",
                fontFamily: "var(--font-body-family)",
                fontWeight: 500,
                color: "#4F39F6",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: "2vh",
              }}
            >
              Near term
            </div>
            <div className="flex flex-col" style={{ gap: "1.5vh" }}>
              <div className="flex" style={{ gap: "1.2vw", alignItems: "flex-start" }}>
                <div style={{ width: "0.4vw", height: "0.4vw", borderRadius: "50%", background: "#4F39F6", marginTop: "1.1vh", flexShrink: 0 }} />
                <div style={{ fontSize: "1.9vw", fontFamily: "var(--font-body-family)", color: "#CBD5E1" }}>Offline quiz caching and sync</div>
              </div>
              <div className="flex" style={{ gap: "1.2vw", alignItems: "flex-start" }}>
                <div style={{ width: "0.4vw", height: "0.4vw", borderRadius: "50%", background: "#4F39F6", marginTop: "1.1vh", flexShrink: 0 }} />
                <div style={{ fontSize: "1.9vw", fontFamily: "var(--font-body-family)", color: "#CBD5E1" }}>Push notifications for streak reminders</div>
              </div>
              <div className="flex" style={{ gap: "1.2vw", alignItems: "flex-start" }}>
                <div style={{ width: "0.4vw", height: "0.4vw", borderRadius: "50%", background: "#4F39F6", marginTop: "1.1vh", flexShrink: 0 }} />
                <div style={{ fontSize: "1.9vw", fontFamily: "var(--font-body-family)", color: "#CBD5E1" }}>Answer comparison against previous attempts</div>
              </div>
            </div>
          </div>

          {/* Longer term */}
          <div
            style={{
              background: "#111827",
              borderRadius: "1.2vw",
              padding: "3vh 2.5vw",
              borderTop: "0.3vh solid #06B6D4",
            }}
          >
            <div
              style={{
                fontSize: "1.5vw",
                fontFamily: "var(--font-body-family)",
                fontWeight: 500,
                color: "#06B6D4",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: "2vh",
              }}
            >
              Longer term
            </div>
            <div className="flex flex-col" style={{ gap: "1.5vh" }}>
              <div className="flex" style={{ gap: "1.2vw", alignItems: "flex-start" }}>
                <div style={{ width: "0.4vw", height: "0.4vw", borderRadius: "50%", background: "#06B6D4", marginTop: "1.1vh", flexShrink: 0 }} />
                <div style={{ fontSize: "1.9vw", fontFamily: "var(--font-body-family)", color: "#CBD5E1" }}>Community answer bank</div>
              </div>
              <div className="flex" style={{ gap: "1.2vw", alignItems: "flex-start" }}>
                <div style={{ width: "0.4vw", height: "0.4vw", borderRadius: "50%", background: "#06B6D4", marginTop: "1.1vh", flexShrink: 0 }} />
                <div style={{ fontSize: "1.9vw", fontFamily: "var(--font-body-family)", color: "#CBD5E1" }}>Mock interview module</div>
              </div>
              <div className="flex" style={{ gap: "1.2vw", alignItems: "flex-start" }}>
                <div style={{ width: "0.4vw", height: "0.4vw", borderRadius: "50%", background: "#06B6D4", marginTop: "1.1vh", flexShrink: 0 }} />
                <div style={{ fontSize: "1.9vw", fontFamily: "var(--font-body-family)", color: "#CBD5E1" }}>Regional language support</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
