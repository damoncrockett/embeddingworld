import React, { useState, useEffect, useRef } from 'react';

export default function Meter({ initialValue, labelText, className }) {
  const frameRef = useRef();
  const [displayValue, setDisplayValue] = useState(initialValue);
  const startValueRef = useRef(initialValue);
  const [maxValue, setMaxValue] = useState(initialValue);
  const [color, setColor] = useState('white');
  const [fadeIn, setFadeIn] = useState(true); // For the fade-in effect

  useEffect(() => {
    
    if (initialValue > maxValue) {
      setMaxValue(initialValue);
    }

    const newColor = initialValue > startValueRef.current ? 'lightgreen' :
                     initialValue < startValueRef.current ? 'tomato' : 'white';
    setColor(newColor);

    const start = performance.now();
    const duration = 1000; // Animation duration in milliseconds

    function animate(time) {
      const timeFraction = Math.min((time - start) / duration, 1);
      const easeOutTimeFraction = 1 - Math.pow(1 - timeFraction, 2);
      const animatedValue = startValueRef.current + (initialValue - startValueRef.current) * easeOutTimeFraction;

      setDisplayValue(animatedValue);

      if (timeFraction < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        startValueRef.current = initialValue; // Update at the end of the animation
        setTimeout(() => setColor('white'), 500); // Begin transition back to white after a delay
      }
    }

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [initialValue]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeIn(false);
    }, 1000); // Match this duration to your CSS animation length

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`${className} ${fadeIn ? 'fade-in' : ''}`}>
      <p style={{ color }}>
        {displayValue.toFixed(3)}
        <span className='meter-max'>
          {maxValue.toFixed(3)}
        </span>
      </p>
      <div className='meter-label'>
        {labelText.toUpperCase()}
      </div>
    </div>
  );
}
