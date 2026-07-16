import React, { useState, useEffect } from 'react';

const FlipClock = ({ amount, startTime }) => {
  const [currentValue, setCurrentValue] = useState(0);

  useEffect(() => {
    if (!amount || !startTime) return;

    const calculateCurrentValue = () => {
      const start = new Date(startTime).getTime();
      const now = Date.now();
      const elapsedSeconds = Math.max(0, (now - start) / 1000);
      
      // Logic: 1% of investment per day (1% divided by 86400 seconds)
      const dailyEarnings = amount * (1 / 100);
      const earningsPerSecond = dailyEarnings / 86400;
      return elapsedSeconds * earningsPerSecond;
    };

    setCurrentValue(calculateCurrentValue());

    // Update very fast to create a continuous rolling effect for the micro-decimals
    const interval = setInterval(() => {
      setCurrentValue(calculateCurrentValue());
    }, 50);

    return () => clearInterval(interval);
  }, [amount, startTime]);

  // Format to 18 decimal places to match the exact length in the screenshot
  const formattedValue = (currentValue || 0).toFixed(18);
  const chars = formattedValue.split('');

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      fontFamily: 'monospace',
      color: '#ffffff'
    }}>
      <span style={{ 
        marginRight: '8px', 
        fontSize: '28px', 
        fontWeight: 'bold',
        lineHeight: 1
      }}>
        ₹
      </span>
      
      {chars.map((char, index) => {
        if (char === '.') {
          return (
            <span 
              key={`dot-${index}`} 
              style={{ 
                margin: '0 4px', 
                fontSize: '28px',
                fontWeight: 'bold',
                alignSelf: 'flex-end',
                lineHeight: 1,
                position: 'relative',
                top: '4px' // align visually to the bottom of the numbers
              }}
            >
              .
            </span>
          );
        }

        return (
          <div 
            key={`${index}`}
            style={{ 
              position: 'relative', 
              width: '24px', 
              height: '34px', 
              display: 'inline-flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              backgroundColor: '#161616', // Darker box to match the screenshot
              borderRadius: '4px',
              margin: '0 1px', // tightly packed
              boxShadow: '0 2px 4px rgba(0,0,0,0.6)',
              overflow: 'hidden',
              fontSize: '22px',
              fontWeight: 'bold'
            }}
          >
            {/* Horizontal Split Line */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
              height: '2px',
              marginTop: '-1px',
              backgroundColor: '#050505',
              zIndex: 10
            }} />
            
            {/* The digit itself */}
            <span style={{ position: 'relative', zIndex: 5, letterSpacing: '0' }}>
              {char}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default FlipClock;
