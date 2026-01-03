import React, { useEffect, useState, useRef } from 'react';

interface BootScreenProps {
  onComplete: () => void;
  logs?: string[];
}

export const BootScreen: React.FC<BootScreenProps> = ({ onComplete, logs }) => {
  const [lines, setLines] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const defaultLogs = [
      "BIOS DATE 01/01/2026 00:00:01 VER 2.1.0",
      "CPU: NETSEC QUANTUM CORE, SPEED: UNLIMITED",
      "RAM: 64GB DETECTED. OK.",
      "INITIALIZING VIDEO ADAPTER... OK",
      "LOADING KERNEL...",
      "MOUNTING VIRTUAL FILE SYSTEM...",
      "CHECKING DISK INTEGRITY... 100%",
      "LOADING DRIVERS: [TERMINAL] [NETWORK] [AI_CORE]",
      "ESTABLISHING SECURE CONNECTION...",
      "SYSTEM READY."
    ];

    const sequence = logs || defaultLogs;
    let timeouts: NodeJS.Timeout[] = [];
    let accumulatedDelay = 0;

    sequence.forEach((line, index) => {
        // Variable delay for realism
        const delay = Math.random() * 100 + 50;
        accumulatedDelay += delay;
        
        const t = setTimeout(() => {
            setLines(prev => [...prev, line]);
            
            // Auto scroll to bottom
            if(scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
            
            // Finish sequence
            if (index === sequence.length - 1) {
                // Add the requested 2 second delay before completing
                setTimeout(() => {
                   onComplete();
                }, 2000);
            }
        }, accumulatedDelay);
        timeouts.push(t);
    });

    return () => timeouts.forEach(clearTimeout);
  }, [logs, onComplete]);

  return (
      <div className="h-screen w-full bg-black p-4 md:p-8 font-mono text-[#33ff00] text-lg md:text-xl flex flex-col justify-end z-[100] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-[101] bg-[length:100%_2px,3px_100%]"></div>
          <div ref={scrollRef} className="overflow-hidden flex flex-col justify-end h-full">
            {lines.map((l, i) => <div key={i} className="mb-1 leading-none">{l}</div>)}
            <div className="animate-pulse mt-2">_</div>
          </div>
      </div>
  );
};