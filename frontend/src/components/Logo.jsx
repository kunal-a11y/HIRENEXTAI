import React from "react";

const imgSizes = {
  xs: "h-[40px] w-[40px] md:h-[46px] md:w-[46px]",
  sm: "h-10 w-10 md:h-[60px] md:w-[60px]",
  md: "h-10 w-10 md:h-16 md:w-16",
  lg: "h-10 w-10 md:h-12 md:w-12",
  xl: "h-20 w-20 md:h-24 md:w-24",
};

const textSizes = {
  xs: "text-base",
  sm: "text-xl md:text-2xl",
  md: "text-xl md:text-3xl",
  lg: "text-2xl md:text-3xl",
  xl: "text-4xl md:text-5xl",
};

export function Logo({ size = "md", showText = true, className = "", onClick }) {
  return (
    <div
      onClick={onClick}
      className={`group inline-flex items-center gap-2 cursor-pointer transition-all duration-300 ease-out ${className}`}
    >
      <div className={`${imgSizes[size]} block flex-shrink-0 transition-transform duration-300 ease-out group-hover:scale-[1.08]`}>
        <HirenextLogo animated={false} />
      </div>
      {showText && (
        <span
          className={`font-display font-black ${textSizes[size]} whitespace-nowrap text-current transition-all duration-300 ease-out`}
          style={{ lineHeight: 1, display: "block", margin: 0, padding: 0 }}
        >
          HirenextAI
        </span>
      )}
    </div>
  );
}

export function HirenextLogo({ animated = false, className = "" }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      xmlns="http://www.w3.org/2000/svg" 
      className={`select-none ${className}`}
      style={{ width: '100%', height: '100%' }}
    >
      <style>{`
        /* --- ANIMATION KEYFRAMES --- */
        @keyframes centerPop {
          0%, 5% { transform: scale(0); opacity: 0; }
          10%, 90% { transform: scale(1); opacity: 1; }
          95%, 100% { transform: scale(0); opacity: 0; }
        }
        @keyframes lineFlow {
          0%, 15% { stroke-dashoffset: 50; opacity: 0; }
          20% { opacity: 1; }
          40%, 65% { stroke-dashoffset: 0; opacity: 1; }
          85% { stroke-dashoffset: 50; opacity: 1; }
          90%, 100% { opacity: 0; }
        }
        @keyframes smallDotPop {
          0%, 40% { transform: scale(0); opacity: 0; }
          45%, 60% { transform: scale(1); opacity: 1; }
          65%, 100% { transform: scale(0); opacity: 0; }
        }

        /* --- STYLES --- */
        .hn-center-dot { 
          fill: currentColor; 
          transform-origin: 50px 50px; 
          transform: scale(${animated ? 0 : 1});
          opacity: ${animated ? 0 : 1};
          ${animated ? 'animation: centerPop 6s infinite ease-in-out;' : ''}
        }

        .hn-line { 
          stroke: currentColor; stroke-width: 2.8; fill: none; stroke-linecap: round;
          stroke-dasharray: 50; 
          stroke-dashoffset: ${animated ? 50 : 0};
          opacity: ${animated ? 0 : 1};
          ${animated ? 'animation: lineFlow 6s infinite ease-in-out;' : ''}
        }

        .hn-dot { 
          fill: currentColor; 
          opacity: ${animated ? 0 : 1}; 
          transform: scale(${animated ? 0 : 1});
          ${animated ? 'animation: smallDotPop 6s infinite ease-in-out;' : ''}
        }

        /* Transform Origins for the small dots to pop in place */
        .hn-sd1 { transform-origin: 63px 38px; } .hn-ed1 { transform-origin: 35px 25px; }
        .hn-sd2 { transform-origin: 62px 63px; } .hn-ed2 { transform-origin: 75px 35px; }
        .hn-sd3 { transform-origin: 37px 62px; } .hn-ed3 { transform-origin: 65px 75px; }
        .hn-sd4 { transform-origin: 38px 37px; } .hn-ed4 { transform-origin: 25px 65px; }
      `}</style>

      {/* Center Dot */}
      <circle className="hn-center-dot" cx="50" cy="50" r="7" />

      {/* Top Arm */}
      <path className="hn-line" d="M 50 50 V 25 H 35" />
      <path className="hn-line" d="M 50 38 H 63" />
      <circle className="hn-dot hn-sd1" cx="63" cy="38" r="3.5" />
      <circle className="hn-dot hn-ed1" cx="35" cy="25" r="3.5" />

      {/* Right Arm */}
      <path className="hn-line" d="M 50 50 H 75 V 35" />
      <path className="hn-line" d="M 62 50 V 63" />
      <circle className="hn-dot hn-sd2" cx="62" cy="63" r="3.5" />
      <circle className="hn-dot hn-ed2" cx="75" cy="35" r="3.5" />

      {/* Bottom Arm */}
      <path className="hn-line" d="M 50 50 V 75 H 65" />
      <path className="hn-line" d="M 50 62 H 37" />
      <circle className="hn-dot hn-sd3" cx="37" cy="62" r="3.5" />
      <circle className="hn-dot hn-ed3" cx="65" cy="75" r="3.5" />

      {/* Left Arm */}
      <path className="hn-line" d="M 50 50 H 25 V 65" />
      <path className="hn-line" d="M 38 50 V 37" />
      <circle className="hn-dot hn-sd4" cx="38" cy="37" r="3.5" />
      <circle className="hn-dot hn-ed4" cx="25" cy="65" r="3.5" />
    </svg>
  );
}
