import React, { useState, useEffect } from 'react';

const FlipClock = ({ amount, startTime, isBroker = false, brokerCommissionRate = 7.5 }) => {
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
  const brokerProfit = isBroker ? (currentValue * (parseFloat(brokerCommissionRate || 7.5) / 100)) : 0;

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}>
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

      {isBroker && (
        <div style={{
          marginTop: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '6px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          <span style={{
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.25), rgba(217, 175, 86, 0.25))',
            border: '1px solid rgba(217, 175, 86, 0.45)',
            padding: '3px 10px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: '700',
            color: '#f7df94',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}>
            <span>👑 Broker Share ({brokerCommissionRate || 7.5}% on returns):</span>
            <span style={{ color: '#10b981', fontFamily: 'monospace', fontWeight: '800', fontSize: '11.5px' }}>
              +₹{brokerProfit.toFixed(6)}
            </span>
          </span>
        </div>
      )}
    </div>
  );
};

export default FlipClock;
