import React from 'react';

export const Tag: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  return <span className={`inline-block px-2 py-1 bg-gray-200 text-sm rounded ${className}`}>{children}</span>;
};

export default Tag;
