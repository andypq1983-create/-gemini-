import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

import * as THREE from 'three';

import { motion, AnimatePresence, useSpring, useMotionValue, useTransform, useInView, useMotionTemplate } from 'framer-motion';

import { Menu, X, Github, Twitter, Linkedin, ExternalLink, Code, Database, Cpu } from 'lucide-react';



// --- 0. 全局样式注入 ---

const globalStyles = `

  /* 故障与乱码特效 */

  .glitch-text:hover {

    animation: glitch-skew 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) both infinite;

    text-shadow: 2px 0px 0px rgba(255,0,0,0.8), -2px 0px 0px rgba(0,255,255,0.8);

  }

  @keyframes glitch-skew {

    0% { transform: skew(0deg); }

    20% { transform: skew(-2deg) translateX(-1px); }

    40% { transform: skew(2deg) translateX(1px); }

    60% { transform: skew(-1deg) translateX(-0.5px); }

    80% { transform: skew(1deg) translateX(0.5px); }

    100% { transform: skew(0deg); }

  }

  .glitch-image-hover:hover {

    animation: glitch-img-anim 0.25s ease-out forwards;

    filter: contrast(120%) saturate(120%);

  }

  @keyframes glitch-img-anim {

    0% { transform: scale(1.05) translateX(0); filter: drop-shadow(0 0 0 transparent); }

    20% { transform: scale(1.05) translateX(-2px); filter: drop-shadow(-3px 0 0 rgba(255,0,0,0.5)) drop-shadow(3px 0 0 rgba(0,255,255,0.5)); }

    40% { transform: scale(1.05) translateX(2px); filter: drop-shadow(3px 0 0 rgba(255,0,0,0.5)) drop-shadow(-3px 0 0 rgba(0,255,255,0.5)); }

    100% { transform: scale(1.05) translateX(0); filter: drop-shadow(0 0 0 transparent); }

  }

  .film-grain {

    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");

    animation: noise-anim 0.2s infinite steps(2);

  }

  @keyframes noise-anim {

    0% { background-position: 0 0; }

    100% { background-position: 100% 100%; }

  }



  /* --- Border Glow 组件核心 CSS --- */

  .border-glow-card {

    --edge-proximity: 0;

    --cursor-angle: 45deg;

    --edge-sensitivity: 40;

    --color-sensitivity: calc(var(--edge-sensitivity) + 20);

    --border-radius: 20px;

    --glow-padding: 40px;

    --cone-spread: 25;



    position: relative;

    border-radius: var(--border-radius);

    isolation: isolate;

    transform: translate3d(0, 0, 0.01px);

    display: flex;

    flex-direction: column;

    background: var(--card-bg, #050505);

    overflow: visible;

  }



  .border-glow-card::before,

  .border-glow-card::after,

  .border-glow-card > .edge-light {

    content: "";

    position: absolute;

    inset: 0;

    border-radius: inherit;

    transition: opacity 0.25s ease-out;

    z-index: -1;

  }



  .border-glow-card:not(:hover):not(.sweep-active)::before,

  .border-glow-card:not(:hover):not(.sweep-active)::after,

  .border-glow-card:not(:hover):not(.sweep-active) > .edge-light {

    opacity: 0;

    transition: opacity 0.75s ease-in-out;

  }



  .border-glow-card::before {

    border: 1px solid transparent;

    background:

      linear-gradient(var(--card-bg, #050505) 0 100%) padding-box,

      linear-gradient(rgb(255 255 255 / 0%) 0% 100%) border-box,

      var(--gradient-one) border-box, var(--gradient-two) border-box,

      var(--gradient-three) border-box, var(--gradient-four) border-box,

      var(--gradient-five) border-box, var(--gradient-six) border-box,

      var(--gradient-seven) border-box, var(--gradient-base) border-box;



    opacity: calc((var(--edge-proximity) - var(--color-sensitivity)) / (100 - var(--color-sensitivity)));

    mask-image: conic-gradient(from var(--cursor-angle) at center, black calc(var(--cone-spread) * 1%), transparent calc((var(--cone-spread) + 15) * 1%), transparent calc((100 - var(--cone-spread) - 15) * 1%), black calc((100 - var(--cone-spread)) * 1%));

  }



  .border-glow-card::after {

    border: 1px solid transparent;

    background:

      var(--gradient-one) padding-box, var(--gradient-two) padding-box,

      var(--gradient-three) padding-box, var(--gradient-four) padding-box,

      var(--gradient-five) padding-box, var(--gradient-six) padding-box,

      var(--gradient-seven) padding-box, var(--gradient-base) padding-box;



    mask-image: linear-gradient(to bottom, black, black), radial-gradient(ellipse at 50% 50%, black 40%, transparent 65%), radial-gradient(ellipse at 66% 66%, black 5%, transparent 40%), radial-gradient(ellipse at 33% 33%, black 5%, transparent 40%), radial-gradient(ellipse at 66% 33%, black 5%, transparent 40%), radial-gradient(ellipse at 33% 66%, black 5%, transparent 40%), conic-gradient(from var(--cursor-angle) at center, transparent 5%, black 15%, black 85%, transparent 95%);

    mask-composite: subtract, add, add, add, add, add;

    opacity: calc(var(--fill-opacity, 0.5) * (var(--edge-proximity) - var(--color-sensitivity)) / (100 - var(--color-sensitivity)));

    mix-blend-mode: screen;

  }



  .border-glow-card > .edge-light {

    inset: calc(var(--glow-padding) * -1);

    pointer-events: none;

    z-index: 1;

    mask-image: conic-gradient(from var(--cursor-angle) at center, black 2.5%, transparent 10%, transparent 90%, black 97.5%);

    opacity: calc((var(--edge-proximity) - var(--edge-sensitivity)) / (100 - var(--edge-sensitivity)));

    mix-blend-mode: plus-lighter;

  }



  .border-glow-card > .edge-light::before {

    content: ""; position: absolute; inset: var(--glow-padding); border-radius: inherit;

    box-shadow: inset 0 0 0 1px var(--glow-color), inset 0 0 1px 0 var(--glow-color-60), inset 0 0 3px 0 var(--glow-color-50), inset 0 0 6px 0 var(--glow-color-40), inset 0 0 15px 0 var(--glow-color-30), inset 0 0 25px 2px var(--glow-color-20), inset 0 0 50px 2px var(--glow-color-10), 0 0 1px 0 var(--glow-color-60), 0 0 3px 0 var(--glow-color-50), 0 0 6px 0 var(--glow-color-40), 0 0 15px 0 var(--glow-color-30), 0 0 25px 2px var(--glow-color-20), 0 0 50px 2px var(--glow-color-10);

  }



  .border-glow-inner {

    display: flex; flex-direction: column; position: relative; overflow: hidden; z-index: 1; border-radius: inherit; height: 100%; transform-style: preserve-3d;

  }



  /* --- 微观排版辅助类 (Micro-typography) --- */

  .tabular-data { font-variant-numeric: tabular-nums; font-family: monospace; }

  .micro-label { font-family: monospace; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.3em; color: #6b7280; }

  .geek-border { border: 1px solid rgba(255,255,255,0.05); }

`;



// --- 0. Border Glow 辅助函数 ---

function parseHSL(hslStr) {

  const match = hslStr.match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/);

  if (!match) return { h: 190, s: 100, l: 50 }; 

  return { h: parseFloat(match[1]), s: parseFloat(match[2]), l: parseFloat(match[3]) };

}

function buildGlowVars(glowColor, intensity) {

  const { h, s, l } = parseHSL(glowColor);

  const base = `${h}deg ${s}% ${l}%`;

  const opacities = [100, 60, 50, 40, 30, 20, 10];

  const keys = ['', '-60', '-50', '-40', '-30', '-20', '-10'];

  const vars = {};

  for (let i = 0; i < opacities.length; i++) {

    vars[`--glow-color${keys[i]}`] = `hsl(${base} / ${Math.min(opacities[i] * intensity, 100)}%)`;

  }

  return vars;

}

const GRADIENT_POSITIONS = ['80% 55%', '69% 34%', '8% 6%', '41% 38%', '86% 85%', '82% 18%', '51% 4%'];

const GRADIENT_KEYS = ['--gradient-one', '--gradient-two', '--gradient-three', '--gradient-four', '--gradient-five', '--gradient-six', '--gradient-seven'];

const COLOR_MAP = [0, 1, 2, 0, 1, 2, 1];

function buildGradientVars(colors) {

  const vars = {};

  for (let i = 0; i < 7; i++) {

    const c = colors[Math.min(COLOR_MAP[i], colors.length - 1)];

    vars[GRADIENT_KEYS[i]] = `radial-gradient(at ${GRADIENT_POSITIONS[i]}, ${c} 0px, transparent 50%)`;

  }

  vars['--gradient-base'] = `linear-gradient(${colors[0]} 0 100%)`;

  return vars;

}

function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }

function easeInCubic(x) { return x * x * x; }

function animateValue({ start = 0, end = 100, duration = 1000, delay = 0, ease = easeOutCubic, onUpdate, onEnd }) {

  const t0 = performance.now() + delay;

  function tick() {

    const elapsed = performance.now() - t0;

    const t = Math.min(elapsed / duration, 1);

    onUpdate(start + (end - start) * ease(t));

    if (t < 1) requestAnimationFrame(tick);

    else if (onEnd) onEnd();

  }

  setTimeout(() => requestAnimationFrame(tick), delay);

}



// --- 0. 组件：边缘光辉卡片 (BorderGlow) ---

