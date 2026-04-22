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
      className={`block text-sm font-medium text-secondary ${className}`}
      {...props}
    >
      {children}
      {required && <span className='text-status-danger-text ml-1'>*</span>}
    </label>
  );
};
