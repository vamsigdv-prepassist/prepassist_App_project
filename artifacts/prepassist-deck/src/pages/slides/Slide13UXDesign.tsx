export default function Slide13UXDesign() {
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
          Design
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
          User Experience Design
        </div>

        <div className="flex" style={{ gap: "2.5vw" }}>
          <div
            style={{
              flex: 1,
              background: "#111827",
              borderRadius: "1.2vw",
              padding: "3vh 2vw",
            }}
          >
            <div
              style={{
                width: "3.5vw",
                height: "0.4vh",
                background: "linear-gradient(90deg, #4F39F6, #06B6D4)",
                borderRadius: "0.2vw",
                marginBottom: "2vh",
              }}
            />
            <div style={{ fontSize: "2.2vw", fontFamily: "var(--font-display-family)", fontWeight: 700, color: "#F1F5F9", marginBottom: "1.2vh" }}>
              Native Tabs
            </div>
            <div style={{ fontSize: "1.7vw", fontFamily: "var(--font-body-family)", color: "#64748B", lineHeight: 1.5 }}>
              iOS 26 liquid-glass tabs on supported devices, classic fallback on older OS and web
            </div>
          </div>

          <div
            style={{
              flex: 1,
              background: "#111827",
              borderRadius: "1.2vw",
              padding: "3vh 2vw",
            }}
          >
            <div
              style={{
                width: "3.5vw",
                height: "0.4vh",
                background: "linear-gradient(90deg, #5B8DEF, #06B6D4)",
                borderRadius: "0.2vw",
                marginBottom: "2vh",
              }}
            />
            <div style={{ fontSize: "2.2vw", fontFamily: "var(--font-display-family)", fontWeight: 700, color: "#F1F5F9", marginBottom: "1.2vh" }}>
              Haptic Feedback
            </div>
            <div style={{ fontSize: "1.7vw", fontFamily: "var(--font-body-family)", color: "#64748B", lineHeight: 1.5 }}>
              Tactile confirmation on key interactions for a polished, physical feel
            </div>
          </div>

          <div
            style={{
              flex: 1,
              background: "#111827",
              borderRadius: "1.2vw",
              padding: "3vh 2vw",
            }}
          >
            <div
              style={{
                width: "3.5vw",
                height: "0.4vh",
                background: "linear-gradient(90deg, #4F39F6, #5B8DEF)",
                borderRadius: "0.2vw",
                marginBottom: "2vh",
              }}
            />
            <div style={{ fontSize: "2.2vw", fontFamily: "var(--font-display-family)", fontWeight: 700, color: "#F1F5F9", marginBottom: "1.2vh" }}>
              Brand Gradient
            </div>
            <div style={{ fontSize: "1.7vw", fontFamily: "var(--font-body-family)", color: "#64748B", lineHeight: 1.5 }}>
              Indigo → cyan throughout — cohesive visual language from home screen to quiz results
            </div>
          </div>

          <div
            style={{
              flex: 1,
              background: "#111827",
              borderRadius: "1.2vw",
              padding: "3vh 2vw",
            }}
          >
            <div
              style={{
                width: "3.5vw",
                height: "0.4vh",
                background: "linear-gradient(90deg, #06B6D4, #4F39F6)",
                borderRadius: "0.2vw",
                marginBottom: "2vh",
              }}
            />
            <div style={{ fontSize: "2.2vw", fontFamily: "var(--font-display-family)", fontWeight: 700, color: "#F1F5F9", marginBottom: "1.2vh" }}>
              One-handed Use
            </div>
            <div style={{ fontSize: "1.7vw", fontFamily: "var(--font-body-family)", color: "#64748B", lineHeight: 1.5 }}>
              Designed for commute study sessions — all key actions reachable with a thumb
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
