import React from "react";

export default function BottomSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Полупрозрачный фон */}
      <div
        className={`
          fixed inset-0 bg-black/30 backdrop-blur-sm z-[99]
          transition-all duration-300
          ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
        onClick={onClose}
      />

      {/* Сам bottom sheet */}
      <div
        className={`
          fixed left-0 right-0 bottom-0 z-[100]
          bg-white/15 backdrop-blur-2xl border-t border-white/20 
          rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.3)]
          transition-transform duration-300 ease-out
          max-h-[75vh] overflow-y-auto
          ${open ? "translate-y-0" : "translate-y-full"}
        `}
      >
        {children}
      </div>
    </>
  );
}