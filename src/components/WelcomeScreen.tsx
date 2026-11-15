import { Zap } from "lucide-react";
import { unlockAudio } from "@/lib/audio/audioContext";

export function WelcomeScreen({ onStart }: { onStart: () => void }) {
  const handleStart = async () => {
    try {
      await unlockAudio();
    } catch (e) {
      console.error("Audio unlock failed", e);
    }
    onStart();
  };

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden px-6 text-center text-white"
      style={{
        // थीम से अलग, दोनों मोड में एक जैसा गहरा रंगीन gradient (ताकि लिखावट साफ़ दिखे)
        background:
          "radial-gradient(30rem 24rem at 0% 0%, oklch(0.62 0.22 330 / 0.75), transparent 60%), radial-gradient(28rem 22rem at 100% 100%, oklch(0.7 0.15 210 / 0.6), transparent 60%), linear-gradient(160deg, oklch(0.36 0.17 280), oklch(0.44 0.2 300))",
      }}
    >
      <div className="mb-6 grid h-16 w-16 place-items-center rounded-2xl border border-white/25 bg-white/15 shadow-lg backdrop-blur-md">
        <Zap className="h-8 w-8" style={{ color: "var(--color-accent)" }} />
      </div>
      <h1 className="mb-2 text-2xl font-bold tracking-tight">RVUNL/DISCOM जूनियर असिस्टेंट ट्रैकर</h1>
      <p className="mb-10 text-sm opacity-80">आपका व्यक्तिगत स्मार्ट टाइम-टेबल</p>
      <button
        onClick={handleStart}
        className="rounded-xl border border-white/40 bg-white px-8 py-3.5 text-base font-bold text-[oklch(0.36_0.17_280)] shadow-lg transition-all active:scale-95 touch-tap"
      >
        आज की पढ़ाई शुरू करें
      </button>
    </div>
  );
}
