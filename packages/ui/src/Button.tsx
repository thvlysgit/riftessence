/* eslint-disable react/prop-types */
import React from 'react';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className = '', ...rest }) => {
  return (
    <button className={`px-4 py-2 bg-blue-600 text-white rounded ${className}`} {...rest}>
      {children}
    </button>
  );
};

export default Button;
