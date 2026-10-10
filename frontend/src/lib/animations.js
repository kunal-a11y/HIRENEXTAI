import anime from 'animejs/lib/anime.es.js';

// Fade + slide up on page enter
export const pageEnter = (selector) => {
  anime({
    targets: selector,
    opacity: [0, 1],
    translateY: [30, 0],
    duration: 600,
    easing: 'easeOutExpo',
    delay: anime.stagger(80)
  });
};

// Card hover lift
export const cardHover = (el) => {
  anime({
    targets: el,
    translateY: -6,
    boxShadow: '0 12px 40px rgba(255,255,255,0.06)',
    duration: 250,
    easing: 'easeOutQuad'
  });
};

export const cardLeave = (el) => {
  anime({
    targets: el,
    translateY: 0,
    boxShadow: '0 0px 0px rgba(0,0,0,0)',
    duration: 250,
    easing: 'easeOutQuad'
  });
};

// Button press
export const btnPress = (el) => {
  anime({
    targets: el,
    scale: [1, 0.96],
    duration: 100,
    easing: 'easeOutQuad',
    direction: 'alternate'
  });
};

// Count up number
export const countUp = (el, endValue, suffix = '') => {
  const obj = { value: 0 };
  anime({
    targets: obj,
    value: endValue,
    duration: 2000,
    easing: 'easeOutExpo',
    round: 1,
    update: () => {
      el.textContent = Math.round(obj.value).toLocaleString() + suffix;
    }
  });
};

// Staggered list entrance
export const staggerIn = (selector, delay = 100) => {
  anime({
    targets: selector,
    opacity: [0, 1],
    translateY: [20, 0],
    scale: [0.97, 1],
    duration: 500,
    easing: 'easeOutBack',
    delay: anime.stagger(delay)
  });
};

// Typewriter effect
export const typewriter = (el, text, speed = 30) => {
  let i = 0;
  el.textContent = '';
  const interval = setInterval(() => {
    el.textContent += text[i];
    i++;
    if (i >= text.length) clearInterval(interval);
  }, speed);
};

// Shimmer skeleton
export const shimmer = (selector) => {
  anime({
    targets: selector,
    backgroundPosition: ['200% 0', '-200% 0'],
    duration: 1500,
    easing: 'linear',
    loop: true
  });
};

// Modal spring open
export const modalOpen = (selector) => {
  anime({
    targets: selector,
    scale: [0.9, 1],
    opacity: [0, 1],
    duration: 350,
    easing: 'spring(1, 80, 12, 0)'
  });
};

// Toast slide in
export const toastIn = (el) => {
  anime({
    targets: el,
    translateX: [120, 0],
    opacity: [0, 1],
    duration: 400,
    easing: 'easeOutBack'
  });
};

// Waveform bars (for voice recording)
export const waveformAnimate = (selector) => {
  return anime({
    targets: selector,
    scaleY: () => anime.random(3, 20) / 10,
    duration: () => anime.random(300, 600),
    easing: 'easeInOutSine',
    loop: true,
    direction: 'alternate',
    delay: anime.stagger(50)
  });
};

// Page transition out
export const pageExit = (selector, callback) => {
  anime({
    targets: selector,
    opacity: [1, 0],
    translateY: [0, -20],
    duration: 300,
    easing: 'easeInQuad',
    complete: callback
  });
};

// Fade in elements with stagger
export const fadeInStagger = (selector, options = {}) => {
  const { duration = 500, delay = 80, translateY = 20 } = options;
  anime({
    targets: selector,
    opacity: [0, 1],
    translateY: [translateY, 0],
    duration,
    easing: 'easeOutExpo',
    delay: anime.stagger(delay)
  });
};

// Icon bounce
export const iconBounce = (el) => {
  anime({
    targets: el,
    scale: [1, 1.3, 1],
    duration: 400,
    easing: 'easeOutElastic(1, .5)'
  });
};

// Progress bar animation
export const animateProgress = (selector, width, duration = 1000) => {
  anime({
    targets: selector,
    width: `${width}%`,
    duration,
    easing: 'easeOutExpo'
  });
};

export default anime;
