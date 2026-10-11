import React from 'react';

export default function CareerIllustration() {
  return <aside className="auth-art" aria-label="Your career workspace">
    <div className="auth-art-copy"><span className="eyebrow">A little clarity. A bigger next step.</span><h2>Your next chapter,<br /><em>taking shape.</em></h2><p>Bring your experience, ideas and ambitions.<br />Build the rest, one step at a time.</p></div>
    <svg className="career-illustration" viewBox="0 0 600 390" fill="none" aria-hidden="true">
      <ellipse cx="300" cy="340" rx="220" ry="22" fill="#dce6f6" />
      <path d="M65 280C110 90 410 380 530 105" stroke="#b3c9e6" strokeWidth="2" strokeDasharray="7 10" />
      <g className="art-main"><rect x="145" y="70" width="300" height="245" rx="22" fill="white" stroke="#d1ddeb" strokeWidth="2" />
        <rect x="145" y="70" width="300" height="48" rx="22" fill="#192f50" /><path d="M145 96h300v22H145z" fill="#192f50" />
        <circle cx="171" cy="94" r="4" fill="#8dd8cd" /><circle cx="186" cy="94" r="4" fill="#b2c9e9" /><circle cx="201" cy="94" r="4" fill="#f6d69b" />
        <rect x="171" y="140" width="57" height="57" rx="16" fill="#edf0fd" /><circle cx="200" cy="158" r="10" fill="#8b91cc" /><path d="M182 186c0-22 36-22 36 0" fill="#8b91cc" />
        <rect x="246" y="147" width="135" height="9" rx="4.5" fill="#20395b" /><rect x="246" y="167" width="95" height="7" rx="3.5" fill="#c6d3e2" />
        <rect x="173" y="221" width="240" height="8" rx="4" fill="#e6edf5" /><rect x="173" y="241" width="178" height="8" rx="4" fill="#e6edf5" />
        <rect x="173" y="273" width="99" height="22" rx="11" fill="#dff4ee" /><text x="190" y="288" fill="#237663" fontSize="11" fontFamily="sans-serif">YOUR NEXT STEP</text>
      </g>
      <g className="art-float"><rect x="365" y="201" width="173" height="82" rx="18" fill="#fff" stroke="#cbdce8" /><circle cx="399" cy="241" r="18" fill="#ddf5ed" /><path d="m391 241 6 6 11-12" stroke="#26836c" strokeWidth="3" strokeLinecap="round" /><text x="428" y="237" fill="#243d5c" fontSize="13" fontFamily="sans-serif">Made for you</text><rect x="428" y="249" width="83" height="6" rx="3" fill="#dce6ef" /></g>
      <g><rect x="63" y="153" width="123" height="66" rx="16" fill="#f4edff" stroke="#e1d4f2" /><path d="m89 187 12-11 11 5 18-16" stroke="#8b68ba" strokeWidth="3" strokeLinecap="round" /><path d="M121 165h9v9" stroke="#8b68ba" strokeWidth="3" strokeLinecap="round" /><circle cx="490" cy="111" r="26" fill="#fae8c9" /><path d="m481 111 9-9 9 9m-9-9v20" stroke="#a87527" strokeWidth="3" strokeLinecap="round" /></g>
    </svg>
    <div className="auth-art-tags"><span>Prepare with purpose</span><span>Keep moving forward</span></div>
  </aside>;
}
