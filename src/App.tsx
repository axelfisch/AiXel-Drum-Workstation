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
      <h1 className="font-display mt-2 text-center text-4xl font-medium tracking-[0.04em] text-balance md:text-6xl">
        Drum Workstation
      </h1>
      <div className="hw-panel hw-panel--screws mt-8 w-full max-w-xl overflow-hidden">
        <img
          src="/og.jpg"
          alt="AiXel Drum Workstation"
          className="block h-auto w-full object-cover"
          width={1200}
          height={630}
        />
      </div>
      <p className="mt-6 max-w-md text-center text-sm leading-relaxed text-muted text-pretty">
        Sixteen voices. Thirty-two steps. Groove, mixer, fills and song mode — a studio drum instrument in the
        browser.
      </p>
      <button type="button" disabled={pending} onClick={onArm} className="hw-btn on mt-8 px-8 py-3 text-sm">
        Arm Engine
      </button>
      <p className="mt-6 engraved">Play · Stop · Rec · Pads 1–8 / Q–I</p>
    </main>
  );
}