const BorderGlow = ({

  children, className = '', edgeSensitivity = 40, glowColor = '190 100 50', backgroundColor = 'rgba(5, 5, 5, 0.8)',

  borderRadius = 20, glowRadius = 40, glowIntensity = 1.0, coneSpread = 25, animated = false,

  colors = ['#00e5ff', '#ffffff', '#1e293b'], fillOpacity = 0.3,

}) => {

  const cardRef = useRef(null);



  const getCenterOfElement = useCallback((el) => {

    const { width, height } = el.getBoundingClientRect();

    return [width / 2, height / 2];

  }, []);



  const getEdgeProximity = useCallback((el, x, y) => {

    const [cx, cy] = getCenterOfElement(el);

    const dx = x - cx; const dy = y - cy;

    let kx = Infinity; let ky = Infinity;

    if (dx !== 0) kx = cx / Math.abs(dx);

    if (dy !== 0) ky = cy / Math.abs(dy);

    return Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);

  }, [getCenterOfElement]);



  const getCursorAngle = useCallback((el, x, y) => {

    const [cx, cy] = getCenterOfElement(el);

    const dx = x - cx; const dy = y - cy;

    if (dx === 0 && dy === 0) return 0;

    const radians = Math.atan2(dy, dx);

    let degrees = radians * (180 / Math.PI) + 90;

    if (degrees < 0) degrees += 360;

    return degrees;

  }, [getCenterOfElement]);



  const handlePointerMove = useCallback((e) => {

    const card = cardRef.current;

    if (!card) return;

    const rect = card.getBoundingClientRect();

    const x = e.clientX - rect.left; const y = e.clientY - rect.top;

    const edge = getEdgeProximity(card, x, y);

    const angle = getCursorAngle(card, x, y);

    card.style.setProperty('--edge-proximity', `${(edge * 100).toFixed(3)}`);

    card.style.setProperty('--cursor-angle', `${angle.toFixed(3)}deg`);

  }, [getEdgeProximity, getCursorAngle]);



  useEffect(() => {

    if (!animated || !cardRef.current) return;

    const card = cardRef.current;

    const angleStart = 110; const angleEnd = 465;

    card.classList.add('sweep-active');

    card.style.setProperty('--cursor-angle', `${angleStart}deg`);

    animateValue({ duration: 500, onUpdate: v => card.style.setProperty('--edge-proximity', v) });

    animateValue({ ease: easeInCubic, duration: 1500, end: 50, onUpdate: v => card.style.setProperty('--cursor-angle', `${(angleEnd - angleStart) * (v / 100) + angleStart}deg`) });

    animateValue({ ease: easeOutCubic, delay: 1500, duration: 2250, start: 50, end: 100, onUpdate: v => card.style.setProperty('--cursor-angle', `${(angleEnd - angleStart) * (v / 100) + angleStart}deg`) });

    animateValue({ ease: easeInCubic, delay: 2500, duration: 1500, start: 100, end: 0, onUpdate: v => card.style.setProperty('--edge-proximity', v), onEnd: () => card.classList.remove('sweep-active') });

  }, [animated]);



  return (

    <div

      ref={cardRef} onPointerMove={handlePointerMove}

      className={`border-glow-card backdrop-blur-2xl border border-white/10 ${className}`}

      style={{

        '--card-bg': backgroundColor, '--edge-sensitivity': edgeSensitivity, '--border-radius': `${borderRadius}px`, '--glow-padding': `${glowRadius}px`, '--cone-spread': coneSpread, '--fill-opacity': fillOpacity,

        ...buildGlowVars(glowColor, glowIntensity), ...buildGradientVars(colors),

      }}

    >

      <span className="edge-light" />

      <div className="border-glow-inner">{children}</div>

    </div>

  );

};



// --- 0. 高阶组件：系统自检启动页 ---

function BootSequence({ onComplete }) {

  const [progress, setProgress] = useState(0);

  const [stage, setStage] = useState(0);

  const messages = ["INITIALIZING QUANTUM CORE...", "ESTABLISHING NEURAL LINK...", "DECRYPTING HOLOGRAPHIC MATRICES...", "SYNCING PARALLAX ENGINE...", "SYSTEM ONLINE."];



  useEffect(() => {

    const interval = setInterval(() => {

      setProgress(p => {

        if (p >= 100) { clearInterval(interval); setTimeout(onComplete, 800); return 100; }

        return Math.min(p + (Math.floor(Math.random() * 15) + 2), 100);

      });

    }, 120);

    return () => clearInterval(interval);

  }, [onComplete]);



  useEffect(() => {

    if (progress < 20) setStage(0); else if (progress < 50) setStage(1); else if (progress < 80) setStage(2); else if (progress < 100) setStage(3); else setStage(4);

  }, [progress]);



  return (

    <motion.div className="fixed inset-0 z-[10000] flex flex-col pointer-events-none">

      <motion.div exit={{ y: "-100%" }} transition={{ duration: 1.2, ease: [0.77, 0, 0.175, 1] }} className="h-1/2 w-full bg-[#020202] border-b border-[#00e5ff]/20 flex items-end justify-center pb-8 relative overflow-hidden">

        <div className="absolute inset-0 film-grain opacity-[0.05]"></div>

      </motion.div>

      <motion.div exit={{ y: "100%" }} transition={{ duration: 1.2, ease: [0.77, 0, 0.175, 1] }} className="h-1/2 w-full bg-[#020202] border-t border-[#00e5ff]/20 flex items-start justify-center pt-8 relative overflow-hidden">

        <div className="absolute inset-0 film-grain opacity-[0.05]"></div>

      </motion.div>

      <motion.div exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }} transition={{ duration: 0.6 }} className="absolute inset-0 flex flex-col items-center justify-center text-[#00e5ff] font-mono">

        <div className="w-72 md:w-96 flex flex-col items-start">

          {messages.slice(0, stage + 1).map((m, i) => (<motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="mb-2 text-xs md:text-sm tracking-widest text-[#00e5ff]/80"><ScrambleText text={m} /></motion.div>))}

          <div className="mt-8 text-5xl md:text-7xl font-bold tracking-widest text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] tabular-data">{progress.toString().padStart(3, '0')}%</div>

          <div className="w-full h-[2px] bg-white/10 mt-6 rounded-full overflow-hidden"><motion.div className="h-full bg-white shadow-[0_0_10px_#fff]" initial={{ width: 0 }} animate={{ width: `${progress}%` }} /></div>

        </div>

      </motion.div>

    </motion.div>

  );

}



// --- 0. 高阶组件：磁性吸附交互 ---

function Magnetic({ children, className }) {

  const ref = useRef(null);

  const x = useMotionValue(0); const y = useMotionValue(0);

  const springX = useSpring(x, { stiffness: 150, damping: 15, mass: 0.1 });

  const springY = useSpring(y, { stiffness: 150, damping: 15, mass: 0.1 });



  const handleMouse = (e) => {

    const { clientX, clientY } = e; const { height, width, left, top } = ref.current.getBoundingClientRect();

    x.set((clientX - (left + width / 2)) * 0.2); y.set((clientY - (top + height / 2)) * 0.2);

  };

  return <motion.div ref={ref} onMouseMove={handleMouse} onMouseLeave={() => { x.set(0); y.set(0); }} style={{ x: springX, y: springY }} className={className}>{children}</motion.div>;

}



// --- 0. 高阶组件：赛博乱码解析 ---

function ScrambleText({ text, className }) {

  const chars = '!<>-_\\/[]{}—=+*^?#________';

  const [displayText, setDisplayText] = useState(text);

  const ref = useRef(null);

  const isInView = useInView(ref, { once: true, margin: "-50px" });



  useEffect(() => {

    if (!isInView) return;

    let iteration = 0;

    const interval = setInterval(() => {

      setDisplayText(text.split('').map((l, i) => i < iteration ? text[i] : chars[Math.floor(Math.random() * chars.length)]).join(''));

      if (iteration >= text.length) clearInterval(interval);

      iteration += 1 / 3; 

    }, 30);

    return () => clearInterval(interval);

  }, [text, isInView]);



  return <span ref={ref} className={className}>{displayText}</span>;

}



// --- 新增数据组件: 实时极速毫秒级时钟 ---

