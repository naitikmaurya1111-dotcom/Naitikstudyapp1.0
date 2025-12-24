import React from 'react';

interface DeskIconProps {
  isStudying: boolean;
  color?: string;
}

const DeskIcon: React.FC<DeskIconProps> = ({ isStudying, color = '#FF6B35' }) => {
  const strokeColor = isStudying ? color : '#525252'; // Active vs Inactive gray
  
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Lamp Stand */}
      <path d="M12 28V18H16" stroke={strokeColor} strokeWidth="2" strokeLinecap="round"/>
      <path d="M16 18L18 16" stroke={strokeColor} strokeWidth="2" strokeLinecap="round"/>
      
      {/* Lamp Head */}
      <path d="M16 18H24V21H16V18Z" stroke={strokeColor} strokeWidth="2" fill={isStudying ? strokeColor : 'none'} fillOpacity="0.2"/>

      {/* Desk Surface */}
      <path d="M8 28H40" stroke={strokeColor} strokeWidth="2" strokeLinecap="round"/>
      
      {/* Desk Legs */}
      <path d="M10 28V40" stroke={strokeColor} strokeWidth="2" strokeLinecap="round"/>
      <path d="M38 28V40" stroke={strokeColor} strokeWidth="2" strokeLinecap="round"/>
      
      {/* Chair (Simplified) */}
      <path d="M22 32H26" stroke={strokeColor} strokeWidth="2" strokeLinecap="round"/>
      <path d="M22 32V40" stroke={strokeColor} strokeWidth="2" strokeLinecap="round"/>
      <path d="M26 32V40" stroke={strokeColor} strokeWidth="2" strokeLinecap="round"/>
      <path d="M20 40H28" stroke={strokeColor} strokeWidth="2" strokeLinecap="round"/>
      
      {/* Book on desk */}
      {isStudying && (
          <rect x="28" y="24" width="8" height="4" stroke={strokeColor} strokeWidth="1" />
      )}
    </svg>
  );
};

export default DeskIcon;