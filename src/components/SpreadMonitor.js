import React, { useState, useEffect, useRef } from 'react';

export default function SpreadMonitor({ radius }) {
  const frameRef = useRef();
  const [displayRadius, setDisplayRadius] = useState(radius);
  const startRadiusRef = useRef(radius);
  const [maxRadius, setMaxRadius] = useState(radius); // Track the maximum radius
  const [color, setColor] = useState('white'); // New state for color

  useEffect(() => {
    // Update the maximum radius if the new radius is greater
    if (radius > maxRadius) {
      setMaxRadius(radius);
    }

    const newColor = radius > startRadiusRef.current ? 'lightgreen' :
                     radius < startRadiusRef.current ? 'tomato' : 'white';
    setColor(newColor);

    const start = performance.now();
    const duration = 1000; // Animation duration in milliseconds

    function animate(time) {
      const timeFraction = Math.min((time - start) / duration, 1);
      const easeOutTimeFraction = 1 - Math.pow(1 - timeFraction, 2);
      const animatedRadius = startRadiusRef.current + (radius - startRadiusRef.current) * easeOutTimeFraction;

      setDisplayRadius(animatedRadius);

      if (timeFraction < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        startRadiusRef.current = radius; // Update at the end of the animation
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
  }, [radius, maxRadius]);

  return (
    <div style={{ textAlign: 'center', marginRight: '20px' }}>
      {/* Numbers display */}
      <p id='spreadMonitor' style={{ color, margin: 0 }}>
        {displayRadius.toFixed(3)}
        <span style={{ color: 'grey', marginLeft: '10px' }}>
          {maxRadius.toFixed(3)}
        </span>
      </p>
      {/* Label display */}
      <div style={{ color: 'grey', fontSize: '13px' }}>
        BOUNDING RADIUS
      </div>
    </div>
  );
}
