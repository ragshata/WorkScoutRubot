import type { ChangeEvent } from "react";

type InputProps = {
  label?: string;
  placeholder?: string;
  type?: string;
  className?: string;
  value?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
};

export default function Input({
  label,
  placeholder,
  type = "text",
  className = "",
  value,
  onChange,
}: InputProps) {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label className="text-white text-sm font-semibold drop-shadow">
          {label}
        </label>
      )}

      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`
          w-full px-4 py-3 rounded-xl
          bg-white/20 backdrop-blur-xl
          border border-white/30
          text-white text-base font-medium
          placeholder-white/60
          focus:outline-none focus:ring-2 focus:ring-blue-300
          transition
          ${className}
        `}
      />
    </div>
  );
}