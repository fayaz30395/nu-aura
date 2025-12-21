import React from 'react';

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label: React.FC<LabelProps> = ({
  children,
  className = '',
  required,
  ...props
}) => {
  return (
    <label
      className={`block text-sm font-medium text-surface-700 dark:text-surface-300 ${className}`}
      {...props}
    >
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
};