function RealtimeTimestamp() {

  const [ts, setTs] = useState("");

  useEffect(() => {

    let frame;

    const update = () => {

      const d = new Date();

      setTs(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}.${String(d.getMilliseconds()).padStart(3, '0')}`);

      frame = requestAnimationFrame(update);

    };

    update();

    return () => cancelAnimationFrame(frame);

  }, []);

  return <span>TS: {ts}</span>;

}



// --- 新增数据组件: 波动模拟内存池 ---

function FluctuatingMemory({ base = 42 }) {

  const [mem, setMem] = useState(base);

  useEffect(() => {

    const interval = setInterval(() => {

      setMem(base + Math.floor(Math.random() * 18 - 6));

    }, 600);

    return () => clearInterval(interval);

  }, [base]);

  return <span>MEM_ALLOC: {mem}MB</span>;

}



// --- 新增特性: 实时跳动虚拟终端中枢 (Telemetry HUD) ---

function LiveTelemetryHUD() {

  const [logs, setLogs] = useState([]);

  const [stats, setStats] = useState({ mem: 142, ping: 12, threads: 8 });



  useEffect(() => {

    let idCounter = 0;

    const templates = [

      "[SYS] Re-allocating dynamic block 0x{hex}",

      "[NET] Ping latency spike corrected: {ping}ms",

      "[CORE] Parallax matrix resolving {n} vectors",

      "[SEC] Node authentication protocol active",

      "[IO] Flux cache synchronized",

      "[SYS] Idle process suspended",

      "[MEM] Garbage collection cycle trigged"

    ];

    

    const interval = setInterval(() => {

      if (Math.random() > 0.4) {

        const tpl = templates[Math.floor(Math.random() * templates.length)];

        const text = tpl

          .replace('{hex}', Math.floor(Math.random() * 0xffffff).toString(16).toUpperCase().padStart(6, '0'))

          .replace('{ping}', Math.floor(Math.random() * 30 + 10))

          .replace('{n}', Math.floor(Math.random() * 8000 + 1000));

        

        setLogs(prev => {

          const newLogs = [...prev, { id: idCounter++, text }];

          if (newLogs.length > 5) newLogs.shift();

          return newLogs;

        });

      }

      

      setStats(prev => ({

        mem: 130 + Math.floor(Math.random() * 40),

        ping: 10 + Math.floor(Math.random() * 25),

        threads: 6 + Math.floor(Math.random() * 6)

      }));

    }, 800); 

    

    return () => clearInterval(interval);

  }, []);



  return (

    <div className="fixed bottom-6 left-6 z-[100] pointer-events-none w-56 font-mono text-[9px] md:text-[10px] tracking-widest mix-blend-screen opacity-70 flex flex-col">

      <div className="flex justify-between border-b border-[#00e5ff]/30 pb-1 mb-2">

        <span className="text-gray-400">TELEMETRY_LINK</span>

        <span className="text-[#00e5ff] animate-pulse">LIVE</span>

      </div>

      <div className="flex flex-col gap-1 text-gray-400 mb-3">

        <div className="flex justify-between">

          <span>HEAP_USAGE:</span>

          <span className="text-white tabular-data">{stats.mem} MB</span>

        </div>

        <div className="flex justify-between">

          <span>NET_LATENCY:</span>

          <span className="text-white tabular-data">{stats.ping} MS</span>

        </div>

        <div className="flex justify-between">

          <span>ACT_THREADS:</span>

          <span className="text-white tabular-data">{stats.threads}</span>

        </div>

      </div>

      <div 

        className="flex flex-col justify-end h-[60px] overflow-hidden text-gray-500" 

        style={{ WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 50%, black 100%)' }}

      >

        <AnimatePresence>

          {logs.map((log) => (

            <motion.div 

              key={log.id} 

              initial={{ opacity: 0, x: -5, height: 0 }} 

              animate={{ opacity: 1, x: 0, height: 'auto' }} 

              exit={{ opacity: 0, height: 0 }}

              transition={{ duration: 0.3 }}

              className="whitespace-nowrap truncate leading-relaxed"

            >

              {log.text}

            </motion.div>

          ))}

        </AnimatePresence>

      </div>

    </div>

  );

}



// --- 1. 定制光标 ---

function CustomCursor() {

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const [isHovering, setIsHovering] = useState(false);

  const [hasMoved, setHasMoved] = useState(false);

  const springConfig = { damping: 30, stiffness: 400, mass: 0.5 };

  const cursorX = useSpring(0, springConfig); const cursorY = useSpring(0, springConfig);



  useEffect(() => {

    const updateMousePosition = (e) => {

      if (!hasMoved) setHasMoved(true);

      setMousePosition({ x: e.clientX, y: e.clientY });

      cursorX.set(e.clientX - (isHovering ? 12 : 6)); cursorY.set(e.clientY - (isHovering ? 12 : 6));

      setIsHovering(!!e.target.closest('a, button, .interactive-zone, input'));

    };

    window.addEventListener('mousemove', updateMousePosition);

    return () => window.removeEventListener('mousemove', updateMousePosition);

  }, [cursorX, cursorY, isHovering, hasMoved]);



  return (

    <motion.div className="fixed top-0 left-0 pointer-events-none z-[9999] flex items-center justify-center" style={{ x: cursorX, y: cursorY, opacity: hasMoved ? 1 : 0 }} animate={{ width: isHovering ? 24 : 12, height: isHovering ? 24 : 12 }} transition={{ type: "spring", stiffness: 400, damping: 28 }}>

      <motion.div className="w-full h-full rounded-full flex items-center justify-center relative" animate={{ backgroundColor: isHovering ? 'rgba(0, 229, 255, 0.1)' : '#00e5ff', backdropFilter: isHovering ? 'blur(4px)' : 'blur(0px)', border: isHovering ? '1px solid rgba(0, 229, 255, 0.6)' : '0px solid transparent', boxShadow: isHovering ? '0 0 15px rgba(0, 229, 255, 0.3)' : 'inset -2px -2px 4px rgba(0, 100, 120, 0.8), inset 2px 2px 4px rgba(255, 255, 255, 0.9), 0 0 10px rgba(0, 229, 255, 0.6)' }} transition={{ duration: 0.25, ease: "easeInOut" }}>

        <AnimatePresence>{isHovering && <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-[#00e5ff] rounded-full shadow-[0_0_8px_#00e5ff]" />}</AnimatePresence>

      </motion.div>

    </motion.div>

  );

}



// --- 2. 全局沉浸星空背景 ---

function StarryBackground() {

  const mountRef = useRef(null);



  useEffect(() => {

    const currentMount = mountRef.current;

    const scene = new THREE.Scene();

    scene.background = new THREE.Color('#020202'); 

    scene.fog = new THREE.FogExp2(0x020202, 0.005); 



    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);

    camera.position.set(0, 0, 0); 

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });

    renderer.setSize(window.innerWidth, window.innerHeight);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    currentMount.appendChild(renderer.domElement);



    const createStarTexture = () => {

      const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 32; const ctx = canvas.getContext('2d');

      const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);

      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); gradient.addColorStop(0.1, 'rgba(255, 255, 255, 0.8)'); gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.2)'); gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = gradient; ctx.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(canvas);

    };



    const createDustTexture = () => {

      const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128; const ctx = canvas.getContext('2d');

      const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);

      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.05)'); gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.01)'); gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(canvas);

    };



    const starTexture = createStarTexture(); const dustTexture = createDustTexture(); const spaceGroup = new THREE.Group(); scene.add(spaceGroup);



    const galaxyCount = 15000; const galaxyGeometry = new THREE.BufferGeometry(); const galaxyPositions = new Float32Array(galaxyCount * 3);

    for (let i = 0; i < galaxyCount; i++) {

      const i3 = i * 3; const radius = Math.pow(Math.random(), 2) * 150; const spinAngle = radius * 0.04; const branchAngle = (i % 2) * Math.PI; 

      const x = Math.cos(branchAngle + spinAngle) * radius; const y = (Math.random() - 0.5) * Math.max(2, (10 - radius * 0.05)); const z = Math.sin(branchAngle + spinAngle) * radius;

      const tiltAngle = 0.5; const tiltX = x * Math.cos(tiltAngle) - y * Math.sin(tiltAngle); const tiltY = x * Math.sin(tiltAngle) + y * Math.cos(tiltAngle);

      galaxyPositions[i3] = tiltX; galaxyPositions[i3 + 1] = tiltY + 80; galaxyPositions[i3 + 2] = z - 50;     

    }

    galaxyGeometry.setAttribute('position', new THREE.BufferAttribute(galaxyPositions, 3));

    const galaxyMaterial = new THREE.PointsMaterial({ size: 0.8, map: starTexture, color: 0xcccccc, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending });

    const galaxy = new THREE.Points(galaxyGeometry, galaxyMaterial); spaceGroup.add(galaxy);



    const dustCount = 150; const dustGeometry = new THREE.BufferGeometry(); const dustPositions = new Float32Array(dustCount * 3);

    for(let i=0; i < dustCount * 3; i++) { dustPositions[i] = (Math.random() - 0.5) * 600; }

    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));

    const dustMaterial = new THREE.PointsMaterial({ size: 250, map: dustTexture, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending, color: 0x444455 });

    spaceGroup.add(new THREE.Points(dustGeometry, dustMaterial));



    const createStarGroup = (count, size, opacityBase, colorHex) => {

        const geometry = new THREE.BufferGeometry(); const positions = new Float32Array(count * 3);

        for(let i=0; i < count; i++) {

            const i3 = i * 3; const radius = 50 + Math.random() * 400; const theta = 2 * Math.PI * Math.random(); const phi = Math.acos(2 * Math.random() - 1);

            positions[i3] = radius * Math.sin(phi) * Math.cos(theta); positions[i3+1] = radius * Math.sin(phi) * Math.sin(theta); positions[i3+2] = radius * Math.cos(phi);

        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({ size, map: starTexture, transparent: true, opacity: opacityBase, color: colorHex, depthWrite: false, blending: THREE.AdditiveBlending });

        spaceGroup.add(new THREE.Points(geometry, material)); return material; 

    };

    createStarGroup(10000, 1.0, 0.3, 0xaaaaaa);

    const matStarsMedium = createStarGroup(2000, 2.0, 0.6, 0xffffff);

    const matStarsLarge = createStarGroup(200, 3.5, 0.9, 0xffffff);



    const meteors = []; const meteorMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 }); const meteorGeometry = new THREE.SphereGeometry(0.03, 8, 8);

    for (let i = 0; i < 4; i++) { 

      const meteor = new THREE.Mesh(meteorGeometry, meteorMaterial);

      const resetMeteor = (m) => {

         const radius = 100 + Math.random() * 100;

         m.position.set((Math.random() - 0.5) * radius, 60 + Math.random() * 40, (Math.random() - 0.5) * radius);

         const velocity = new THREE.Vector3((Math.random() - 0.5) * 4, -Math.random() * 3 - 1, (Math.random() - 0.5) * 4).normalize().multiplyScalar(1.5 + Math.random());

         m.userData = { velocity }; m.scale.set(1, 1, 50); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), velocity.clone().normalize());

      };

      resetMeteor(meteor); spaceGroup.add(meteor); meteors.push({ mesh: meteor, reset: () => resetMeteor(meteor) });

    }



    let targetX = 0; let targetY = 0;

    const handleMouseMove = (e) => { targetX = (e.clientX / window.innerWidth * 2 - 1) * 10; targetY = -(e.clientY / window.innerHeight * 2 - 1) * 10; };

    window.addEventListener('mousemove', handleMouseMove);

    const handleResize = () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); };

    window.addEventListener('resize', handleResize);



    let animationFrameId; const clock = new THREE.Clock();

    const animate = () => {

      const time = clock.getElapsedTime();

      spaceGroup.rotation.y = time * 0.002; spaceGroup.rotation.z = time * 0.001; galaxy.rotation.y = time * -0.004;

      matStarsMedium.opacity = 0.2 + Math.sin(time * 1.5) * 0.4; matStarsLarge.opacity = 0.3 + Math.sin(time * 2.5 + 1) * 0.6; 

      meteors.forEach(m => { m.mesh.position.add(m.mesh.userData.velocity); if (m.mesh.position.y < -50 || m.mesh.position.length() > 300) { m.reset(); } });



      const currentLookAt = new THREE.Vector3(); camera.getWorldDirection(currentLookAt);

      currentLookAt.lerp(new THREE.Vector3(targetX, targetY, -100).normalize(), 0.03);

      camera.lookAt(camera.position.clone().add(currentLookAt));

      renderer.render(scene, camera);

      animationFrameId = requestAnimationFrame(animate);

    };

    animate();

    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('resize', handleResize); cancelAnimationFrame(animationFrameId); if (currentMount) currentMount.removeChild(renderer.domElement); scene.clear(); };

  }, []);



  return <div ref={mountRef} className="fixed inset-0 z-0 pointer-events-none" />;

}



// --- 3. 深层文化图腾背景与极简语录 (He Tu Luo Shu & Ancient Quotes) ---

function CulturalOrnaments() {

  return (

    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">

       <motion.div 

         className="absolute left-4 md:left-12 top-1/4"

         style={{ writingMode: 'vertical-rl' }}

         animate={{ opacity: [0.15, 0.4, 0.15] }}

         transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}

       >

         <span className="text-xl md:text-2xl font-serif tracking-[0.5em] text-transparent bg-clip-text bg-gradient-to-b from-white/70 via-[#00e5ff]/50 to-transparent drop-shadow-[0_0_10px_rgba(0,229,255,0.3)] select-none">

           易有太极，是生两仪

         </span>

       </motion.div>

       <motion.div 

         className="absolute right-4 md:right-12 bottom-1/4"

         style={{ writingMode: 'vertical-rl' }}

         animate={{ opacity: [0.15, 0.4, 0.15] }}

         transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 3 }}

       >

         <span className="text-xl md:text-2xl font-serif tracking-[0.5em] text-transparent bg-clip-text bg-gradient-to-b from-[#00e5ff]/50 via-white/70 to-transparent drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] select-none">

           仰观天文，俯察地理

         </span>

       </motion.div>



       <svg className="absolute top-16 right-32 w-48 h-48 opacity-20 mix-blend-screen hidden md:block" viewBox="0 0 200 200">

          <polyline points="40,40 100,20 160,60 140,120 100,160 40,120 40,40" fill="none" stroke="#00e5ff" strokeWidth="0.5" strokeDasharray="2 4"/>

          <circle cx="100" cy="90" r="2" fill="#fff" />

          <circle cx="100" cy="110" r="2" fill="#fff" />

          <circle cx="90" cy="100" r="2" fill="#00e5ff" />

          <circle cx="110" cy="100" r="2" fill="#00e5ff" />

          <circle cx="40" cy="40" r="3" fill="#fff" />

          <circle cx="100" cy="20" r="2" fill="#00e5ff" />

          <circle cx="160" cy="60" r="3" fill="#fff" />

          <circle cx="140" cy="120" r="2" fill="#00e5ff" />

          <circle cx="100" cy="160" r="3" fill="#fff" />

          <circle cx="40" cy="120" r="2" fill="#00e5ff" />

       </svg>

       <svg className="absolute bottom-16 left-32 w-56 h-56 opacity-20 mix-blend-screen hidden md:block" viewBox="0 0 200 200">

          <polyline points="100,20 100,180" fill="none" stroke="#fff" strokeWidth="0.5" strokeDasharray="1 5"/>

          <polyline points="20,100 180,100" fill="none" stroke="#00e5ff" strokeWidth="0.5" strokeDasharray="1 5"/>

          <circle cx="100" cy="20" r="2" fill="#00e5ff" />

          <circle cx="100" cy="40" r="3" fill="#fff" />

          <circle cx="100" cy="160" r="3" fill="#fff" />

          <circle cx="100" cy="180" r="2" fill="#00e5ff" />

          <circle cx="20" cy="100" r="2" fill="#00e5ff" />

          <circle cx="40" cy="100" r="3" fill="#fff" />

          <circle cx="160" cy="100" r="3" fill="#fff" />

          <circle cx="180" cy="100" r="2" fill="#00e5ff" />

          <circle cx="100" cy="100" r="4" fill="#00e5ff" />

       </svg>

    </div>

  );

}



// --- 【全新重构】方案三：阴阳共振力场 (Yin-Yang Resonance Field) ---

// 现已脱离滚动容器挂载在顶层，完美解决尺寸失控问题。全中文极客体验。

function ResonanceField({ trigram, onClose }) {

  const isYang = trigram.type === 'yang';

  const themeColor = isYang ? '#fbbf24' : '#00e5ff'; // 阳卦金，阴卦蓝

  const bgColor = isYang ? 'rgba(251, 191, 36, 0.08)' : 'rgba(0, 229, 255, 0.08)';

  const particles = Array.from({ length: 60 });



  return (

    <motion.div

      initial={{ opacity: 0 }}

      animate={{ opacity: 1 }}

      exit={{ opacity: 0 }}

      transition={{ duration: 0.8, ease: "easeInOut" }}

      className="fixed inset-0 z-[10000] flex items-center justify-center cursor-crosshair overflow-hidden"

      onClick={onClose}

    >

      {/* 极度模糊的物理隔离层与渐变力场 */}

      <div className="absolute inset-0 backdrop-blur-[40px] bg-[#020202]/85" />

      <div className="absolute inset-0 mix-blend-screen pointer-events-none" style={{ background: `radial-gradient(circle at center, ${bgColor} 0%, transparent 70%)` }} />



      {/* 游离的环境星尘粒子 */}

      <div className="absolute inset-0 pointer-events-none">

        {particles.map((_, i) => (

          <motion.div

            key={i}

            initial={{ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, opacity: 0 }}

            animate={{

              x: Math.random() * window.innerWidth + (Math.random() - 0.5) * 150,

              y: Math.random() * window.innerHeight + (Math.random() - 0.5) * 150,

              opacity: [0, Math.random() * 0.8 + 0.2, 0],

              scale: [0.5, 1.5, 0.5]

            }}

            transition={{ duration: 8 + Math.random() * 12, repeat: Infinity, ease: "linear" }}

            className="absolute w-[3px] h-[3px] rounded-full mix-blend-screen"

            style={{ backgroundColor: themeColor, boxShadow: `0 0 12px ${themeColor}` }}

          />

        ))}

      </div>



      {/* 巨大化的背景单卦象水印 (已等比例收敛，避免过大) */}

      <motion.div

        animate={{ rotate: isYang ? 360 : -360 }}

        transition={{ duration: 240, repeat: Infinity, ease: "linear" }}

        className="absolute opacity-5 pointer-events-none flex flex-col gap-6 md:gap-10 justify-center items-center w-full h-full"

        style={{ filter: `drop-shadow(0 0 40px ${themeColor})` }}

      >

         {trigram.lines.map((isSolid, idx) => (

            isSolid ? (

              <div key={idx} className="w-[80vw] md:w-[40vw] h-[4vh] md:h-[3vh] rounded-full" style={{ backgroundColor: themeColor }} />

            ) : (

              <div key={idx} className="flex justify-between w-[80vw] md:w-[40vw]">

                <div className="w-[38vw] md:w-[18vw] h-[4vh] md:h-[3vh] rounded-full" style={{ backgroundColor: themeColor }} />

                <div className="w-[38vw] md:w-[18vw] h-[4vh] md:h-[3vh] rounded-full" style={{ backgroundColor: themeColor }} />

              </div>

            )

         ))}

      </motion.div>



      {/* 核心意境排版区：修复溢出问题，缩小字号与间距 */}

      <div className="relative z-10 flex flex-row-reverse items-center justify-center gap-6 md:gap-16 w-full h-full px-4 md:px-8 pointer-events-none">

        

        {/* 右侧：卦名与赛博编码 (收敛字号) */}

        <motion.div

          initial={{ opacity: 0, x: 50 }}

          animate={{ opacity: 1, x: 0 }}

          transition={{ duration: 1, ease: "easeOut" }}

          className="flex flex-col items-center gap-4 md:gap-6"

          style={{ writingMode: 'vertical-rl' }}

        >

          <h2 className="text-7xl md:text-[120px] font-serif tracking-widest" style={{ color: themeColor, textShadow: `0 0 30px ${themeColor}` }}>

            {trigram.name}

          </h2>

          <div className="flex gap-4 items-center">

             <span className="font-mono text-[10px] md:text-sm tracking-[0.3em] opacity-80" style={{ color: themeColor }}>

                属性：{trigram.polarity}

             </span>

             <span className="font-mono text-[10px] md:text-sm tracking-[0.3em] opacity-80" style={{ color: themeColor }}>

                五行：{trigram.element}

             </span>

             <span className="font-mono text-[10px] md:text-sm tracking-[0.3em] opacity-80" style={{ color: themeColor }}>

                阵列：[ {trigram.lines.join(' ')} ]

             </span>

          </div>

        </motion.div>



        {/* 隔离光束 */}

        <motion.div

          initial={{ scaleY: 0 }}

          animate={{ scaleY: 1 }}

          transition={{ duration: 1.5, ease: "easeInOut" }}

          className="w-[1px] h-[40vh] opacity-30"

          style={{ backgroundColor: themeColor }}

        />



        {/* 左侧：终极判词 (收敛字号与行高) */}

        <div className="flex flex-row-reverse gap-3 md:gap-8 h-[40vh] items-start pt-2 md:pt-4">

          {trigram.destiny.map((line, idx) => (

            <motion.p

              key={idx}

              initial={{ opacity: 0, y: -30 }}

              animate={{ opacity: 1, y: 0 }}

              transition={{ delay: 0.6 + idx * 0.2, duration: 1 }}

              className="text-sm md:text-xl font-light leading-[2.5em] text-white tracking-[0.4em] text-justify font-serif drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"

              style={{ writingMode: 'vertical-rl' }}

            >

              {line}

            </motion.p>

          ))}

        </div>



      </div>



      <div className="absolute bottom-8 font-mono text-[10px] md:text-xs tracking-[0.5em] text-white/30 animate-pulse pointer-events-none">

        [ 点击任意虚空重组力场 ]

      </div>

    </motion.div>

  );

}



// --- 阴阳双属性轨道粒子 ---

function OrbitParticles({ type, isHovered }) {

  const isYang = type === 'yang';

  const colorClass = isYang ? 'bg-[#fbbf24] shadow-[0_0_12px_#f59e0b]' : 'bg-[#00e5ff] shadow-[0_0_12px_#00e5ff]';

  const particles = Array.from({ length: 6 });



  const duration = isHovered ? 1.5 : 8;

  const radius = isHovered ? 38 : 65;

  const opacity = isHovered ? 1 : 0.4;



  return (

    <motion.div

      animate={{ rotate: isYang ? 360 : -360 }}

      transition={{ duration, repeat: Infinity, ease: "linear" }}

      className="absolute inset-0 pointer-events-none"

    >

      {particles.map((_, i) => {

        const angle = (i / particles.length) * Math.PI * 2;

        const x = Math.cos(angle) * radius;

        const y = Math.sin(angle) * radius;

        return (

          <motion.div

            key={i}

            initial={false}

            animate={{ x, y, scale: isHovered ? 1.5 : Math.random() * 0.5 + 0.5, opacity }}

            transition={{ type: "spring", stiffness: 200, damping: 20 }}

            className={`absolute left-1/2 top-1/2 w-[5px] h-[5px] -ml-[2.5px] -mt-[2.5px] rounded-full ${colorClass}`}

          />

        );

      })}

    </motion.div>

  );

}



// --- 4. 【进化版】全息 3D 八卦阵 ---

function Holographic3DBagua({ scrollY, onOpenTrigram }) {

  const [hoveredIndex, setHoveredIndex] = useState(null);



  const containerRef = useRef(null);

  const x = useMotionValue(0); const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 30 }); const mouseYSpring = useSpring(y, { stiffness: 150, damping: 30 });

  

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [15, -15]); 

  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [-15, 15]);



  const solarRotate = useTransform(scrollY || useMotionValue(0), v => (v * 0.05) % 360);

  const mansionRotate = useTransform(scrollY || useMotionValue(0), v => -(v * 0.03) % 360);



  const handleMouseMove = (e) => {

    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();

    x.set((e.clientX - rect.left) / rect.width - 0.5); y.set((e.clientY - rect.top) / rect.height - 0.5);

  };



  // 全中文易理数据集

  const trigrams = [

    { lines: [1, 1, 1], name: '乾', terms: '霜降·立冬·小雪', stars: '毕·觜·参', type: 'yang', polarity: '阳 (+)', element: '天 / 金', destiny: ['潜龙勿用，阳气深藏。', '此刻宜蓄力而非冒进，', '构建底层逻辑胜过追求表层收益。'] }, 

    { lines: [1, 1, 0], name: '巽', terms: '谷雨·立夏·小满', stars: '房·心·尾·箕', type: 'yin', polarity: '阴 (-)', element: '风 / 木', destiny: ['无孔不入，顺势而为。', '如同微风般渗透，', '信息与人脉的交织将为你带来新机遇。'] }, 

    { lines: [0, 1, 0], name: '坎', terms: '大雪·冬至·小寒', stars: '斗·牛·女·虚', type: 'yang', polarity: '阳 (+)', element: '水 / 水', destiny: ['深水潜流，险中求胜。', '直面最困难的技术攻坚，', '跨越此渊，必将迎来认知的跃迁。'] }, 

    { lines: [1, 0, 0], name: '艮', terms: '大寒·立春·雨水', stars: '危·室·壁', type: 'yang', polarity: '阳 (+)', element: '山 / 土', destiny: ['动静有常，高山仰止。', '停止无效内耗，退守核心阵地。', '静定之中，方见大局。'] }, 

    { lines: [0, 0, 0], name: '坤', terms: '大暑·立秋·处暑', stars: '张·翼·轸', type: 'yin', polarity: '阴 (-)', element: '地 / 土', destiny: ['厚德载物，海纳百川。', '放低姿态吸收来自四周的反馈，', '现在的积累将是未来的大地。'] }, 

    { lines: [0, 0, 1], name: '震', terms: '惊蛰·春分·清明', stars: '角·亢·氐', type: 'yang', polarity: '阳 (+)', element: '雷 / 木', destiny: ['春雷萌动，破局之机。', '不要畏惧试错，', '用最快速的迭代去惊醒沉睡的市场与灵感。'] }, 

    { lines: [1, 0, 1], name: '离', terms: '芒种·夏至·小暑', stars: '井·鬼·柳·星', type: 'yin', polarity: '阴 (-)', element: '火 / 火', destiny: ['光明炽盛，附丽于物。', '你的才华需要一个绝佳的平台载体。', '如火借风势，必将燎原。'] }, 

    { lines: [0, 1, 1], name: '兑', terms: '白露·秋分·寒露', stars: '奎·娄·胃·昴', type: 'yin', polarity: '阴 (-)', element: '泽 / 金', destiny: ['金秋喜悦，言辞锋利。', '通过沟通与分享创造价值，', '你的输出将引发强烈的共鸣。'] }, 

  ];

  

  const solarTerms = ['立春','雨水','惊蛰','春分','清明','谷雨','立夏','小满','芒种','夏至','小暑','大暑','立秋','处暑','白露','秋分','寒露','霜降','立冬','小雪','大雪','冬至','小寒','大寒'];

  const mansions = ['角','亢','氐','房','心','尾','箕','斗','牛','女','虚','危','室','壁','奎','娄','胃','昴','毕','觜','参','井','鬼','柳','星','张','翼','轸'];



  const checkHighlight = (baseIndex, itemAngle, threshold = 23) => {

    if (baseIndex === null) return false;

    const baseAngle = baseIndex * 45;

    let diff = Math.abs(baseAngle - itemAngle) % 360;

    if (diff > 180) diff = 360 - diff;

    return diff <= threshold;

  };



  return (

    <div ref={containerRef} onMouseMove={handleMouseMove} onMouseLeave={() => { x.set(0); y.set(0); setHoveredIndex(null); }} className="relative w-[340px] h-[340px] md:w-[500px] md:h-[500px] flex items-center justify-center interactive-zone" style={{ perspective: 1200 }}>

      <motion.div className="absolute inset-0 bg-white rounded-full blur-[140px] pointer-events-none mix-blend-screen" animate={{ opacity: [0.01, 0.05, 0.01] }} transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }} />

      <motion.div className="w-full h-full relative" style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}>

        

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ transform: "translateZ(-40px)" }}>

          <motion.svg viewBox="-400 -400 800 800" className="absolute w-[600px] h-[600px] md:w-[800px] md:h-[800px] opacity-60 mix-blend-screen drop-shadow-[0_0_8px_rgba(0,229,255,0.2)]">

             <motion.g style={{ rotate: solarRotate }}>

               <circle cx="0" cy="0" r="280" fill="none" stroke="rgba(0,229,255,0.15)" strokeWidth="1" strokeDasharray="2 8" />

               <circle cx="0" cy="0" r="265" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />

               {solarTerms.map((term, i) => {

                  const itemAngle = i * 15;

                  const isActive = checkHighlight(hoveredIndex, itemAngle);

                  const opacity = hoveredIndex === null ? 0.5 : (isActive ? 1 : 0.15);

                  const color = hoveredIndex === null ? 'rgba(255,255,255,1)' : (isActive ? '#00e5ff' : 'rgba(255,255,255,1)');

                  const glow = isActive ? 'drop-shadow(0 0 6px #00e5ff)' : 'none';

                  return (

                    <g key={term} transform={`rotate(${itemAngle}) translate(0, -280)`}>

                       <text x="0" y="0" fill={color} style={{ opacity, filter: glow, transition: 'all 0.4s ease' }} fontSize="10" fontFamily="monospace" textAnchor="middle" alignmentBaseline="middle">{term}</text>

                       <circle cx="0" cy="-12" r="1.5" fill="#00e5ff" style={{ opacity: hoveredIndex === null ? 0.6 : (isActive ? 1 : 0.2), filter: glow, transition: 'all 0.4s ease' }} />

                       <line x1="0" y1="10" x2="0" y2="15" stroke="#00e5ff" strokeWidth="1" style={{ opacity: hoveredIndex === null ? 0.4 : (isActive ? 1 : 0.2), filter: glow, transition: 'all 0.4s ease' }} />

                    </g>

                  );

               })}

             </motion.g>



             <motion.g style={{ rotate: mansionRotate }}>

               <circle cx="0" cy="0" r="320" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

               <circle cx="0" cy="0" r="335" fill="none" stroke="rgba(0,229,255,0.05)" strokeWidth="4" />

               {mansions.map((star, i) => {

                  const itemAngle = i * (360 / 28);

                  const isActive = checkHighlight(hoveredIndex, itemAngle);

                  const opacity = hoveredIndex === null ? 0.7 : (isActive ? 1 : 0.15);

                  const glow = isActive ? 'drop-shadow(0 0 8px #00e5ff)' : 'none';

                  return (

                    <g key={star} transform={`rotate(${itemAngle}) translate(0, -320)`}>

                       <text x="0" y="0" fill="#00e5ff" style={{ opacity, filter: glow, transition: 'all 0.4s ease' }} fontSize="13" fontFamily="serif" textAnchor="middle" alignmentBaseline="middle">{star}</text>

                       <line x1="0" y1="10" x2="0" y2="18" stroke="#ffffff" strokeWidth="1" style={{ opacity: opacity * 0.4, transition: 'all 0.4s ease' }} />

                    </g>

                  );

               })}

             </motion.g>

          </motion.svg>

        </div>



        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ transform: "translateZ(0px)" }}>

          <motion.svg viewBox="0 0 500 500" className="w-full h-full" animate={{ rotate: 360 }} transition={{ duration: 250, ease: "linear", repeat: Infinity }}>

            <circle cx="250" cy="250" r="230" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

            <circle cx="250" cy="250" r="220" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 8" />

          </motion.svg>

        </div>



        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ transform: "translateZ(20px)" }}>

          <svg viewBox="-250 -250 500 500" className="w-full h-full absolute">

            {trigrams.map((item, i) => {

              const rad = (i * 45 - 90) * (Math.PI / 180);

              const isActive = hoveredIndex === i;

              const isYang = item.type === 'yang';

              const activeColor = isYang ? "rgba(251, 191, 36, 1)" : "rgba(0, 229, 255, 1)";

              return (

                <motion.line

                  key={`spoke-${i}`} x1="0" y1="0" x2={Math.cos(rad) * 165} y2={Math.sin(rad) * 165}

                  stroke={isActive ? activeColor : "rgba(255, 255, 255, 0.05)"}

                  strokeWidth={isActive ? "2" : "1"} strokeDasharray="4 6"

                  animate={{ strokeDashoffset: isActive ? [0, -20] : 0 }}

                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}

                  style={{ filter: isActive ? `drop-shadow(0 0 8px ${activeColor})` : "none" }}

                />

              );

            })}

          </svg>

        </div>



        {/* 交互核心区：增加 onClick 事件向外抛出卦象数据 */}

        <div className="absolute inset-0 flex items-center justify-center" style={{ transform: "translateZ(40px)", transformStyle: "preserve-3d" }}>

          {trigrams.map((item, i) => {

            const angle = i * 45; 

            const isHovered = hoveredIndex === i;

            const rad = (angle - 90) * (Math.PI / 180);

            const isYang = item.type === 'yang';

            

            return (

              <div 

                key={i} 

                className="absolute w-24 h-20 -ml-12 -mt-10 flex flex-col items-center justify-center cursor-pointer pointer-events-auto" 

                style={{ left: '50%', top: '50%', transform: `translate(${Math.cos(rad) * 175}px, ${Math.sin(rad) * 175}px) rotate(${angle}deg)`, transformStyle: "preserve-3d" }} 

                onMouseEnter={() => setHoveredIndex(i)}

                onClick={() => onOpenTrigram(trigrams[i])}

              >

                <OrbitParticles type={item.type} isHovered={isHovered} />

                <motion.div animate={{ translateZ: isHovered ? 30 : 0, scale: isHovered ? 1.15 : 1 }} transition={{ type: "spring", stiffness: 400, damping: 25 }} className={`flex flex-col gap-[5px] p-2.5 bg-[#050505]/90 backdrop-blur-xl rounded-lg border ${isHovered ? (isYang ? 'border-[#fbbf24]/50 shadow-[0_0_30px_rgba(251,191,36,0.3)]' : 'border-[#00e5ff]/50 shadow-[0_0_30px_rgba(0,229,255,0.3)]') : 'border-white/5 shadow-[0_15px_30px_rgba(0,0,0,0.8)]'} relative group overflow-hidden`}>

                  <div className={`absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent ${isYang ? 'via-[#fbbf24]/20' : 'via-[#00e5ff]/20'} to-transparent -translate-y-full transition-transform duration-500 ${isHovered ? 'translate-y-full' : ''}`} />

                  {item.lines.map((isSolid, idx) => {

                    const glow = isHovered ? (isYang ? 'shadow-[0_0_12px_#fbbf24] opacity-100 bg-[#fbbf24]' : 'shadow-[0_0_12px_#00e5ff] opacity-100 bg-[#00e5ff]') : 'opacity-50 bg-gray-400';

                    return isSolid ? ( <div key={idx} className={`w-14 h-[3px] rounded-full ${glow} transition-all duration-300 relative z-10`} /> ) : ( <div key={idx} className="flex justify-between w-14 relative z-10"><div className={`w-[26px] h-[3px] rounded-full ${glow} transition-all duration-300`} /><div className={`w-[26px] h-[3px] rounded-full ${glow} transition-all duration-300`} /></div> )

                  })}

                </motion.div>

              </div>

            );

          })}

        </div>



        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ transform: "translateZ(80px)" }}>

          <motion.svg viewBox="0 0 500 500" className="w-full h-full drop-shadow-2xl" animate={{ rotate: -360 }} transition={{ duration: 150, ease: "linear", repeat: Infinity }}>

            <circle cx="250" cy="250" r="115" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

            <circle cx="250" cy="250" r="105" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeDasharray="1 6" />

          </motion.svg>

        </div>



        {/* Z=120: 还原经典的阴阳太极图核心 */}

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ transform: "translateZ(120px)" }}>

          <motion.div className="w-48 h-48 drop-shadow-[0_20px_40px_rgba(0,0,0,0.9)]" animate={{ rotate: 360 }} transition={{ duration: 60, ease: "linear", repeat: Infinity }}>

            <svg viewBox="0 0 100 100" className="w-full h-full">

              <circle cx="50" cy="50" r="49" fill="#0A0A0C" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />

              <path d="M 50 1 A 24.5 24.5 0 0 1 50 50 A 24.5 24.5 0 0 0 50 99 A 49 49 0 0 1 50 1 Z" fill="#E2E8F0" />

              <circle cx="50" cy="74.5" r="7" fill="#E2E8F0" />

              <circle cx="50" cy="25.5" r="7" fill="#0A0A0C" />

            </svg>

          </motion.div>

        </div>



        {/* Z=180: 恢复鼠标悬停时的全息信息投影面 (节气与星宿面板) */}

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ transform: "translateZ(180px)" }}>

          <AnimatePresence>

            {hoveredIndex !== null && (

              <motion.div initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} exit={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }} transition={{ type: "spring", stiffness: 300, damping: 25 }} className={`flex flex-col items-center justify-center text-center w-64 h-64 bg-[#050505]/80 backdrop-blur-2xl rounded-full border shadow-2xl overflow-hidden relative ${trigrams[hoveredIndex].type === 'yang' ? 'border-[#fbbf24]/30 shadow-[0_0_50px_rgba(251,191,36,0.15)]' : 'border-[#00e5ff]/30 shadow-[0_0_50px_rgba(0,229,255,0.15)]'}`}>

                {/* 扫描纹理 */}

                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none mix-blend-screen" />

                

                <span className={`text-7xl font-serif tracking-[0.1em] glitch-text relative z-10 mb-4 ${trigrams[hoveredIndex].type === 'yang' ? 'text-[#fbbf24] drop-shadow-[0_0_20px_#fbbf24]' : 'text-[#00e5ff] drop-shadow-[0_0_20px_#00e5ff]'}`}>

                  {trigrams[hoveredIndex].name}

                </span>

                

                <div className="flex flex-col gap-2 relative z-10 w-full px-12">

                   <div className={`flex justify-between items-center border-b pb-1 ${trigrams[hoveredIndex].type === 'yang' ? 'border-[#fbbf24]/20' : 'border-[#00e5ff]/20'}`}>

                     <span className={`text-[8px] font-mono opacity-60 tracking-widest uppercase ${trigrams[hoveredIndex].type === 'yang' ? 'text-[#fbbf24]' : 'text-[#00e5ff]'}`}>节气</span>

                     <span className="text-[10px] text-gray-200 tracking-[0.2em] font-serif">{trigrams[hoveredIndex].terms}</span>

                   </div>

                   <div className={`flex justify-between items-center border-b pb-1 ${trigrams[hoveredIndex].type === 'yang' ? 'border-[#fbbf24]/20' : 'border-[#00e5ff]/20'}`}>

                     <span className={`text-[8px] font-mono opacity-60 tracking-widest uppercase ${trigrams[hoveredIndex].type === 'yang' ? 'text-[#fbbf24]' : 'text-[#00e5ff]'}`}>星宿</span>

                     <span className="text-[10px] text-gray-200 tracking-[0.2em] font-serif">{trigrams[hoveredIndex].stars}</span>

                   </div>

                </div>

              </motion.div>

            )}

          </AnimatePresence>

        </div>



      </motion.div>

    </div>

  );

}



