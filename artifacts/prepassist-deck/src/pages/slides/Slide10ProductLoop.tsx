const base = import.meta.env.BASE_URL;

export default function Slide10ProductLoop() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0B0F1A" }}>
      {/* Background image subtle */}
      <img
        src={`${base}flow-bg.png`}
        crossOrigin="anonymous"
        alt="Abstract flow"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.15 }}
      />

      {/* Accent bar */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{ height: "0.4vh", background: "linear-gradient(90deg, #4F39F6, #06B6D4)" }}
      />

      {/* Dark overlay */}
      <div className="absolute inset-0" style={{ background: "rgba(11,15,26,0.75)" }} />

      <div
        className="absolute flex flex-col justify-center items-center"
        style={{ top: 0, left: "7vw", right: "7vw", bottom: 0 }}
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
          The full loop
        </div>
        <div
          style={{
            fontSize: "4.2vw",
            fontFamily: "var(--font-display-family)",
            fontWeight: 800,
            color: "#F1F5F9",
            letterSpacing: "-0.025em",
            marginBottom: "6vh",
            textAlign: "center",
          }}
        >
          The Full Product Loop
        </div>

        {/* Flow steps */}
        <div className="flex items-center" style={{ gap: "1.2vw", flexWrap: "nowrap" }}>
          <div
            style={{
              background: "#111827",
              border: "0.1vw solid #4F39F650",
              borderRadius: "1vw",
              padding: "1.8vh 1.6vw",
              textAlign: "center",
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: "1.8vw", fontFamily: "var(--font-display-family)", fontWeight: 700, color: "#F1F5F9" }}>Upload</div>
            <div style={{ fontSize: "1.4vw", fontFamily: "var(--font-body-family)", color: "#64748B", marginTop: "0.5vh" }}>notes</div>
          </div>
          <div style={{ fontSize: "2.5vw", color: "#4F39F6", fontWeight: 700 }}>→</div>
          <div
            style={{
              background: "#111827",
              border: "0.1vw solid #5B8DEF50",
              borderRadius: "1vw",
              padding: "1.8vh 1.6vw",
              textAlign: "center",
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: "1.8vw", fontFamily: "var(--font-display-family)", fontWeight: 700, color: "#F1F5F9" }}>Chat</div>
            <div style={{ fontSize: "1.4vw", fontFamily: "var(--font-body-family)", color: "#64748B", marginTop: "0.5vh" }}>with Vault</div>
          </div>
          <div style={{ fontSize: "2.5vw", color: "#4F39F6", fontWeight: 700 }}>→</div>
          <div
            style={{
              background: "#111827",
              border: "0.1vw solid #06B6D450",
              borderRadius: "1vw",
              padding: "1.8vh 1.6vw",
              textAlign: "center",
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: "1.8vw", fontFamily: "var(--font-display-family)", fontWeight: 700, color: "#F1F5F9" }}>Write</div>
            <div style={{ fontSize: "1.4vw", fontFamily: "var(--font-body-family)", color: "#64748B", marginTop: "0.5vh" }}>an answer</div>
          </div>
          <div style={{ fontSize: "2.5vw", color: "#4F39F6", fontWeight: 700 }}>→</div>
          <div
            style={{
              background: "#111827",
              border: "0.1vw solid #06B6D450",
              borderRadius: "1vw",
              padding: "1.8vh 1.6vw",
              textAlign: "center",
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: "1.8vw", fontFamily: "var(--font-display-family)", fontWeight: 700, color: "#F1F5F9" }}>Evaluate</div>
            <div style={{ fontSize: "1.4vw", fontFamily: "var(--font-body-family)", color: "#64748B", marginTop: "0.5vh" }}>Mains AI</div>
          </div>
          <div style={{ fontSize: "2.5vw", color: "#4F39F6", fontWeight: 700 }}>→</div>
          <div
            style={{
              background: "#111827",
              border: "0.1vw solid #4F39F650",
              borderRadius: "1vw",
              padding: "1.8vh 1.6vw",
              textAlign: "center",
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: "1.8vw", fontFamily: "var(--font-display-family)", fontWeight: 700, color: "#F1F5F9" }}>Quiz</div>
            <div style={{ fontSize: "1.4vw", fontFamily: "var(--font-body-family)", color: "#64748B", marginTop: "0.5vh" }}>drill weak areas</div>
          </div>
          <div style={{ fontSize: "2.5vw", color: "#06B6D4", fontWeight: 700 }}>↺</div>
          <div
            style={{
              background: "linear-gradient(135deg, #4F39F620, #06B6D420)",
              border: "0.15vw solid #06B6D450",
              borderRadius: "1vw",
              padding: "1.8vh 1.6vw",
              textAlign: "center",
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: "1.8vw", fontFamily: "var(--font-display-family)", fontWeight: 700, color: "#06B6D4" }}>Repeat</div>
            <div style={{ fontSize: "1.4vw", fontFamily: "var(--font-body-family)", color: "#475569", marginTop: "0.5vh" }}>every day</div>
          </div>
        </div>
      </div>
    </div>
  );
}
