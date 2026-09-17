import { useEffect, useState } from "react";
import { audioEngine } from "@/engine/audio-engine";
import { Workstation } from "@/components/workstation/Workstation";

export default function App() {
  const [booted, setBooted] = useState(false);
  const [client, setClient] = useState(false);

  useEffect(() => {
    setClient(true);
  }, []);

  if (!client) {
    return <Splash onArm={() => undefined} pending />;
  }

  if (!booted) {
    return (
      <Splash
        onArm={async () => {
          await audioEngine.init();
          setBooted(true);
        }}
      />
    );
  }

  return <Workstation />;
}

function Splash({ onArm, pending }: { onArm: () => void; pending?: boolean }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 text-fg">
      <p className="font-display text-[11px] tracking-[0.42em] text-muted uppercase">AiXel</p>
      <h1 className="font-display mt-2 text-center text-4xl font-semibold tracking-[0.08em] text-balance md:text-6xl">
        Drum Workstation
      </h1>
      <p className="mt-4 max-w-md text-center text-sm leading-relaxed text-muted text-pretty">
        Sixteen voices. Thirty-two steps. Groove, mixer, fills and song mode — a studio drum instrument in the browser.
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={onArm}
        className="mt-8 rounded-lg bg-fg px-8 py-3 font-display text-sm tracking-[0.22em] text-bg uppercase disabled:opacity-40"
      >
        Arm Engine
      </button>
      <p className="mt-6 text-[11px] tracking-widest text-subtle uppercase">Play · Stop · Pads 1–8 / Q–I</p>
      <p className="mt-3 text-[10px] tracking-widest text-subtle uppercase">Web V1 · VST3/AU port planned</p>
    </main>
  );
}
