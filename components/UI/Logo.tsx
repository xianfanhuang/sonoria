import React from 'react';

const Logo = () => {
  return (
    <div className="flex flex-col items-start text-white">
      <div className="flex items-center">
        <svg
          width="40"
          height="40"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
          className="mr-3"
        >
          <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: 'hsl(180, 80%, 50%)', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: 'hsl(270, 80%, 60%)', stopOpacity: 1 }} />
            </linearGradient>
          </defs>
          <path
            d="M50 10 C 20 10, 20 90, 50 90 S 80 10, 50 10 M50 10 C 80 10, 80 90, 50 90"
            stroke="url(#logoGradient)"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            transform="rotate(30 50 50)"
          />
        </svg>
        <h1 className="text-2xl font-bold tracking-wider" style={{ textShadow: '0 0 10px hsl(180, 80%, 50%)' }}>
          sonoria
        </h1>
      </div>
      <p className="text-xs font-light tracking-widest text-white/70 mt-1 ml-1">
        your sound, your imagination
      </p>
    </div>
  );
};

export default Logo;