// --- 5. 气泡菜单层 (Neural Bubble Menu) ---

function BubbleMenuOverlay() {

  const [isOpen, setIsOpen] = useState(false);

  const links = [

    { name: 'HOME', href: '#home', zh: '首页' },

    { name: 'PROFILE', href: '#about', zh: '个人名片' },

    { name: 'PORTFOLIO', href: '#portfolio', zh: '成果展示' },

    { name: 'SIGNAL', href: '#knowledge', zh: '灵感问答' },

  ];



  // 气泡动画配置

  const overlayVariants = {

    hidden: { opacity: 0, backdropFilter: "blur(0px)" },

    visible: { opacity: 1, backdropFilter: "blur(24px)", transition: { duration: 0.5, ease: "easeInOut" } }

  };

  const listVariants = {

    hidden: { opacity: 0 },

    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }

  };

  const itemVariants = {

    hidden: { scale: 0, y: 40, opacity: 0, rotate: -15 },

    visible: { scale: 1, y: 0, opacity: 1, rotate: 0, transition: { type: "spring", stiffness: 300, damping: 20 } }

  };



  return (

    <>

      <div className="fixed top-0 left-0 w-full z-[100] flex justify-between items-center p-6 md:p-8 pointer-events-none">

        <div className="flex flex-col pointer-events-auto interactive-zone">

          <span className="text-white font-bold text-xl tracking-widest drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">QANTO</span>

        </div>

        <Magnetic className="pointer-events-auto">

          <button 

            onClick={() => setIsOpen(true)}

            className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 hover:bg-white hover:text-black transition-all duration-300 shadow-lg interactive-zone"

          >

            <Menu className="w-6 h-6" />

          </button>

        </Magnetic>

      </div>



      <AnimatePresence>

        {isOpen && (

          <motion.div

            initial="hidden" animate="visible" exit="hidden" variants={overlayVariants}

            className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#020202]/60"

          >

            <div className="absolute top-6 right-6 md:top-8 md:right-8">

              <Magnetic>

                <button 

                  onClick={() => setIsOpen(false)}

                  className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-black hover:scale-110 transition-transform duration-300 shadow-[0_0_20px_rgba(255,255,255,0.5)] interactive-zone"

                >

                  <X className="w-6 h-6" />

                </button>

              </Magnetic>

            </div>



            <motion.div variants={listVariants} className="flex flex-wrap justify-center items-center max-w-4xl gap-4 md:gap-6 p-4">

              {links.map((link, i) => {

                const rot = [ -6, 4, -4, 6 ][i % 4];

                return (

                  <motion.a

                    key={link.name} href={link.href} variants={itemVariants} onClick={() => setIsOpen(false)}

                    style={{ rotate: rot }}

                    whileHover={{ scale: 1.05, rotate: 0, backgroundColor: "#00e5ff", color: "#000", borderColor: "transparent", boxShadow: "0 10px 30px rgba(0,229,255,0.4)" }}

                    className="flex flex-col items-center justify-center px-10 py-6 md:px-14 md:py-8 bg-[#0a0f1a]/80 backdrop-blur-md text-white rounded-full border border-white/10 transition-colors duration-300 interactive-zone group"

                  >

                    <span className="text-3xl md:text-5xl font-black tracking-tighter leading-none">{link.name}</span>

                    <span className="text-xs md:text-sm font-mono tracking-[0.4em] mt-2 opacity-70 group-hover:opacity-100 group-hover:text-black/80">{link.zh}</span>

                  </motion.a>

                );

              })}

            </motion.div>

          </motion.div>

        )}

      </AnimatePresence>

    </>

  );

}



