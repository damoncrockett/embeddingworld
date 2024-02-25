import React, { useState, useEffect, useRef } from 'react';

export default function Spearman({ correlation }) {
  const frameRef = useRef();
  const [displayCorr, setDisplayCorr] = useState(correlation);
  const startCorrRef = useRef(correlation);
  const [maxCorr, setMaxCorr] = useState(correlation); // Track the maximum correlation
  const [color, setColor] = useState('white'); // New state for color

  useEffect(() => {
    // Update the maximum correlation if the new correlation is greater
    if (correlation > maxCorr) {
      setMaxCorr(correlation);
    }

    const newColor = correlation > startCorrRef.current ? 'lightgreen' :
                     correlation < startCorrRef.current ? 'tomato' : 'white';
    setColor(newColor);

    const start = performance.now();
    const duration = 1000; // Animation duration in milliseconds

    function animate(time) {
      const timeFraction = Math.min((time - start) / duration, 1);
      const easeOutTimeFraction = 1 - Math.pow(1 - timeFraction, 2);
      const animatedCorr = startCorrRef.current + (correlation - startCorrRef.current) * easeOutTimeFraction;

      setDisplayCorr(animatedCorr);

      if (timeFraction < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        startCorrRef.current = correlation; // Update at the end of the animation
        // Begin transition back to white after a delay
        setTimeout(() => setColor('white'), 500);
      }
    }

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [correlation, maxCorr]);

  return (
    <div style={{ textAlign: 'center', marginLeft: '20px' }}>
      {/* Numbers display */}
      <p id='spreadMonitor' style={{ color, margin: 0 }}>
        {displayCorr.toFixed(3)}
        <span style={{ color: 'grey', marginLeft: '10px' }}>
          {maxCorr.toFixed(3)}
        </span>
      </p>
      {/* Label display */}
      <div style={{ color: 'grey', fontSize: '13px' }}>
        REDUCTION CORR.
      </div>
    </div>
  );
}
