export default function Slide03PreparationGap() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0B0F1A" }}>
      {/* Accent bar */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{ height: "0.4vh", background: "linear-gradient(90deg, #4F39F6, #06B6D4)" }}
      />

      {/* Right side color block */}
      <div
        className="absolute top-0 right-0 bottom-0"
        style={{ width: "34vw", background: "#0D1120" }}
      />
      <div
        className="absolute top-0 right-0 bottom-0"
        style={{
          width: "34vw",
          background: "linear-gradient(135deg, #4F39F610 0%, #06B6D415 100%)",
        }}
      />

      {/* Content left */}
      <div
        className="absolute flex flex-col"
        style={{ top: "10vh", left: "7vw", width: "55vw" }}
      >
        {/* Eyebrow */}
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
          Problem
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
            marginBottom: "5vh",
          }}
        >
          The Preparation Gap
        </div>

        {/* Bullet list */}
        <div className="flex flex-col" style={{ gap: "2.8vh" }}>
          <div className="flex" style={{ gap: "1.5vw", alignItems: "flex-start" }}>
            <div
              style={{
                width: "0.6vw",
                height: "0.6vw",
                borderRadius: "50%",
                background: "#4F39F6",
                marginTop: "0.9vh",
                flexShrink: 0,
              }}
            />
            <div style={{ fontSize: "2.1vw", fontFamily: "var(--font-body-family)", color: "#CBD5E1", lineHeight: 1.45 }}>
              Standard coaching costs Rs 1–2 lakh per year
            </div>
          </div>
          <div className="flex" style={{ gap: "1.5vw", alignItems: "flex-start" }}>
            <div
              style={{
                width: "0.6vw",
                height: "0.6vw",
                borderRadius: "50%",
                background: "#4F39F6",
                marginTop: "0.9vh",
                flexShrink: 0,
              }}
            />
            <div style={{ fontSize: "2.1vw", fontFamily: "var(--font-body-family)", color: "#CBD5E1", lineHeight: 1.45 }}>
              Students in Tier-2/3 cities lack access to quality guidance
            </div>
          </div>
          <div className="flex" style={{ gap: "1.5vw", alignItems: "flex-start" }}>
            <div
              style={{
                width: "0.6vw",
                height: "0.6vw",
                borderRadius: "50%",
                background: "#4F39F6",
                marginTop: "0.9vh",
                flexShrink: 0,
              }}
            />
            <div style={{ fontSize: "2.1vw", fontFamily: "var(--font-body-family)", color: "#CBD5E1", lineHeight: 1.45 }}>
              No tool gives instant, examiner-grade feedback on written answers
            </div>
          </div>
          <div className="flex" style={{ gap: "1.5vw", alignItems: "flex-start" }}>
            <div
              style={{
                width: "0.6vw",
                height: "0.6vw",
                borderRadius: "50%",
                background: "#4F39F6",
                marginTop: "0.9vh",
                flexShrink: 0,
              }}
            />
            <div style={{ fontSize: "2.1vw", fontFamily: "var(--font-body-family)", color: "#CBD5E1", lineHeight: 1.45 }}>
              Quiz practice is static, not adaptive to your weak areas
            </div>
          </div>
        </div>
      </div>

      {/* Right side big text */}
      <div
        className="absolute flex flex-col justify-center items-center"
        style={{ top: 0, right: 0, width: "34vw", bottom: 0, padding: "0 3vw" }}
      >
        <div
          style={{
            fontSize: "6vw",
            fontFamily: "var(--font-display-family)",
            fontWeight: 800,
            background: "linear-gradient(180deg, #4F39F6, #06B6D4)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textAlign: "center",
            lineHeight: 1.1,
            marginBottom: "2vh",
          }}
        >
          Rs 1–2L
        </div>
        <div
          style={{
            fontSize: "1.7vw",
            fontFamily: "var(--font-body-family)",
            color: "#64748B",
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          annual coaching cost — out of reach for most aspirants
        </div>
      </div>
    </div>
  );
}
