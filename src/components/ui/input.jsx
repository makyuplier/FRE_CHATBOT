import React from 'react';

export const Input = ({ value, onChange, placeholder }) => {
  return (
    <input
      className="w-full p-2 border border-gray-300 rounded"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  );
};
