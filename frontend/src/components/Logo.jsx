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
        <HirenextLogo decorative={showText} />
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

export function HirenextLogo({ className = "", decorative = false }) {
  return (
    <img
      src="/hirenext-logo.png"
      alt={decorative ? "" : "HirenextAI"}
      aria-hidden={decorative || undefined}
      width={1113}
      height={1113}
      className={`select-none object-contain rounded-full ${className}`}
      style={{ width: '100%', height: '100%' }}
      draggable={false}
    />
  );
}
