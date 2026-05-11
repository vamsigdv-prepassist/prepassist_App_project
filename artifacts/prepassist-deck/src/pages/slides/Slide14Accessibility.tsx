export default function Slide14Accessibility() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0B0F1A" }}>
      {/* Accent bar */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{ height: "0.4vh", background: "linear-gradient(90deg, #4F39F6, #06B6D4)" }}
      />

      {/* Right color block */}
      <div
        className="absolute top-0 right-0 bottom-0"
        style={{ width: "36vw", background: "#0D1120" }}
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
            Reach
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
            Accessibility
          </div>
          <div className="flex flex-col" style={{ gap: "2.5vh" }}>
            <div className="flex" style={{ gap: "1.5vw", alignItems: "flex-start" }}>
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#06B6D4", marginTop: "1vh", flexShrink: 0 }} />
              <div style={{ fontSize: "2.1vw", fontFamily: "var(--font-body-family)", color: "#CBD5E1", lineHeight: 1.45 }}>
                Works on Expo Go — no custom build required
              </div>
            </div>
            <div className="flex" style={{ gap: "1.5vw", alignItems: "flex-start" }}>
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#06B6D4", marginTop: "1vh", flexShrink: 0 }} />
              <div style={{ fontSize: "2.1vw", fontFamily: "var(--font-body-family)", color: "#CBD5E1", lineHeight: 1.45 }}>
                Camera falls back to file picker on web
              </div>
            </div>
            <div className="flex" style={{ gap: "1.5vw", alignItems: "flex-start" }}>
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#06B6D4", marginTop: "1vh", flexShrink: 0 }} />
              <div style={{ fontSize: "2.1vw", fontFamily: "var(--font-body-family)", color: "#CBD5E1", lineHeight: 1.45 }}>
                Offline data via AsyncStorage — no login required
              </div>
            </div>
            <div className="flex" style={{ gap: "1.5vw", alignItems: "flex-start" }}>
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#06B6D4", marginTop: "1vh", flexShrink: 0 }} />
              <div style={{ fontSize: "2.1vw", fontFamily: "var(--font-body-family)", color: "#CBD5E1", lineHeight: 1.45 }}>
                Runs on mid-range Android devices
              </div>
            </div>
          </div>
        </div>

        {/* Right: platforms */}
        <div className="flex flex-col justify-center items-center" style={{ flex: 1, gap: "3vh" }}>
          <div
            style={{
              fontSize: "1.5vw",
              fontFamily: "var(--font-body-family)",
              color: "#475569",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Platforms
          </div>
          <div
            style={{
              fontSize: "2.4vw",
              fontFamily: "var(--font-display-family)",
              fontWeight: 700,
              color: "#F1F5F9",
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            iOS
          </div>
          <div style={{ width: "0.1vw", height: "2vh", background: "#1E293B" }} />
          <div
            style={{
              fontSize: "2.4vw",
              fontFamily: "var(--font-display-family)",
              fontWeight: 700,
              color: "#F1F5F9",
              textAlign: "center",
            }}
          >
            Android
          </div>
          <div style={{ width: "0.1vw", height: "2vh", background: "#1E293B" }} />
          <div
            style={{
              fontSize: "2.4vw",
              fontFamily: "var(--font-display-family)",
              fontWeight: 700,
              color: "#F1F5F9",
              textAlign: "center",
            }}
          >
            Web
          </div>
          <div
            style={{
              marginTop: "2vh",
              fontSize: "1.5vw",
              fontFamily: "var(--font-body-family)",
              color: "#06B6D4",
              textAlign: "center",
            }}
          >
            One codebase · Zero paywall
          </div>
        </div>
      </div>
    </div>
  );
}
