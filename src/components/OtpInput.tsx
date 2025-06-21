import React, { useState, useRef, useEffect } from 'react';

interface OtpInputProps {
  length: number;
  onComplete: (otp: string) => void;
  disabled?: boolean;
  error?: boolean;
}

export function OtpInput({ length, onComplete, disabled = false, error = false }: OtpInputProps) {
  const [otp, setOtp] = useState<string[]>(new Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index: number, value: string) => {
    if (disabled) return;

    const newOtp = [...otp];
    
    // Handle paste
    if (value.length > 1) {
      const pastedValue = value.slice(0, length);
      for (let i = 0; i < length; i++) {
        newOtp[i] = pastedValue[i] || '';
      }
      setOtp(newOtp);
      
      // Focus on the last filled input or next empty input
      const lastFilledIndex = Math.min(pastedValue.length - 1, length - 1);
      if (inputRefs.current[lastFilledIndex]) {
        inputRefs.current[lastFilledIndex].focus();
      }
      
      if (pastedValue.length === length) {
        onComplete(pastedValue);
      }
      return;
    }

    // Handle single character input
    if (/^\d$/.test(value) || value === '') {
      newOtp[index] = value;
      setOtp(newOtp);

      // Move to next input
      if (value && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }

      // Call onComplete when all fields are filled
      if (newOtp.every(digit => digit !== '') && newOtp.join('').length === length) {
        onComplete(newOtp.join(''));
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex gap-3 justify-center">
      {otp.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          disabled={disabled}
          className={`
            w-12 h-12 text-center text-xl font-semibold border-2 rounded-lg
            transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500
            ${error 
              ? 'border-red-300 bg-red-50 text-red-900' 
              : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500'
            }
            ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'hover:border-gray-400'}
          `}
        />
      ))}
    </div>
  );
}