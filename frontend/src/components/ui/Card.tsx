import React from "react";

interface CardProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export default function Card({ children, onClick, className = "" }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={
        "p-4 rounded-xl bg-white border border-gray-200 shadow-sm active:scale-[0.98] transition cursor-pointer " +
        className
      }
    >
      {children}
    </div>
  );
}
