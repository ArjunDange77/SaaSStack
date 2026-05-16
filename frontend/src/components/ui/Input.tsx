import type { InputHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  toolbar?: boolean;
}

export function Input({ toolbar, className = "", ...rest }: Props) {
  const cls = [toolbar ? "rooms-search" : "ui-input", className].filter(Boolean).join(" ");
  return <input className={cls} {...rest} />;
}
