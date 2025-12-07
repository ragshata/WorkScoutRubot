import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export default function Button({ children, className = "", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={
        "w-full py-3 px-4 rounded-xl bg-blue-600 text-white font-medium text-base active:bg-blue-700 transition " +
        className
      }
    >
      {children}
    </button>
  );
}
