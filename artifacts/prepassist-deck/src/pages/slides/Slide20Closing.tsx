const base = import.meta.env.BASE_URL;

export default function Slide20Closing() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0B0F1A" }}>
      {/* Hero image */}
      <img
        src={`${base}hero.png`}
        crossOrigin="anonymous"
        alt="Student studying"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.3 }}
      />

      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(100deg, #0B0F1A 50%, transparent 90%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to top, #0B0F1A 0%, transparent 50%)",
        }}
      />

      {/* Accent bar */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{ height: "0.4vh", background: "linear-gradient(90deg, #4F39F6, #06B6D4)" }}
      />

      {/* Content */}
      <div
        className="absolute flex flex-col justify-center"
        style={{ top: 0, left: "7vw", width: "52vw", bottom: 0 }}
      >
        {/* Wordmark */}
        <div
          style={{
            fontSize: "7vw",
            fontFamily: "var(--font-display-family)",
            fontWeight: 800,
            color: "#F1F5F9",
            letterSpacing: "-0.03em",
            lineHeight: 0.95,
            marginBottom: "3vh",
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

        <div
          style={{
            fontSize: "2.2vw",
            fontFamily: "var(--font-body-family)",
            color: "#94A3B8",
            marginBottom: "5vh",
            lineHeight: 1.45,
          }}
        >
          AI-powered UPSC preparation companion
        </div>

        <div
          style={{
            width: "4vw",
            height: "0.3vh",
            background: "linear-gradient(90deg, #4F39F6, #06B6D4)",
            borderRadius: "0.2vw",
            marginBottom: "4vh",
          }}
        />

        <div
          style={{
            fontSize: "2vw",
            fontFamily: "var(--font-body-family)",
            fontWeight: 500,
            color: "#F1F5F9",
            marginBottom: "1.5vh",
          }}
        >
          prepassist.in
        </div>

        <div
          style={{
            fontSize: "1.6vw",
            fontFamily: "var(--font-body-family)",
            color: "#475569",
          }}
        >
          Built with Expo · OpenAI · React Native
        </div>
      </div>
    </div>
  );
}
