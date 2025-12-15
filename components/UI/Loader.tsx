import React from 'react';

const Loader = ({ isLoading }: { isLoading: boolean }) => {
  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black transition-opacity duration-1000 ${
        isLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="flex items-center animate-pulse">
        <svg
          width="60"
          height="60"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
          className="mr-4"
        >
          <defs>
            <linearGradient id="loaderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: 'hsl(180, 80%, 50%)' }} />
              <stop offset="100%" style={{ stopColor: 'hsl(270, 80%, 60%)' }} />
            </linearGradient>
          </defs>
          <path
            d="M50 10 C 20 10, 20 90, 50 90 S 80 10, 50 10 M50 10 C 80 10, 80 90, 50 90"
            stroke="url(#loaderGradient)"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            transform="rotate(30 50 50)"
          />
        </svg>
        <h1 className="text-4xl font-bold tracking-wider text-white" style={{ textShadow: '0 0 15px hsl(180, 80%, 50%)' }}>
          sonoria
        </h1>
      </div>
      <p className="text-sm font-light tracking-widest text-white/70 mt-4 animate-fade-in-slow">
        your sound, your imagination
      </p>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 0.7; }
        }
        .animate-fade-in-slow {
          animation: fadeIn 3s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Loader;