// --- 6. 真实 3D 物理视差倾斜组件 ---

function True3DTilt({ children, className, perspective = 1000, tiltMax = 12 }) {

  const ref = useRef(null);

  const x = useMotionValue(0);

  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });

  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [tiltMax, -tiltMax]);

  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [-tiltMax, tiltMax]);



  const glareX = useTransform(mouseXSpring, [-0.5, 0.5], [0, 100]);

  const glareY = useTransform(mouseYSpring, [-0.5, 0.5], [0, 100]);

  const glareBackground = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.12) 0%, transparent 60%)`;



  const handleMouseMove = (e) => {

    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();

    x.set((e.clientX - rect.left) / rect.width - 0.5);

    y.set((e.clientY - rect.top) / rect.height - 0.5);

  };

  const handleMouseLeave = () => { x.set(0); y.set(0); };



  return (

    <motion.div

      ref={ref} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}

      style={{ perspective }} className={className}

    >

      <motion.div style={{ rotateX, rotateY, transformStyle: "preserve-3d" }} className="w-full h-full relative">

        <motion.div className="absolute inset-0 pointer-events-none rounded-[inherit] mix-blend-screen z-[100]" style={{ background: glareBackground }} />

        {children}

      </motion.div>

    </motion.div>

  );

}



// --- 7. 顶级展示：3D 旋转木马 ---

function CarouselItem({ item, index, itemWidth, trackItemOffset, x }) {

  const range = [-(index + 1) * trackItemOffset, -index * trackItemOffset, -(index - 1) * trackItemOffset];

  const rotateY = useTransform(x, range, [35, 0, -35]);

  const scale = useTransform(x, range, [0.8, 1, 0.8]);

  const opacity = useTransform(x, range, [0.4, 1, 0.4]);

  const zIndex = useTransform(x, range, [0, 10, 0]);



  return (

    <motion.div

      style={{ width: itemWidth, rotateY, scale, opacity, zIndex, transformStyle: "preserve-3d" }}

      className="flex-shrink-0 relative h-[450px] md:h-[500px] cursor-grab active:cursor-grabbing interactive-zone group"

    >

      <True3DTilt className="w-full h-full" perspective={1200} tiltMax={15}>

        <BorderGlow

          animated={true} glowColor="190 100 50" colors={['#00e5ff', '#1e293b', '#ffffff']} backgroundColor="#050505"

          borderRadius={24} className="w-full h-full pointer-events-none" style={{ transformStyle: "preserve-3d" }}

        >

          <div className="relative h-3/5 overflow-hidden rounded-t-3xl" style={{ transform: "translateZ(30px)" }}>

            <img src={item.image} alt={item.title} className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" />

            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-auto">

              <Magnetic>

                <a href={item.link} className="p-4 bg-white rounded-full text-black hover:scale-110 transition-transform duration-300 interactive-zone shadow-lg block">

                  <ExternalLink className="w-6 h-6" />

                </a>

              </Magnetic>

            </div>

          </div>

          <div className="p-6 md:p-8 flex flex-col justify-center h-2/5" style={{ transform: "translateZ(50px)" }}>

            <div className="flex items-center gap-3 mb-3">

              <span className="p-2 bg-white/10 rounded-full text-[#00e5ff]">{item.icon}</span>

              <h3 className="text-xl md:text-2xl font-bold text-white tracking-wider">{item.title}</h3>

            </div>

            <p className="text-gray-500 text-sm md:text-base leading-relaxed line-clamp-2">{item.description}</p>

          </div>

        </BorderGlow>

      </True3DTilt>

    </motion.div>

  );

}



function HolographicCarousel() {

  const projects = [

    { id: 1, title: 'AI 图像生成器', description: '基于最新扩散模型的图像生成工具，能够根据文本创造艺术作品。', image: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=2574&auto=format&fit=crop', link: '#', icon: <Code size={20}/> },

    { id: 2, title: '智能对话引擎', description: '基于大型语言模型的智能对话系统，支持上下文长记忆。', image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=2670&auto=format&fit=crop', link: '#', icon: <Cpu size={20}/> },

    { id: 3, title: '全息数据大屏', description: '用于展示复杂数据集的沉浸式交互平台，支持手势缩放。', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2670&auto=format&fit=crop', link: '#', icon: <Database size={20}/> },

    { id: 4, title: '量子算法模拟', description: '在浏览器端实现的高性能物理世界模拟计算框架。', image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=2670&auto=format&fit=crop', link: '#', icon: <Code size={20}/> },

  ];



  const containerRef = useRef(null);

  const [containerWidth, setContainerWidth] = useState(0);

  

  useEffect(() => {

    if (containerRef.current) setContainerWidth(containerRef.current.offsetWidth);

    const handleResize = () => { if (containerRef.current) setContainerWidth(containerRef.current.offsetWidth); };

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);

  }, []);



  const GAP = 20;

  const itemWidth = containerWidth > 768 ? 380 : 280; 

  const trackItemOffset = itemWidth + GAP;

  

  const [position, setPosition] = useState(1);

  const x = useMotionValue(0);



  useEffect(() => {

    x.set(-position * trackItemOffset);

  }, [trackItemOffset]);



  const handleDragEnd = (_, info) => {

    const { offset, velocity } = info;

    const direction = offset.x < -50 || velocity.x < -500 ? 1 : offset.x > 50 || velocity.x > 500 ? -1 : 0;

    if (direction !== 0) {

      setPosition(prev => {

        const next = prev + direction;

        return Math.max(0, Math.min(next, projects.length - 1));

      });

    } else {

      x.set(-position * trackItemOffset);

    }

  };



  return (

    <div ref={containerRef} className="w-full max-w-6xl mx-auto overflow-hidden py-10">

      <motion.div

        drag="x" dragConstraints={{ left: -trackItemOffset * (projects.length - 1), right: 0 }}

        style={{ x, perspective: 1500, display: "flex", gap: GAP }}

        onDragEnd={handleDragEnd}

        animate={{ x: -(position * trackItemOffset) }}

        transition={{ type: 'spring', stiffness: 200, damping: 25 }}

        className="px-[calc(50vw-140px)] md:px-[calc(50%-190px)]"

      >

        {projects.map((item, index) => (

          <CarouselItem key={item.id} item={item} index={index} itemWidth={itemWidth} trackItemOffset={trackItemOffset} x={x} />

        ))}

      </motion.div>

      <div className="flex justify-center gap-4 mt-12">

         {projects.map((_, idx) => (

           <motion.div 

             key={idx} onClick={() => setPosition(idx)}

             animate={{ width: position === idx ? 32 : 8, backgroundColor: position === idx ? '#00e5ff' : '#334155' }}

             className="h-2 rounded-full cursor-pointer interactive-zone transition-all"

           />

         ))}

      </div>

    </div>

  );

}



// --- 其余页面组件保持纯正克制 ---

function HeroSection({ scrollY, onOpenTrigram }) {

  return (

    <section id="home" className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">

      <div className="relative z-10 flex flex-col items-center justify-center space-y-16 w-full px-4">

        {/* 传入回调函数实现点击触发 */}

        <Holographic3DBagua scrollY={scrollY} onOpenTrigram={onOpenTrigram} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.5, delay: 0.5 }} className="text-center pointer-events-none mt-12">

          <motion.h1 className="text-2xl md:text-4xl lg:text-5xl font-light tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-gray-500 via-white to-gray-500" style={{ backgroundSize: '200% auto' }} animate={{ backgroundPosition: ['200% center', '-200% center'] }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}>

            <ScrambleText text="以代码推演天机，以算力演化万物" />

          </motion.h1>

        </motion.div>

      </div>

    </section>

  );

}



function PersonalCard() {

  const [activeTab, setActiveTab] = useState('identity');

  const tabs = [

    { id: 'identity', label: '身份', content: { title: '我是谁', desc: '我是一名热衷于人工智能、机器学习和未来科技的前端开发者。致力于创造直观、引人入胜且具有未来感的数字体验。' } },

    { id: 'direction', label: '方向', content: { title: '职业路径', desc: '专注于 AI 应用开发与前端交互的深度融合，探索 Web3 与元宇宙的边界，构建连接现实与数字世界的桥梁。' } },

    { id: 'belief', label: '信念', content: { title: '核心结构', desc: '相信技术可以拓展人类的潜能。坚持长期主义，保持好奇心，持续迭代自我认知与技术栈。' } },

    { id: 'now', label: '现在', content: { title: '正在进行', desc: '正在构建个人 AI 知识中枢，开发生成式艺术工具，并深入研究大型语言模型的应用落地。' } }

  ];



  return (

    <True3DTilt className="w-full max-w-5xl mx-auto relative z-10" perspective={1200} tiltMax={8}>

      <div className="bg-[#050505]/60 backdrop-blur-2xl rounded-[2rem] p-8 md:p-12 flex flex-col md:flex-row gap-10 shadow-2xl geek-border w-full h-full" style={{ transformStyle: "preserve-3d" }}>

        <div className="flex flex-row md:flex-col gap-4 md:w-1/4" style={{ transform: "translateZ(30px)" }}>

          <div className="hidden md:flex items-center gap-2 mb-4 pl-4">

            <span className="w-1.5 h-1.5 bg-[#00e5ff] rounded-full"></span>

            <span className="micro-label">INDEX_MAP</span>

          </div>

          {tabs.map((tab, idx) => (

            <button key={tab.id} onMouseEnter={() => setActiveTab(tab.id)} className={`text-left px-4 py-3 rounded-xl transition-all duration-300 interactive-zone relative overflow-hidden group outline-none flex items-center justify-between ${activeTab === tab.id ? 'text-white bg-white/5' : 'text-gray-500 hover:text-gray-300'}`}>

              <span className="relative z-10 text-sm md:text-base font-medium tracking-wider">{tab.label}</span>

              <span className="micro-label relative z-10 opacity-50 tabular-data hidden md:block">0{idx + 1}</span>

              {activeTab === tab.id && ( <motion.div layoutId="activeTabIndicator" className="absolute left-0 top-0 bottom-0 w-1 bg-[#00e5ff] rounded-r-full hidden md:block" animate={{ boxShadow: ['0 0 2px rgba(0,229,255,0.2)', '0 0 12px rgba(0,229,255,0.8)', '0 0 2px rgba(0,229,255,0.2)'] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }} /> )}

              {activeTab === tab.id && ( <motion.div layoutId="activeTabIndicatorMobile" className="absolute bottom-0 left-0 right-0 h-1 bg-[#00e5ff] rounded-t-full md:hidden" /> )}

            </button>

          ))}

        </div>

        

        <div className="flex-1 relative min-h-[200px] flex items-center pl-0 md:pl-8 border-l-0 md:border-l border-white/5" style={{ transform: "translateZ(50px)" }}>

          <AnimatePresence mode="wait">

            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} className="w-full pointer-events-none">

              <div className="flex justify-between items-center mb-6">

                <p className="micro-label"><ScrambleText text={`// SEC_${tabs.find(t => t.id === activeTab).label.toUpperCase()}`} /></p>

                <p className="micro-label tabular-data hidden sm:block">MEM_ALLOC: {Math.floor(Math.random() * 40 + 20)}MB</p>

              </div>

              <h3 className="text-3xl md:text-4xl font-light text-white mb-6 tracking-wide drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]"><ScrambleText text={tabs.find(t => t.id === activeTab).content.title} /></h3>

              <p className="text-gray-400 text-lg leading-relaxed font-light tracking-wide">{tabs.find(t => t.id === activeTab).content.desc}</p>

            </motion.div>

          </AnimatePresence>

          <motion.div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/3 h-full hidden lg:flex justify-end items-center pointer-events-none" animate={{ opacity: [0.08, 0.25, 0.08] }} transition={{ duration: 5, ease: "easeInOut", repeat: Infinity, delay: 0.5 }}>

             <div className="w-40 h-40 bg-white rounded-full blur-[100px] mix-blend-screen"></div>

          </motion.div>

        </div>

      </div>

    </True3DTilt>

  );

}



