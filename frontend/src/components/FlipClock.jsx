import React, { useState, useEffect } from 'react';

const FlipClock = ({ amount, startTime }) => {
  const [currentValue, setCurrentValue] = useState(amount);

  useEffect(() => {
    // If there's no amount, just return
    if (!amount) return;

    // Simple mock logic to make the value increase slightly over time
    // to simulate a live counter
    const interval = setInterval(() => {
      setCurrentValue(prev => {
        const newValue = parseFloat(prev) + 0.01;
        return Number(newValue.toFixed(2));
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [amount, startTime]);

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      background: '#1a1a2e',
      padding: '4px 8px',
      borderRadius: '6px',
      border: '1px solid rgba(217,175,86,0.3)',
      color: '#d9af56',
      fontFamily: 'monospace',
      fontSize: '14px',
      fontWeight: 'bold',
      boxShadow: '0 0 10px rgba(217,175,86,0.1)'
    }}>
      ₹ {currentValue?.toFixed(2) || '0.00'}
    </div>
  );
};

export default FlipClock;
