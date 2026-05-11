export default function Slide02UPSCChallenge() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0B0F1A" }}>
      {/* Accent bar */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{ height: "0.4vh", background: "linear-gradient(90deg, #4F39F6, #06B6D4)" }}
      />

      {/* Large background numeral */}
      <div
        className="absolute"
        style={{
          right: "-2vw",
          top: "8vh",
          fontSize: "38vw",
          fontFamily: "var(--font-display-family)",
          fontWeight: 800,
          color: "#4F39F6",
          opacity: 0.04,
          lineHeight: 1,
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        1M
      </div>

      {/* Content */}
      <div
        className="absolute flex flex-col"
        style={{ top: "10vh", left: "7vw", right: "7vw" }}
      >
        {/* Eyebrow */}
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
          Context
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "4.8vw",
            fontFamily: "var(--font-display-family)",
            fontWeight: 800,
            color: "#F1F5F9",
            letterSpacing: "-0.025em",
            lineHeight: 1.05,
            marginBottom: "6vh",
            textWrap: "balance",
          }}
        >
          The UPSC Challenge
        </div>

        {/* Stats row */}
        <div className="flex" style={{ gap: "4vw", marginBottom: "6vh" }}>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: "5.5vw",
                fontFamily: "var(--font-display-family)",
                fontWeight: 800,
                background: "linear-gradient(90deg, #4F39F6, #06B6D4)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                lineHeight: 1,
                marginBottom: "0.8vh",
              }}
            >
              1M+
            </div>
            <div style={{ fontSize: "1.8vw", fontFamily: "var(--font-body-family)", color: "#94A3B8" }}>
              candidates per year
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: "5.5vw",
                fontFamily: "var(--font-display-family)",
                fontWeight: 800,
                background: "linear-gradient(90deg, #4F39F6, #06B6D4)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                lineHeight: 1,
                marginBottom: "0.8vh",
              }}
            >
              0.1%
            </div>
            <div style={{ fontSize: "1.8vw", fontFamily: "var(--font-body-family)", color: "#94A3B8" }}>
              selection rate
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: "5.5vw",
                fontFamily: "var(--font-display-family)",
                fontWeight: 800,
                background: "linear-gradient(90deg, #4F39F6, #06B6D4)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                lineHeight: 1,
                marginBottom: "0.8vh",
              }}
            >
              8–12h
            </div>
            <div style={{ fontSize: "1.8vw", fontFamily: "var(--font-body-family)", color: "#94A3B8" }}>
              daily study, 2–3 years
            </div>
          </div>
        </div>

        {/* Single insight */}
        <div
          style={{
            borderLeft: "0.3vw solid #4F39F6",
            paddingLeft: "2vw",
            maxWidth: "60vw",
          }}
        >
          <div
            style={{
              fontSize: "2.2vw",
              fontFamily: "var(--font-body-family)",
              fontWeight: 400,
              color: "#CBD5E1",
              lineHeight: 1.5,
            }}
          >
            Fragmented resources, no personalised feedback loop — candidates navigate the toughest exam in India largely alone.
          </div>
        </div>
      </div>
    </div>
  );
}