function QASection() {

  const [question, setQuestion] = useState("");
  const [lastQuestion, setLastQuestion] = useState("（等待输入）");
  const [answer, setAnswer] = useState("请输入问题后点击发送。若知识库命中，将优先返回知识库答案；未命中则回退到 HTTP 大模型。");
  const [source, setSource] = useState("ready");
  const [citations, setCitations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [timestamp, setTimestamp] = useState(() => new Date());

  const apiBase = import.meta.env.VITE_API_BASE_URL || "";

  const runQuery = async () => {
    const q = question.trim();
    if (!q || isLoading) {
      return;
    }

    setIsLoading(true);
    setError("");
    setLastQuestion(q);

    try {
      const res = await fetch(`${apiBase}/api/qa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || `请求失败 (${res.status})`);
      }

      setAnswer(data?.answer || "暂无返回内容");
      setSource(data?.source || "none");
      setCitations(Array.isArray(data?.citations) ? data.citations : []);
      setTimestamp(new Date());
    } catch (err) {
      setSource("error");
      setError(err.message || "请求失败");
      setAnswer("请求失败，请检查 API 服务或网络配置。需要的话我可以帮你快速排查。");
      setCitations([]);
      setTimestamp(new Date());
    } finally {
      setIsLoading(false);
    }
  };

  const onInputKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runQuery();
    }
  };

  const statusMap = {
    ready: "READY",
    kb: "KB_HIT",
    kb_rag: "RAG_HIT",
    kb_rag_llm: "RAG_LLM",
    llm: "LLM_HTTP",
    llm_error: "LLM_ERROR",
    none: "NO_MATCH",
    error: "ERROR"
  };
  const statusLabel = statusMap[source] || "READY";

  return (

    <div className="w-full max-w-5xl mx-auto relative py-10 z-10">

      <motion.div className="absolute -left-32 top-10 w-80 h-80 bg-white rounded-full blur-[150px] pointer-events-none mix-blend-screen" animate={{ opacity: [0.02, 0.06, 0.02] }} transition={{ duration: 6, ease: "easeInOut", repeat: Infinity, delay: 1 }} />

      <div className="text-center mb-12 relative z-10 pointer-events-none">

        <span className="micro-label block mb-4">Qanto Signal</span>

        <h2 className="text-4xl md:text-5xl font-light tracking-wide text-white mb-4"><ScrambleText text="接入 QANTO 灵感中枢" /></h2>

        <p className="text-gray-500 font-light">优先检索知识库；未命中时自动通过 HTTP 请求大模型回答。</p>

      </div>

      <div className="relative z-10 mb-16">

        <div className="flex bg-[#111111]/90 backdrop-blur-md rounded-full p-2 w-full max-w-3xl mx-auto geek-border shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all focus-within:shadow-[0_4px_25px_rgba(255,255,255,0.1)] interactive-zone">

          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={onInputKeyDown}
            className="flex-1 bg-transparent px-6 outline-none text-gray-200 placeholder-gray-600 text-lg w-full cursor-none font-mono"
            placeholder="> 输入查询指令..."
          />

          <Magnetic>

            <motion.button
              onClick={runQuery}
              disabled={isLoading}
              className={`bg-white text-black px-10 py-3.5 rounded-full font-bold transition-colors block micro-label !text-black ${isLoading ? "opacity-70" : ""}`}
              animate={{ boxShadow: ['0 0 0px rgba(255,255,255,0)', '0 0 20px rgba(255,255,255,0.3)', '0 0 0px rgba(255,255,255,0)'] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              whileHover={{ scale: isLoading ? 1 : 1.05, backgroundColor: "#e5e7eb" }}
            >
              {isLoading ? "发送中" : "发送"}
            </motion.button>

          </Magnetic>

        </div>

      </div>

      <div className="bg-[#050505]/60 backdrop-blur-2xl geek-border rounded-3xl p-8 md:p-10 relative z-10 shadow-2xl">

        <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">

          <div className="flex items-center gap-3">

             <span className={`w-2 h-2 rounded-full shadow-[0_0_8px_#00e5ff] ${isLoading ? "bg-amber-300 animate-pulse" : "bg-[#00e5ff]"}`}></span>

             <span className="micro-label">SYS_QUERY_LOG</span>

          </div>

          <span className="micro-label tabular-data text-[10px]">TS: {timestamp.toLocaleTimeString("zh-CN", { hour12: false })}</span>

        </div>

        <div className="mb-8">

          <p className="micro-label mb-3">INPUT_STRING</p>

          <h3 className="text-white text-xl md:text-2xl font-light tracking-wide">{lastQuestion}</h3>

        </div>

        <div className="pt-8 border-t border-white/5">

          <div className="flex justify-between items-center mb-5">

            <p className="micro-label">OUTPUT_BUFFER</p>

            <p className={`tabular-data text-[10px] px-3 py-1 rounded-full border ${source === "error" ? "text-red-300 bg-red-500/10 border-red-400/20" : "text-[#00e5ff] bg-[#00e5ff]/10 border-[#00e5ff]/20"}`}>STATUS: {statusLabel}</p>

          </div>

          <p className="text-gray-300 leading-relaxed text-base md:text-lg font-light tracking-wide whitespace-pre-line">{answer}</p>

          {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

          {citations.length > 0 && (
            <div className="mt-6 border-t border-white/5 pt-4">
              <p className="micro-label mb-3">KNOWLEDGE_SOURCES</p>
              <ul className="space-y-2 text-sm text-gray-400">
                {citations.map((item, idx) => (
                  <li key={`${item.file || "src"}-${idx}`} className="tabular-data">
                    [{idx + 1}] {item.file || item.fileName || "未知来源"} {item.score ? `(score: ${item.score})` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>

      </div>

    </div>

  );

}



function ContentSection({ id, children }) {

  return (

    <section id={id} className="relative py-24 bg-transparent">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        <motion.div initial={{ opacity: 0, y: 80, clipPath: "inset(100% 0% 0% 0%)" }} whileInView={{ opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0%)" }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} >

          {children}

        </motion.div>

      </div>

    </section>

  );

}



function Footer() {

  return (

    <footer className="bg-[#020202]/80 py-16 relative z-10 backdrop-blur-2xl border-t border-white/5">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">

        <div className="mb-8 pointer-events-none"><span className="text-white font-bold text-2xl tracking-widest">乾启 QANTO</span></div>

        <div className="flex justify-center space-x-8 mb-10">

          <Magnetic><a href="#" className="text-gray-600 hover:text-white transition-colors interactive-zone block p-2"><Github className="w-6 h-6" /></a></Magnetic>

          <Magnetic><a href="#" className="text-gray-600 hover:text-white transition-colors interactive-zone block p-2"><Twitter className="w-6 h-6" /></a></Magnetic>

          <Magnetic><a href="#" className="text-gray-600 hover:text-white transition-colors interactive-zone block p-2"><Linkedin className="w-6 h-6" /></a></Magnetic>

        </div>

        <p className="text-gray-600 text-sm pointer-events-none">© {new Date().getFullYear()} QANTO 灵感中枢. 保留所有权利. <br /><span className="mt-2 block">AI 与个人事业实验</span></p>

      </div>

    </footer>

  );

}



export default function App() {

  const [isBooting, setIsBooting] = useState(true);

  const [activeTrigram, setActiveTrigram] = useState(null); 

  

  const wrapperRef = useRef(null);

  const scrollContainerRef = useRef(null);

  const progressBarRef = useRef(null);

  const scrollData = useRef({ current: 0, target: 0, limit: 0, ease: 0.08 });

  

  const globalScrollY = useMotionValue(0);

  const isModalOpenRef = useRef(false);



  useEffect(() => {

    isModalOpenRef.current = !!activeTrigram;

  }, [activeTrigram]);



  useEffect(() => {

    if (isBooting) return;

    const wrapper = wrapperRef.current;

    const container = scrollContainerRef.current;

    if (!wrapper || !container) return;



    const updateLimit = () => {

      setTimeout(() => {

        scrollData.current.limit = Math.max(0, container.getBoundingClientRect().height - window.innerHeight);

      }, 100);

    };

    updateLimit();

    const resizeObserver = new ResizeObserver(updateLimit);

    resizeObserver.observe(container);



    const onWheel = (e) => {

      if (isModalOpenRef.current) return;

      scrollData.current.target = Math.max(0, Math.min(scrollData.current.target + e.deltaY, scrollData.current.limit));

    };



    let touchStartY = 0, touchStartX = 0;

    const onTouchStart = (e) => { 

      touchStartY = e.touches[0].clientY; 

      touchStartX = e.touches[0].clientX;

    };

    const onTouchMove = (e) => {

      if (isModalOpenRef.current) return;

      const deltaY = touchStartY - e.touches[0].clientY;

      const deltaX = touchStartX - e.touches[0].clientX;

      if (Math.abs(deltaX) > Math.abs(deltaY)) return;



      touchStartY = e.touches[0].clientY;

      touchStartX = e.touches[0].clientX;

      scrollData.current.target = Math.max(0, Math.min(scrollData.current.target + deltaY, scrollData.current.limit));

    };



    wrapper.addEventListener('wheel', onWheel, { passive: true });

    wrapper.addEventListener('touchstart', onTouchStart, { passive: true });

    wrapper.addEventListener('touchmove', onTouchMove, { passive: true });



    let frameId;

    const render = () => {

      scrollData.current.current += (scrollData.current.target - scrollData.current.current) * scrollData.current.ease;

      container.style.transform = `translateY(-${scrollData.current.current}px)`;

      

      globalScrollY.set(scrollData.current.current);



      if (progressBarRef.current && scrollData.current.limit > 0) {

        const progress = scrollData.current.current / scrollData.current.limit;

        progressBarRef.current.style.transform = `scaleY(${progress})`;

      }

      frameId = requestAnimationFrame(render);

    };

    render();



    const handleNavClick = (e) => {

      const target = e.target.closest('a[href^="#"]');

      if (target) {

        e.preventDefault();

        const id = target.getAttribute('href').slice(1);

        const el = document.getElementById(id);

        if (el) {

           scrollData.current.target = Math.max(0, Math.min(el.offsetTop, scrollData.current.limit));

        }

      }

    };

    document.addEventListener('click', handleNavClick);



    return () => {

      resizeObserver.disconnect();

      wrapper.removeEventListener('wheel', onWheel);

      wrapper.removeEventListener('touchstart', onTouchStart);

      wrapper.removeEventListener('touchmove', onTouchMove);

      document.removeEventListener('click', handleNavClick);

      cancelAnimationFrame(frameId);

    };

  }, [isBooting, globalScrollY]);



  return (

    <>

      <style>{globalStyles}</style>



      {/* 极简动态胶片白噪点 */}

      <div className="pointer-events-none fixed inset-0 z-[9999] opacity-[0.03] mix-blend-screen film-grain" />



      {/* 启动自检屏 */}

      <AnimatePresence>

        {isBooting && <BootSequence onComplete={() => setIsBooting(false)} />}

      </AnimatePresence>



      {/* 全局包装器：接管所有滚动，touch-action pan-x 保证横向轮播图不失效 */}

      <div ref={wrapperRef} className="bg-[#020202] min-h-screen font-sans text-gray-100 cursor-none selection:bg-white/20 selection:text-white fixed inset-0 w-full h-full overflow-hidden" style={{ touchAction: 'pan-x' }}>

        

        <StarryBackground />

        {!isBooting && <CulturalOrnaments />}

        

        <CustomCursor />

        <BubbleMenuOverlay />

        

        {/* 已根据要求移除 LiveTelemetryHUD 数据面板 */}

        

        {!isBooting && (

          <div className="fixed top-0 right-0 w-[2px] h-full bg-white/5 z-[100] pointer-events-none mix-blend-screen">

            <div ref={progressBarRef} className="w-full h-full bg-[#00e5ff] origin-top will-change-transform scale-y-0 shadow-[0_0_10px_#00e5ff]" />

          </div>

        )}



        {/* 关键修复点：独立挂载于全局的力场层，脱离 transform 容器 */}

        <AnimatePresence>

          {activeTrigram && (

             <ResonanceField trigram={activeTrigram} onClose={() => setActiveTrigram(null)} />

          )}

        </AnimatePresence>



        <div ref={scrollContainerRef} className="w-full will-change-transform">

          {!isBooting && (

            <>

              {/* 向八卦阵组件透传点击打开模态框的回调 */}

              <HeroSection scrollY={globalScrollY} onOpenTrigram={setActiveTrigram} />

              <ContentSection id="about"><PersonalCard /></ContentSection>

              <ContentSection id="knowledge"><QASection /></ContentSection>

              

              <ContentSection id="portfolio">

                <div className="text-center mb-10 relative z-10 pointer-events-none">

                   <span className="micro-label block mb-4">Portfolio</span>

                   <h2 className="text-4xl md:text-5xl font-light text-white tracking-wide">

                     <ScrambleText text="成果展示" />

                   </h2>

                </div>

                <HolographicCarousel />

              </ContentSection>

              

              <Footer />

            </>

          )}

        </div>

      </div>

    </>

  );

}

