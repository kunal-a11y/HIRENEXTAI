import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useMotionValue, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';

// The fill and tick both use the actual viewport midpoint, not item indexes.
function useGeometry(ref, containerRef, update) {
  useEffect(() => {
    let frame;
    const measure = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    const observer = new ResizeObserver(measure);
    if (ref.current) observer.observe(ref.current);
    if (containerRef?.current) observer.observe(containerRef.current);
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    measure();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('scroll', measure); window.removeEventListener('resize', measure); };
  }, [ref, containerRef, update]);
}
export function ScrollTimelineTrack({ containerRef, lineXClass = 'left-6 md:left-8', topOffset = 22, bottomOffset = 22 }) {
  const ref = useRef(null);
  const height = useMotionValue(0);
  const measure = useCallback(() => {
    const box = ref.current?.getBoundingClientRect();
    if (box) height.set(Math.max(0, Math.min(box.height, window.innerHeight / 2 - box.top)));
  }, [height]);
  useGeometry(ref, containerRef, measure);
  return <div ref={ref} aria-hidden="true" className={`absolute ${lineXClass} w-[3px] -translate-x-1/2 rounded-full overflow-hidden`} style={{ top: topOffset, bottom: bottomOffset, background: '#e2eaf4' }}><motion.div style={{ height, background: 'linear-gradient(#2563eb,#1c9a88)' }} className="w-full rounded-full" /></div>;
}
export function TimelineNode({ containerRef, nodeClass = 'left-6 md:left-8 top-[12px]' }) {
  const ref = useRef(null);
  const [active, setActive] = useState(false);
  const reduced = useReducedMotion();
  const measure = useCallback(() => {
    const box = ref.current?.getBoundingClientRect();
    if (box) setActive(box.top + box.height / 2 <= window.innerHeight / 2 + .5);
  }, []);
  useGeometry(ref, containerRef, measure);
  return <div ref={ref} aria-hidden="true" data-timeline-active={active} className={`absolute ${nodeClass} -translate-x-1/2 z-10 flex items-center justify-center w-[22px] h-[22px] rounded-full border-2`} style={{ background: active ? '#168b79' : 'white', borderColor: active ? '#168b79' : '#c4d3e7' }}>
    {active && <motion.span initial={reduced ? false : { scale: .6 }} animate={{ scale: 1 }} transition={{ duration: .16 }}><Check size={13} color="white" strokeWidth={3} /></motion.span>}
  </div>;
}
