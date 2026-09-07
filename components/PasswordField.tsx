"use client";

import { useState } from "react";

export function PasswordField({
  label,
  value,
  onChange,
  minLength,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  minLength?: number;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="field">
      <input
        type={show ? "text" : "password"}
        placeholder=" "
        required
        value={value}
        onChange={onChange}
        minLength={minLength}
        autoComplete={autoComplete}
        style={{ paddingRight: 62 }}
      />
      <label>{label}</label>
      <span
        onClick={() => setShow((v) => !v)}
        style={{
          position: "absolute", right: 14, top: 14, color: "var(--muted-2)",
          fontSize: 11, cursor: "pointer", userSelect: "none",
        }}
      >
        {show ? "Masquer" : "Afficher"}
      </span>
    </div>
  );
}
