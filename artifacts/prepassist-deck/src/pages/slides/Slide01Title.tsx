const base = import.meta.env.BASE_URL;

export default function Slide01Title() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0B0F1A" }}>
      {/* Hero image full bleed */}
      <img
        src={`${base}hero.png`}
        crossOrigin="anonymous"
        alt="Student studying at night"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.45 }}
      />
      {/* Gradient overlay — dark left panel */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(100deg, #0B0F1A 42%, transparent 80%)",
        }}
      />
      {/* Bottom fade */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to top, #0B0F1A 0%, transparent 40%)",
        }}
      />

      {/* Brand accent bar */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{
          height: "0.4vh",
          background: "linear-gradient(90deg, #4F39F6, #06B6D4)",
        }}
      />

      {/* Content */}
      <div
        className="absolute flex flex-col justify-center"
        style={{ top: "12vh", left: "7vw", width: "48vw", bottom: "10vh" }}
      >
        {/* Eyebrow */}
        <div
          style={{
            fontSize: "1.6vw",
            fontFamily: "var(--font-body-family)",
            fontWeight: 500,
            color: "#06B6D4",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            marginBottom: "2.5vh",
          }}
        >
          Product Overview · 2026
        </div>

        {/* Wordmark */}
        <div
          style={{
            fontSize: "8vw",
            fontFamily: "var(--font-display-family)",
            fontWeight: 800,
            color: "#F1F5F9",
            letterSpacing: "-0.03em",
            lineHeight: 0.95,
            marginBottom: "3.5vh",
          }}
        >
          Prep
          <span
            style={{
              background: "linear-gradient(90deg, #4F39F6, #06B6D4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Assist
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: "2.2vw",
            fontFamily: "var(--font-body-family)",
            fontWeight: 400,
            color: "#CBD5E1",
            lineHeight: 1.45,
            marginBottom: "5vh",
            textWrap: "balance",
          }}
        >
          AI-powered UPSC exam preparation companion
        </div>

        {/* Sub-tagline */}
        <div
          style={{
            fontSize: "1.8vw",
            fontFamily: "var(--font-display-family)",
            fontWeight: 700,
            color: "#4F39F6",
            letterSpacing: "0.04em",
          }}
        >
          Study smarter. Score higher.
        </div>
      </div>

      {/* Bottom-right badge */}
      <div
        className="absolute"
        style={{ bottom: "5vh", right: "5vw", textAlign: "right" }}
      >
        <div
          style={{
            fontSize: "1.4vw",
            fontFamily: "var(--font-body-family)",
            fontWeight: 400,
            color: "#475569",
          }}
        >
          prepassist.in
        </div>
      </div>
    </div>
  );
}
