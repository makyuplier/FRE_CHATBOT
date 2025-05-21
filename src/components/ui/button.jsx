import React from 'react';

export const Button = ({ onClick, disabled, children, className }) => {
  return (
    <button
      className={`px-4 py-2 rounded text-white ${disabled ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};
