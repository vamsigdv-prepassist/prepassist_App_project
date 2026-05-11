export default function Slide04WhatItDoes() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0B0F1A" }}>
      {/* Accent bar */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{ height: "0.4vh", background: "linear-gradient(90deg, #4F39F6, #06B6D4)" }}
      />

      {/* Content */}
      <div
        className="absolute flex flex-col justify-center"
        style={{ top: 0, left: "7vw", right: "7vw", bottom: 0 }}
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
          Solution
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "4.5vw",
            fontFamily: "var(--font-display-family)",
            fontWeight: 800,
            color: "#F1F5F9",
            letterSpacing: "-0.025em",
            lineHeight: 1.05,
            marginBottom: "2vh",
          }}
        >
          What PrepAssist Does
        </div>

        <div
          style={{
            fontSize: "2vw",
            fontFamily: "var(--font-body-family)",
            color: "#94A3B8",
            marginBottom: "5vh",
          }}
        >
          Four AI modules working together on your phone
        </div>

        {/* Four modules grid */}
        <div className="flex" style={{ gap: "2.5vw" }}>
          {/* Vault */}
          <div
            style={{
              flex: 1,
              background: "#111827",
              borderRadius: "1.2vw",
              padding: "3vh 2vw",
              borderTop: "0.3vh solid #4F39F6",
            }}
          >
            <div
              style={{
                fontSize: "2.6vw",
                fontFamily: "var(--font-display-family)",
                fontWeight: 800,
                color: "#F1F5F9",
                marginBottom: "1.2vh",
              }}
            >
              Vault
            </div>
            <div style={{ fontSize: "1.7vw", fontFamily: "var(--font-body-family)", color: "#64748B", lineHeight: 1.4 }}>
              AI document store — chat with your notes
            </div>
          </div>

          {/* Mains AI */}
          <div
            style={{
              flex: 1,
              background: "#111827",
              borderRadius: "1.2vw",
              padding: "3vh 2vw",
              borderTop: "0.3vh solid #5B8DEF",
            }}
          >
            <div
              style={{
                fontSize: "2.6vw",
                fontFamily: "var(--font-display-family)",
                fontWeight: 800,
                color: "#F1F5F9",
                marginBottom: "1.2vh",
              }}
            >
              Mains AI
            </div>
            <div style={{ fontSize: "1.7vw", fontFamily: "var(--font-body-family)", color: "#64748B", lineHeight: 1.4 }}>
              Essay evaluator with examiner-grade rubric
            </div>
          </div>

          {/* Quiz Engine */}
          <div
            style={{
              flex: 1,
              background: "#111827",
              borderRadius: "1.2vw",
              padding: "3vh 2vw",
              borderTop: "0.3vh solid #06B6D4",
            }}
          >
            <div
              style={{
                fontSize: "2.6vw",
                fontFamily: "var(--font-display-family)",
                fontWeight: 800,
                color: "#F1F5F9",
                marginBottom: "1.2vh",
              }}
            >
              Quiz Engine
            </div>
            <div style={{ fontSize: "1.7vw", fontFamily: "var(--font-body-family)", color: "#64748B", lineHeight: 1.4 }}>
              Adaptive prelims MCQs from any topic
            </div>
          </div>

          {/* Study Streak */}
          <div
            style={{
              flex: 1,
              background: "#111827",
              borderRadius: "1.2vw",
              padding: "3vh 2vw",
              borderTop: "0.3vh solid #06B6D4",
            }}
          >
            <div
              style={{
                fontSize: "2.6vw",
                fontFamily: "var(--font-display-family)",
                fontWeight: 800,
                color: "#F1F5F9",
                marginBottom: "1.2vh",
              }}
            >
              Streak
            </div>
            <div style={{ fontSize: "1.7vw", fontFamily: "var(--font-body-family)", color: "#64748B", lineHeight: 1.4 }}>
              Study habit tracker with heatmap calendar
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: "4vh",
            fontSize: "1.8vw",
            fontFamily: "var(--font-body-family)",
            fontWeight: 500,
            color: "#06B6D4",
          }}
        >
          All powered by GPT-class AI — free from your pocket
        </div>
      </div>
    </div>
  );
}
