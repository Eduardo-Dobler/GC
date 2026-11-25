import { forwardRef, type ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'small' | 'medium';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className = '', variant = 'primary', size = 'medium', type = 'button', ...props },
  ref,
) {
  return <button ref={ref} type={type} className={`button button--${variant} button--${size} ${className}`.trim()} {...props} />;
});
