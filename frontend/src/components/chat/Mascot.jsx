import React, { useEffect, useState, useRef, useId } from "react";
import { motion } from "framer-motion";

export default function Mascot({ chatState = "idle", sendHovered = false, inline = false, size = 80, className = "" }) {
  const uniqueId = useId().replace(/:/g, "");
  const [behaviorState, setBehaviorState] = useState("sleeping"); // sleeping | idle | awakening | clicking | dizzy | recovering | thinking | typing
  const [isAsleep, setIsAsleep] = useState(document.hidden);
  const [leftEyeOpen, setLeftEyeOpen] = useState(!document.hidden);
  const [rightEyeOpen, setRightEyeOpen] = useState(!document.hidden);
  const [headTilt, setHeadTilt] = useState(0);
  const [waking, setWaking] = useState(false);
  const [mascotGlance, setMascotGlance] = useState("center"); // center | left | right

  const [confused, setConfused] = useState(false);
  const [surprised, setSurprised] = useState(false);
  const [isDizzy, setIsDizzy] = useState(false);
  const [bodyWiggle, setBodyWiggle] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [happyBlink, setHappyBlink] = useState(false);
  const [zzzList, setZzzList] = useState([]);
  const [isWaving, setIsWaving] = useState(false);
  const [eyePulse, setEyePulse] = useState(false);
  const [sparkles, setSparkles] = useState([]);

  // States for wiggles, taps
  const [rightWiggle, setRightWiggle] = useState(false);
  const [leftTap, setLeftTap] = useState(false);
  const [sendClickTap, setSendClickTap] = useState(false);

  // Dizzy spin angle
  const [spinAngle, setSpinAngle] = useState(0);

  // Thought cloud states
  const cloudIcons = ["dots", "question", "gear", "lightbulb"];
  const [cloudIconIdx, setCloudIconIdx] = useState(0);

  const mascotRef = useRef(null);
  const clickLockRef = useRef(false);

  // Click tracking refs for single / double click
  const clickTimeoutRef = useRef(null);
  const wakeTimerRef = useRef([]);
  const dizzyTimerRef = useRef(null);
  const recoveryTimerRef = useRef([]);
  const clickTimerRef = useRef([]);

  // Clear timers helper
  const clearWakeTimers = () => {
    wakeTimerRef.current.forEach((t) => clearTimeout(t));
    wakeTimerRef.current = [];
  };

  const clearRecoveryTimers = () => {
    recoveryTimerRef.current.forEach((t) => clearTimeout(t));
    recoveryTimerRef.current = [];
  };

  const clearClickTimers = () => {
    clickTimerRef.current.forEach((t) => clearTimeout(t));
    clickTimerRef.current = [];
  };

  // Sync prop chatState to local behaviorState with lock and priority gating rules
  useEffect(() => {
    if (isAsleep) {
      setBehaviorState("sleeping");
      return;
    }

    // Animation Gating: DIZZY, RECOVERING, AWAKENING, clicking have absolute priority
    const isLocked =
      behaviorState === "dizzy" ||
      behaviorState === "recovering" ||
      behaviorState === "awakening" ||
      behaviorState === "clicking";

    if (isLocked) {
      return;
    }

    if (chatState === "sent") {
      clickLockRef.current = true;
      setBehaviorState("clicking");
      setEyePulse(true);
      setSendClickTap(true);
      
      // Sparkle near the hand click target
      setSparkles([{ id: Math.random(), dx: 30, dy: 10 }]);
      
      const timer = setTimeout(() => {
        setEyePulse(false);
        setSparkles([]);
        setSendClickTap(false);
        clickLockRef.current = false;
        setBehaviorState("thinking");
      }, 500);
      return () => clearTimeout(timer);
    }

    if (clickLockRef.current) return;

    if (chatState === "thinking") {
      setBehaviorState("thinking");
    } else if (chatState === "complete") {
      setBehaviorState("complete");
      setHappyBlink(true);
      setIsWaving(true);
      setSparkles([
        { id: Math.random(), dx: -15, dy: -25 },
        { id: Math.random(), dx: 18, dy: -18 }
      ]);
      const timer = setTimeout(() => {
        setHappyBlink(false);
        setIsWaving(false);
        setSparkles([]);
        setBehaviorState("idle");
      }, 1500);
      return () => clearTimeout(timer);
    } else if (chatState === "typing") {
      setBehaviorState("typing");
    } else if (chatState === "error") {
      setBehaviorState("dizzy");
    } else {
      setBehaviorState("idle");
    }
  }, [chatState, isAsleep, behaviorState]);

  // Tab Leave (Sleep) and Return (Wake up) logic
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsAsleep(true);
        setLeftEyeOpen(false);
        setRightEyeOpen(false);
        setHeadTilt(0);
        setBehaviorState("sleeping");
      } else {
        setIsAsleep(false);
        setLeftEyeOpen(true);
        setRightEyeOpen(true);
        setBehaviorState("idle");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Wiggle right hand and tap left hand on border periodically (Subtle arm movement)
  useEffect(() => {
    if (isAsleep || behaviorState !== "idle" && behaviorState !== "thinking") return;

    const wiggleInterval = setInterval(() => {
      setRightWiggle(true);
      setTimeout(() => setRightWiggle(false), 1200);
    }, 24000); // wiggle right hand every 24s

    const tapInterval = setInterval(() => {
      setLeftTap(true);
      setTimeout(() => setLeftTap(false), 1000);
    }, 16000); // tap left hand on border every 16s

    return () => {
      clearInterval(wiggleInterval);
      clearInterval(tapInterval);
    };
  }, [isAsleep, behaviorState]);

  // Randomly cycle thought cloud icons when user is typing (Only active when awake/idle/thinking)
  useEffect(() => {
    if (chatState !== "typing" || isAsleep || behaviorState !== "thinking") return;

    const interval = setInterval(() => {
      setCloudIconIdx((prev) => {
        let next = Math.floor(Math.random() * cloudIcons.length);
        while (next === prev) {
          next = Math.floor(Math.random() * cloudIcons.length);
        }
        return next;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [chatState, isAsleep, behaviorState]);

  // Floating dark Zzz particles during sleep
  useEffect(() => {
    if (!isAsleep) {
      setZzzList([]);
      return;
    }

    const interval = setInterval(() => {
      setZzzList((prev) => [
        ...prev.slice(-3),
        { 
          id: Math.random(), 
          x: 40 + Math.random() * 15, 
          y: 20,
          size: 7 + Math.random() * 5,
          color: Math.random() > 0.5 ? "#111111" : "#555555"
        }
      ]);
    }, 1800);

    return () => clearInterval(interval);
  }, [isAsleep]);

  // Pupil rotation interval for dizzy mode
  useEffect(() => {
    if (behaviorState !== "dizzy") return;

    const interval = setInterval(() => {
      setSpinAngle((prev) => (prev + 0.3) % (Math.PI * 2));
    }, 30);

    return () => clearInterval(interval);
  }, [behaviorState]);

  // Cursor Tracking for pupil parallax - "lazy tracking":
  // Glances at moving mouse, then relaxes back to center after 1.5s of no movement
  useEffect(() => {
    let idleTimer;

    const handleMouseMove = (e) => {
      // Mouse follow active in IDLE, TYPING and THINKING states
      if (isAsleep || (behaviorState !== "idle" && behaviorState !== "thinking" && behaviorState !== "typing") || waking || sendHovered) return;

      const el = mascotRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const mascotCenterX = rect.left + rect.width / 2;
      const mascotCenterY = rect.top + rect.height / 2;

      const dx = e.clientX - mascotCenterX;
      const dy = e.clientY - mascotCenterY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const maxOffset = 2.5; // smooth movement up to 2.5px
      const angle = Math.atan2(dy, dx);
      const moveX = Math.cos(angle) * Math.min(maxOffset, dist / 80);
      const moveY = Math.sin(angle) * Math.min(maxOffset, dist / 80);

      setMousePos({ x: moveX, y: moveY });

      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        setMousePos({ x: 0, y: 0 });
      }, 1500);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(idleTimer);
    };
  }, [isAsleep, behaviorState, waking, sendHovered]);

  // Slow organic blink timer (every 5-10s with 150ms duration)
  useEffect(() => {
    // Only blink naturally in idle or thinking states
    if (isAsleep || happyBlink || behaviorState !== "idle" && behaviorState !== "thinking") return;

    let blinkTimeout;

    const triggerBlink = () => {
      setIsBlinking(true);
      setTimeout(() => {
        setIsBlinking(false);
      }, 150); // Blink duration 150ms

      scheduleNextBlink();
    };

    const scheduleNextBlink = () => {
      const delay = 5000 + Math.random() * 5000; // Random interval 5-10 seconds
      blinkTimeout = setTimeout(triggerBlink, delay);
    };

    scheduleNextBlink();

    return () => clearTimeout(blinkTimeout);
  }, [isAsleep, happyBlink, behaviorState]);

  // Click router (Single vs. Double click logic)
  const handleMascotClick = (e) => {
    e.stopPropagation();

    if (clickTimeoutRef.current) {
      // Double click detected!
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      triggerDoubleClick();
    } else {
      // Start 250ms single click detector
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;
        triggerSingleClick();
      }, 250);
    }
  };

  // 1. Single Click trigger
  const triggerSingleClick = () => {
    if (isAsleep) {
      // Wake up sequence (AWAKENING)
      clearWakeTimers();
      setIsAsleep(false);
      setBehaviorState("awakening");
      setLeftEyeOpen(false);
      setRightEyeOpen(false);
      setHeadTilt(0);
      setMascotGlance("center");
      
      const t1 = setTimeout(() => {
        setLeftEyeOpen(true);
      }, 150);
      
      const t2 = setTimeout(() => {
        setRightEyeOpen(true);
      }, 400); // 150 + 250
      
      const t3 = setTimeout(() => {
        setSurprised(true);
        setEyePulse(true); // pulses golden glow
        setBodyWiggle(true); // body shake
      }, 550); // 400 + 150
      
      const t4 = setTimeout(() => {
        setSurprised(false);
        setEyePulse(false);
        setBodyWiggle(false);
        setHeadTilt(-6);
      }, 850); // 550 + 300
      
      const t5 = setTimeout(() => {
        setMascotGlance("left");
      }, 1150); // 850 + 300
      
      const t6 = setTimeout(() => {
        setMascotGlance("right");
      }, 1550); // 1150 + 400
      
      const t7 = setTimeout(() => {
        setMascotGlance("center");
        setHeadTilt(0);
        setBehaviorState("idle");
      }, 1950); // 1550 + 400
      
      wakeTimerRef.current = [t1, t2, t3, t4, t5, t6, t7];
    } else {
      // Awake: Single Click Reaction (clicking state)
      // Ignore if currently dizzy, recovering, or awakening
      if (behaviorState !== "idle" && behaviorState !== "thinking" && behaviorState !== "complete") return;

      clearClickTimers();
      setBehaviorState("clicking");

      const t1 = setTimeout(() => {
        setBehaviorState("idle");
      }, 800); // lasts exactly 0.8 seconds

      clickTimerRef.current = [t1];
    }
  };

  // 2. Double Click trigger (DIZZY state)
  const triggerDoubleClick = () => {
    // Clear any active wake, click, or recovery sequences
    clearWakeTimers();
    clearClickTimers();
    clearRecoveryTimers();
    if (dizzyTimerRef.current) clearTimeout(dizzyTimerRef.current);

    setIsAsleep(false);
    setLeftEyeOpen(true);
    setRightEyeOpen(true);
    setSurprised(false);
    setEyePulse(false);
    setBodyWiggle(false);
    setHappyBlink(false);
    setIsDizzy(true);
    setMascotGlance("center");

    setBehaviorState("dizzy");

    // Dizzy Mode lasts exactly 3 seconds
    dizzyTimerRef.current = setTimeout(() => {
      setIsDizzy(false);
      
      // Transition to RECOVERING state (lasts 2 seconds)
      setBehaviorState("recovering");
      setConfused(true);
      setMascotGlance("left");
      
      // Trigger a slow blink at the start of recovery
      setIsBlinking(true);
      const tBlink = setTimeout(() => {
        setIsBlinking(false);
      }, 350); // slow 350ms blink

      const tLookRight = setTimeout(() => {
        setMascotGlance("right");
      }, 800);

      const tLookCenter = setTimeout(() => {
        setMascotGlance("center");
      }, 1500);

      const tFinishRecovery = setTimeout(() => {
        setConfused(false);
        setBehaviorState("idle");
      }, 2000);

      recoveryTimerRef.current = [tBlink, tLookRight, tLookCenter, tFinishRecovery];
    }, 3000);
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearWakeTimers();
      clearClickTimers();
      clearRecoveryTimers();
      if (dizzyTimerRef.current) clearTimeout(dizzyTimerRef.current);
    };
  }, []);

  const [idleGlance, setIdleGlance] = useState({ x: 0, y: 0 });

  // Random glance loop when in idle state and mouse is centered/inactive
  useEffect(() => {
    if (behaviorState !== "idle" || isAsleep || mousePos.x !== 0 || mousePos.y !== 0) {
      setIdleGlance({ x: 0, y: 0 });
      return;
    }

    let timer;
    const scheduleNextGlance = () => {
      const delay = 3000 + Math.random() * 4000;
      timer = setTimeout(() => {
        const rand = Math.random();
        if (rand < 0.6) {
          setIdleGlance({ x: 0, y: 0 });
        } else if (rand < 0.75) {
          setIdleGlance({ x: -1.5, y: -0.3 });
        } else if (rand < 0.9) {
          setIdleGlance({ x: 1.5, y: -0.3 });
        } else {
          setIdleGlance({ x: 0, y: -1.0 });
        }
        
        setTimeout(() => {
          setIdleGlance({ x: 0, y: 0 });
        }, 1000 + Math.random() * 1000);

        scheduleNextGlance();
      }, delay);
    };

    scheduleNextGlance();

    return () => clearTimeout(timer);
  }, [behaviorState, isAsleep, mousePos.x, mousePos.y]);

  const isMouseActive = mousePos.x !== 0 || mousePos.y !== 0;
  let leftPupilX = isMouseActive ? mousePos.x : idleGlance.x;
  let leftPupilY = isMouseActive ? mousePos.y : idleGlance.y;
  let rightPupilX = isMouseActive ? mousePos.x : idleGlance.x;
  let rightPupilY = isMouseActive ? mousePos.y : idleGlance.y;

  if (isAsleep) {
    leftPupilX = 0; rightPupilX = 0;
    leftPupilY = 0; rightPupilY = 0;
  } else if (behaviorState === "dizzy") {
    // Dilated spinning pupils rotating in opposite circular phases
    leftPupilX = Math.cos(spinAngle) * 2.2;
    leftPupilY = Math.sin(spinAngle) * 2.2;
    rightPupilX = Math.cos(spinAngle + Math.PI) * 2.2;
    rightPupilY = Math.sin(spinAngle + Math.PI) * 2.2;
  } else if (behaviorState === "recovering" || confused) {
    // Confused cross-eyed pupils shifted by glances
    const shiftX = mascotGlance === "left" ? -0.8 : mascotGlance === "right" ? 0.8 : 0;
    leftPupilX = 1.2 + shiftX;
    rightPupilX = -1.2 + shiftX;
    leftPupilY = 0.5;
    rightPupilY = 0.5;
  } else if (behaviorState === "typing") {
    leftPupilX = (isMouseActive ? mousePos.x : 0) * 0.5;
    rightPupilX = (isMouseActive ? mousePos.x : 0) * 0.5;
    leftPupilY = 1.5;
    rightPupilY = 1.5;
  } else if (behaviorState === "awakening" || behaviorState === "clicking") {
    // Look center or wide-eyed
    leftPupilX = 0; rightPupilX = 0;
    leftPupilY = 0; rightPupilY = 0;
  } else if (sendHovered) {
    // Look completely right towards the send button
    leftPupilX = 2.2;
    rightPupilX = 2.2;
    leftPupilY = 0.3;
    rightPupilY = 0.3;
  }

  // Thinking orbit particles
  const orbitParticles = [
    { id: 1, color: "#FFC933", radius: 1.0, distanceX: 28, distanceY: 7, speed: 1.6, phase: 0 },
    { id: 2, color: "#FFFFFF", radius: 0.8, distanceX: 32, distanceY: 9, speed: 2.2, phase: Math.PI / 2 },
  ];

  const sparkleVariants = {
    hidden: { opacity: 0, scale: 0 },
    visible: (custom) => ({
      opacity: [0, 1, 0],
      scale: [0, 1.2, 0.4],
      x: custom.dx,
      y: custom.dy,
      transition: { duration: 0.8, ease: "easeOut" }
    })
  };

  const containerStyle = inline ? {
    position: "relative",
    width: `${size}px`,
    height: `${size}px`,
    display: "inline-block",
    verticalAlign: "middle",
  } : {
    position: "absolute",
    top: "-80px",
    width: "80px",
    height: "80px",
    pointerEvents: "none",
  };

  return (
    <div className={inline ? "relative overflow-visible" : (className || "absolute pointer-events-none right-[40px] scale-[0.65] sm:scale-75 md:scale-90 lg:scale-100 origin-bottom transition-all duration-300 overflow-visible")} style={containerStyle}>
      {/* 1. MASCOT UNDERLAY (z-index = 1 or 90 to peek behind parent input border) */}
      <motion.div
        ref={mascotRef}
        id="blob-mascot-underlay"
        className="absolute inset-0 pointer-events-none select-none overflow-visible"
        style={{
          zIndex: inline ? 1 : 290,
        }}
      >
        <div className="relative w-full h-full overflow-visible">
          {/* Floating dark Zzz particles for Sleep Mode */}
          {isAsleep && zzzList.map((z) => (
            <motion.div
              key={z.id}
              className="absolute font-black pointer-events-none select-none z-30"
              style={{ 
                left: `${z.x}%`, 
                top: `${z.y}%`,
                color: z.color,
                fontSize: `${z.size}px`
              }}
              initial={{ opacity: 0, scale: 0.6, y: 0 }}
              animate={{
                opacity: [0, 0.8, 0],
                scale: [0.6, 1.0, 1.2],
                y: -40,
                x: [0, 5, -5, 0]
              }}
              transition={{ duration: 3.0, ease: "easeOut" }}
            >
              Z
            </motion.div>
          ))}

          {/* Orbiting particles when Thinking */}
          {behaviorState === "thinking" && orbitParticles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute rounded-full pointer-events-none z-10"
              style={{
                width: p.radius * 2,
                height: p.radius * 2,
                backgroundColor: p.color,
                left: "40px",
                top: "44px",
                boxShadow: p.color === "#FFC933" ? "0 0 4px #FFC933" : "none",
                transform: "translate(-50%, -50%)"
              }}
              animate={{
                x: [
                  Math.cos(p.phase) * p.distanceX,
                  Math.cos(p.phase + Math.PI / 2) * p.distanceX,
                  Math.cos(p.phase + Math.PI) * p.distanceX,
                  Math.cos(p.phase + Math.PI * 1.5) * p.distanceX,
                  Math.cos(p.phase) * p.distanceX,
                ],
                y: [
                  Math.sin(p.phase) * p.distanceY,
                  Math.sin(p.phase + Math.PI / 2) * p.distanceY,
                  Math.sin(p.phase + Math.PI) * p.distanceY,
                  Math.sin(p.phase + Math.PI * 1.5) * p.distanceY,
                  Math.sin(p.phase) * p.distanceY,
                ],
                opacity: [0.5, 0.8, 0.4, 0.7, 0.5]
              }}
              transition={{ repeat: Infinity, duration: p.speed, ease: "linear" }}
            />
          ))}

          <svg
            viewBox="0 0 100 100"
            className="w-full h-full overflow-visible pointer-events-none select-none"
          >
            <defs>
              {/* Blob glossy body gradient */}
              <radialGradient id={`blobGrad-${uniqueId}`} cx="40%" cy="35%" r="60%">
                <stop offset="0%" stopColor="#3A3A3A" />
                <stop offset="60%" stopColor="#141414" />
                <stop offset="100%" stopColor="#050505" />
              </radialGradient>

              {/* Glowing Golden Eyes gradient */}
              <radialGradient id={`eyeGlow-${uniqueId}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FFF7A3" />
                <stop offset="40%" stopColor="#FFC933" />
                <stop offset="85%" stopColor="#FF9E0D" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#FF5722" stopOpacity="0" />
              </radialGradient>

              {/* Left Eye Eyelid Clip */}
              <clipPath id={`leftEyeClip-${uniqueId}`}>
                <motion.circle
                  cx="36"
                  cy="44"
                  r="7.5"
                  animate={
                    isAsleep ? { scaleY: 0.4, originY: 44 } :
                    happyBlink ? { scaleY: 0, originY: 44 } :
                    behaviorState === "awakening" && !leftEyeOpen ? { scaleY: 0.4, originY: 44 } :
                    isBlinking ? { scaleY: 0.08, originY: 44 } :
                    behaviorState === "thinking" ? { scaleY: 1.0, originY: 44 } :
                    behaviorState === "typing" ? { scaleY: 1.0, originY: 44 } :
                    behaviorState === "clicking" || surprised ? { scaleY: 1.15, scaleX: 1.15, originY: 44 } :
                    behaviorState === "dizzy" || behaviorState === "recovering" ? { scaleY: 0.80, originY: 44 } :
                    sendHovered ? { scaleY: 1.0, originY: 44 } :
                    { scaleY: 1.0 }
                  }
                  transition={{ duration: 0.12 }}
                />
              </clipPath>

              {/* Left Eye Squint Smile Clip */}
              <clipPath id={`leftEyeSmileClip-${uniqueId}`}>
                <path d="M 28.5,44 A 7.5,7.5 0 1,1 43.5,44 Q 36,48.5 28.5,44" />
              </clipPath>

              {/* Right Eye Eyelid Clip */}
              <clipPath id={`rightEyeClip-${uniqueId}`}>
                <motion.circle
                  cx="64"
                  cy="44"
                  r="7.5"
                  animate={
                    isAsleep ? { scaleY: 0.4, originY: 44 } :
                    happyBlink ? { scaleY: 0, originY: 44 } :
                    behaviorState === "awakening" && !rightEyeOpen ? { scaleY: 0.4, originY: 44 } :
                    isBlinking ? { scaleY: 0.08, originY: 44 } :
                    behaviorState === "thinking" ? { scaleY: 1.0, originY: 44 } :
                    behaviorState === "typing" ? { scaleY: 1.0, originY: 44 } :
                    behaviorState === "clicking" || surprised ? { scaleY: 1.15, scaleX: 1.15, originY: 44 } :
                    behaviorState === "dizzy" || behaviorState === "recovering" ? { scaleY: 0.80, originY: 44 } :
                    sendHovered ? { scaleY: 1.0, originY: 44 } :
                    { scaleY: 1.0 }
                  }
                  transition={{ duration: 0.12 }}
                />
              </clipPath>

              {/* Right Eye Squint Smile Clip */}
              <clipPath id={`rightEyeSmileClip-${uniqueId}`}>
                <path d="M 56.5,44 A 7.5,7.5 0 1,1 71.5,44 Q 64,48.5 56.5,44" />
              </clipPath>

              {/* Gaussian Blur Filter for glows */}
              <filter id={`glowBlur-${uniqueId}`}>
                <feGaussianBlur stdDeviation="1.5" />
              </filter>
            </defs>

            {/* Golden Pulse Shockwaves on Message Sent */}
            {eyePulse && (
              <>
                <motion.circle
                  cx="36"
                  cy="44"
                  r="7.5"
                  stroke="#FFC933"
                  strokeWidth="2.0"
                  fill="none"
                  initial={{ scale: 1, opacity: 1 }}
                  animate={{ scale: 2.8, opacity: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  style={{ transformOrigin: "36px 44px" }}
                />
                <motion.circle
                  cx="64"
                  cy="44"
                  r="7.5"
                  stroke="#FFC933"
                  strokeWidth="2.0"
                  fill="none"
                  initial={{ scale: 1, opacity: 1 }}
                  animate={{ scale: 2.8, opacity: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  style={{ transformOrigin: "64px 44px" }}
                />
              </>
            )}

            {/* Sparkles on AI completes Response (Received State) and click Send */}
            {sparkles.map((sp) => (
              <motion.svg
                key={sp.id}
                width="12"
                height="12"
                viewBox="0 0 10 10"
                className="absolute top-1/2 left-1/2 overflow-visible pointer-events-none z-30"
                variants={sparkleVariants}
                initial="hidden"
                animate="visible"
                custom={sp}
              >
                <polygon points="5,0 6,3 9,4 6,5 5,8 4,5 1,4 4,3" fill="#FFC933" />
              </motion.svg>
            ))}

            {/* Thought Cloud Indicator when user is typing (Only active when awake/thinking) */}
            <motion.g
              initial={{ scale: 0, opacity: 0 }}
              animate={
                !isAsleep && behaviorState === "thinking" ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }
              }
              transition={{ duration: 0.3, ease: "easeOut" }}
              style={{ transformOrigin: "50px 25px" }}
            >
              {/* Cloud tail dots */}
              <circle cx="42" cy="24" r="2.5" fill="#111" />
              <circle cx="46" cy="20" r="1.8" fill="#111" />
              {/* Cloud body with soft rounded edges */}
              <rect x="25" y="0" width="50" height="20" rx="10" fill="#111" stroke="#000" strokeWidth="0.5" />
              
              {/* Thought Cloud Icon Cycle */}
              {behaviorState === "thinking" && (
                <>
                  {(chatState === "thinking" || cloudIcons[cloudIconIdx] === "dots") && (
                    <text x="50" y="14" fill="#FFF" fontSize="12" fontWeight="bold" textAnchor="middle">...</text>
                  )}
                  {chatState !== "thinking" && cloudIcons[cloudIconIdx] === "question" && (
                    <text x="50" y="15" fill="#FFF" fontSize="13" fontWeight="bold" textAnchor="middle">?</text>
                  )}
                  {chatState !== "thinking" && cloudIcons[cloudIconIdx] === "gear" && (
                    <text x="50" y="15" fill="#FFF" fontSize="13" textAnchor="middle">⚙</text>
                  )}
                  {chatState !== "thinking" && cloudIcons[cloudIconIdx] === "lightbulb" && (
                    <text x="50" y="15" fill="#FFF" fontSize="13" textAnchor="middle">💡</text>
                  )}
                </>
              )}
            </motion.g>

            {/* Shadow along the input border line */}
            <ellipse cx="50" cy="56" rx="35" ry="3" fill="#000000" opacity="0.15" />

            {/* Rotating Halo above head during dizzy mode */}
            {behaviorState === "dizzy" && (
              <g>
                <motion.ellipse
                  cx="50"
                  cy="20"
                  rx="14"
                  ry="3.5"
                  stroke="#FFC933"
                  strokeWidth="2.5"
                  fill="none"
                  opacity="0.35"
                  filter={`url(#glowBlur-${uniqueId})`}
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  style={{ transformOrigin: "50px 20px" }}
                />
                <motion.ellipse
                  cx="50"
                  cy="20"
                  rx="14"
                  ry="3.5"
                  stroke="#FFC933"
                  strokeWidth="1.2"
                  fill="none"
                  opacity="0.9"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  style={{ transformOrigin: "50px 20px" }}
                />
              </g>
            )}

            {/* Spinning Stars during dizzy mode */}
            {behaviorState === "dizzy" && [0, 1, 2].map((i) => {
              const phase = (i * Math.PI * 2) / 3;
              return (
                <motion.path
                  key={i}
                  d="M 0,-3 L 0.8,-0.8 L 3,0 L 0.8,0.8 L 0,3 L -0.8,0.8 L -3,0 L -0.8,-0.8 Z"
                  fill="#FFC933"
                  animate={{
                    x: [
                      50 + Math.cos(phase) * 16,
                      50 + Math.cos(phase + Math.PI / 2) * 16,
                      50 + Math.cos(phase + Math.PI) * 16,
                      50 + Math.cos(phase + Math.PI * 1.5) * 16,
                      50 + Math.cos(phase) * 16,
                    ],
                    y: [
                      20 + Math.sin(phase) * 4,
                      20 + Math.sin(phase + Math.PI / 2) * 4,
                      20 + Math.sin(phase + Math.PI) * 4,
                      20 + Math.sin(phase + Math.PI * 1.5) * 4,
                      20 + Math.sin(phase) * 4,
                    ],
                    rotate: [0, 360],
                    scale: [0.7, 1.0, 0.7, 1.0, 0.7]
                  }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  style={{ transformOrigin: "center" }}
                />
              );
            })}

            {/* Breathing Body Group (also does head tilt when waking and wiggles) */}
            <motion.g
              className="pointer-events-auto cursor-pointer"
              onClick={handleMascotClick}
              animate={
                isAsleep ? { scaleY: 0.98, y: 0.6, rotate: 0, x: 0 } :
                bodyWiggle ? { x: [-3, 3, -3, 3, -2, 2, 0], scaleY: 1.02 } :
                behaviorState === "clicking" ? { 
                  y: [0, -6, -2, 1, 0], 
                  scaleY: [1, 1.10, 0.95, 1.02, 1],
                  scaleX: [1, 0.94, 1.04, 0.98, 1],
                  rotate: [0, -6, -6, -3, 0] 
                } :
                behaviorState === "dizzy" ? { x: [-2.5, 2.5, -2.5, 2.5, 0], y: [0, 0.8, -0.8, 0], rotate: [-6, 6, -6, 6, 0] } :
                behaviorState === "recovering" ? { rotate: [-3, 3, -3, 0], y: [0, 0.4, 0] } :
                { scaleY: [1, 1.026, 1], y: [0, -0.6, 0], rotate: headTilt, x: 0 }
              }
              transition={
                bodyWiggle ? { duration: 0.4, ease: "easeInOut" } :
                behaviorState === "clicking" ? { duration: 1.0, ease: "easeInOut" } :
                behaviorState === "dizzy" ? { repeat: Infinity, duration: 0.8, ease: "linear" } :
                behaviorState === "recovering" ? { duration: 2.0, ease: "easeInOut" } :
                { repeat: Infinity, duration: 3.4, ease: "easeInOut" }
              }
              style={{ transformOrigin: "50px 90px" }}
            >
              {/* Glossy Blob Body path - Wide & Shorter (sitting peeking over border at y=56) */}
              <path d="M 15,100 C 15,48 25,30 50,30 C 75,30 85,48 85,100 Z" fill={`url(#blobGrad-${uniqueId})`} />

              {/* Specular Highlight Gloss for smooth premium reflection */}
              <ellipse cx="32" cy="38" rx="10" ry="5" fill="#FFFFFF" opacity="0.08" transform="rotate(-12 32 38)" />

              {/* Soft Golden Glow around Left Eye */}
              <circle cx="36" cy="44" r="11" fill="#FFC933" opacity={behaviorState === "thinking" || surprised ? 0.28 : 0.16} filter={`url(#glowBlur-${uniqueId})`} />

              {/* Soft Golden Glow around Right Eye */}
              <circle cx="64" cy="44" r="11" fill="#FFC933" opacity={behaviorState === "thinking" || surprised ? 0.28 : 0.16} filter={`url(#glowBlur-${uniqueId})`} />

              {/* Left Eye */}
              <g clipPath={`url(#leftEyeClip-${uniqueId})`}>
                {/* Eye Glow Base */}
                <circle
                  cx="36"
                  cy="44"
                  r="7.5"
                  fill={`url(#eyeGlow-${uniqueId})`}
                  opacity={behaviorState === "thinking" || surprised ? 0.98 : 0.8}
                />
                {/* Pupil + Highlight Group that moves together */}
                <motion.g
                  animate={
                    isAsleep ? { x: 0, y: 0 } :
                    behaviorState === "dizzy" ? { x: leftPupilX, y: leftPupilY } :
                    behaviorState === "recovering" || confused ? { x: leftPupilX, y: leftPupilY } :
                    behaviorState === "thinking" ? { 
                      x: [-1.8, 1.8, 0, -1.2, 1.2, 0], 
                      y: [-1.0, -0.5, 1.0, 0.5, -0.8, 0]
                    } :
                    behaviorState === "typing" ? { x: leftPupilX, y: leftPupilY } :
                    behaviorState === "clicking" ? { x: 0, y: 0 } :
                    sendHovered ? { x: 2.2, y: 0.3 } :
                    { x: leftPupilX, y: leftPupilY }
                  }
                  transition={
                    behaviorState === "thinking" ? { repeat: Infinity, duration: 4.0, ease: "easeInOut" } : { duration: 0.1 }
                  }
                >
                  {/* Pupil */}
                  <ellipse cx={36} cy={44} rx="2.5" ry="3.5" fill="#050505" />
                  {/* Specular White Highlight Dot */}
                  <circle cx={36 + 1.2} cy={44 - 1.2} r="1.1" fill="#FFFFFF" opacity="0.85" />
                </motion.g>
              </g>

              {/* Right Eye */}
              <g clipPath={`url(#rightEyeClip-${uniqueId})`}>
                {/* Eye Glow Base */}
                <circle
                  cx="64"
                  cy="44"
                  r="7.5"
                  fill={`url(#eyeGlow-${uniqueId})`}
                  opacity={behaviorState === "thinking" || surprised ? 0.98 : 0.8}
                />
                {/* Pupil + Highlight Group that moves together */}
                <motion.g
                  animate={
                    isAsleep ? { x: 0, y: 0 } :
                    behaviorState === "dizzy" ? { x: rightPupilX, y: rightPupilY } :
                    behaviorState === "recovering" || confused ? { x: rightPupilX, y: rightPupilY } :
                    behaviorState === "thinking" ? { 
                      x: [-1.8, 1.8, 0, -1.2, 1.2, 0], 
                      y: [-1.0, -0.5, 1.0, 0.5, -0.8, 0]
                    } :
                    behaviorState === "typing" ? { x: rightPupilX, y: rightPupilY } :
                    behaviorState === "clicking" ? { x: 0, y: 0 } :
                    sendHovered ? { x: 2.2, y: 0.3 } :
                    { x: rightPupilX, y: rightPupilY }
                  }
                  transition={
                    behaviorState === "thinking" ? { repeat: Infinity, duration: 4.0, ease: "easeInOut" } : { duration: 0.1 }
                  }
                >
                  {/* Pupil */}
                  <ellipse cx={64} cy={44} rx="2.5" ry="3.5" fill="#050505" />
                  {/* Specular White Highlight Dot */}
                  <circle cx={64 + 1.2} cy={44 - 1.2} r="1.1" fill="#FFFFFF" opacity="0.85" />
                </motion.g>
              </g>

              {/* Sleeping closed eye arcs */}
              {isAsleep && (
                <>
                  <path d="M 30,44 Q 36,47.5 42,44" stroke="#FFC933" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.85" />
                  <path d="M 58,44 Q 64,47.5 70,44" stroke="#FFC933" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.85" />
                </>
              )}

              {/* Happy blink eye arcs (smiling) */}
              {happyBlink && (
                <>
                  <path d="M 30,46 Q 36,41.5 42,46" stroke="#FFC933" strokeWidth="2.0" strokeLinecap="round" fill="none" />
                  <path d="M 58,46 Q 64,41.5 70,46" stroke="#FFC933" strokeWidth="2.0" strokeLinecap="round" fill="none" />
                </>
              )}
            </motion.g>
          </svg>
        </div>
      </motion.div>

      <motion.div
        id="blob-mascot-overlay"
        className="absolute inset-0 pointer-events-none select-none overflow-visible"
        style={{
          zIndex: inline ? 3 : 290,
        }}
      >
        <div className="relative w-full h-full overflow-visible">
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full overflow-visible pointer-events-none select-none"
          >
            <defs>
              {/* Inherited radial gradient for arms to match body styling */}
              <radialGradient id={`armGrad-${uniqueId}`} cx="40%" cy="35%" r="60%">
                <stop offset="0%" stopColor="#3A3A3A" />
                <stop offset="60%" stopColor="#141414" />
                <stop offset="100%" stopColor="#050505" />
              </radialGradient>
            </defs>

            {/* Left Arm: resting flatly on border */}
            <motion.g
              className="pointer-events-auto cursor-pointer"
              onClick={handleMascotClick}
              style={{ transformOrigin: "16px 56px" }}
              animate={
                isAsleep ? { rotate: 0, y: 0 } :
                behaviorState === "thinking" ? { y: -1.5, rotate: 2 } :
                leftTap ? { y: [0, -3, 0, -3, 0] } :
                { rotate: 0, y: 0 }
              }
              transition={
                leftTap ? { duration: 0.8, ease: "easeInOut" } : undefined
              }
            >
              {/* Soft, minimal rounded arm shape casually leaning on the border */}
              <path d="M 12,56 C 10,49 16,48 22,48 C 28,48 33,50 33,55 C 33,58 28,59 24,59 C 20,59 14,58 12,56 Z" fill={`url(#armGrad-${uniqueId})`} stroke="#0f0f0f" strokeWidth="0.8" />
            </motion.g>

            {/* Right Arm: resting/reaching/waving */}
            <motion.g
              className="pointer-events-auto cursor-pointer"
              onClick={handleMascotClick}
              style={{ transformOrigin: "84px 56px" }}
              animate={
                isAsleep ? { rotate: 0, x: 0, y: 0 } :
                behaviorState === "thinking" ? { y: -1.5, rotate: -2 } :
                isWaving ? { rotate: [0, -32, -12, -32, -12, 0] } :
                sendClickTap ? { x: 4, y: [0, -4, 0], rotate: -5 } :
                behaviorState === "clicking" ? { x: [0, 2, 0], y: [0, -4, 0], rotate: [0, -15, 10, -15, 0] } :
                sendHovered ? { x: 14, y: 3, rotate: -12 } :
                rightWiggle ? { rotate: [0, 8, -4, 8, 0] } :
                { rotate: 0, x: 0, y: 0 }
              }
              transition={
                sendClickTap ? { duration: 0.2, ease: "easeInOut" } :
                behaviorState === "clicking" ? { duration: 0.8, ease: "easeInOut" } :
                sendHovered ? { duration: 0.2, ease: "easeOut" } :
                isWaving ? { duration: 1.0, ease: "easeInOut" } :
                rightWiggle ? { duration: 1.0, ease: "easeInOut" } :
                { duration: 0.2 }
              }
            >
              {/* Soft, minimal rounded arm shape casually leaning on the border */}
              <path d="M 88,56 C 90,49 84,48 78,48 C 72,48 67,50 67,55 C 67,58 72,59 76,59 C 80,59 86,58 88,56 Z" fill={`url(#armGrad-${uniqueId})`} stroke="#0f0f0f" strokeWidth="0.8" />
            </motion.g>
          </svg>
        </div>
      </motion.div>
    </div>
  );
}
