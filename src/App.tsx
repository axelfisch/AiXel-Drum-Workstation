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
    <main className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 py-10 text-fg">
      <div className="hw-panel hw-panel--screws w-full max-w-lg overflow-hidden rounded-2xl p-2">
        <img
          src="/logo.png"
          alt="AiXel Drum Workstation"
          className="mx-auto block h-auto w-full max-w-md object-contain"
          width={900}
          height={900}
        />
      </div>

      <p className="font-display mt-8 text-center text-[11px] tracking-[0.42em] text-led uppercase">AiXel Studio</p>
      <h1 className="font-display mt-2 text-center text-3xl font-medium tracking-[0.06em] text-balance md:text-5xl">
        Drum Workstation
      </h1>
      <p className="mt-4 max-w-md text-center text-sm leading-relaxed text-muted text-pretty">
        Sixteen voices. Groove, mixer, fills and song mode — a studio drum instrument in the browser.
        Native VST3 Phase&nbsp;1 (macOS arm64) is scaffolded for Cubase.
      </p>

      <button type="button" disabled={pending} onClick={onArm} className="hw-btn on mt-8 px-8 py-3 text-sm">
        Arm Engine
      </button>
      <p className="mt-6 engraved text-center">Play · Stop · Rec · Pads 1–8 / Q–I · Esc exits Focus</p>
      <p className="mt-3 text-center text-[10px] tracking-wide text-subtle uppercase">
        Web edition · Native VST3 scaffold in <span className="font-mono normal-case tracking-normal">native/</span>
      </p>
    </main>
  );
}
