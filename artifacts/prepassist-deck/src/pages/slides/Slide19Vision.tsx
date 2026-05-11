export default function Slide19Vision() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0B0F1A" }}>
      {/* Accent bar */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{ height: "0.4vh", background: "linear-gradient(90deg, #4F39F6, #06B6D4)" }}
      />

      {/* Large gradient circle background */}
      <div
        className="absolute"
        style={{
          right: "-15vw",
          top: "-15vh",
          width: "60vw",
          height: "60vw",
          borderRadius: "50%",
          background: "radial-gradient(circle, #4F39F618 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        className="absolute"
        style={{
          left: "-10vw",
          bottom: "-10vh",
          width: "40vw",
          height: "40vw",
          borderRadius: "50%",
          background: "radial-gradient(circle, #06B6D412 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        className="absolute flex flex-col justify-center"
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
            marginBottom: "3vh",
          }}
        >
          Vision
        </div>

        <div
          style={{
            fontSize: "3.8vw",
            fontFamily: "var(--font-display-family)",
            fontWeight: 800,
            color: "#F1F5F9",
            letterSpacing: "-0.025em",
            lineHeight: 1.2,
            marginBottom: "5vh",
            maxWidth: "78vw",
            textWrap: "balance",
          }}
        >
          Every UPSC aspirant — regardless of geography or income — gets the preparation infrastructure that only top rankers had access to before.
        </div>

        <div className="flex" style={{ gap: "4vw" }}>
          <div
            style={{
              fontSize: "2vw",
              fontFamily: "var(--font-display-family)",
              fontWeight: 700,
              background: "linear-gradient(90deg, #4F39F6, #5B8DEF)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            AI-native
          </div>
          <div style={{ fontSize: "2vw", color: "#1E293B", fontWeight: 700 }}>·</div>
          <div
            style={{
              fontSize: "2vw",
              fontFamily: "var(--font-display-family)",
              fontWeight: 700,
              background: "linear-gradient(90deg, #5B8DEF, #06B6D4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Mobile-first
          </div>
          <div style={{ fontSize: "2vw", color: "#1E293B", fontWeight: 700 }}>·</div>
          <div
            style={{
              fontSize: "2vw",
              fontFamily: "var(--font-display-family)",
              fontWeight: 700,
              background: "linear-gradient(90deg, #06B6D4, #4F39F6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Built for India's toughest exam
          </div>
        </div>
      </div>
    </div>
  );
}
