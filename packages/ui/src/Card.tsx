import React from 'react';

export const Card: React.FC<{ className?: string }> = ({ children, className = '' }) => {
  return <div className={`p-4 bg-white rounded shadow ${className}`}>{children}</div>;
};

export default Card;
