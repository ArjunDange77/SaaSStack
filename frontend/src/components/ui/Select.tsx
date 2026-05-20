import type { SelectHTMLAttributes } from "react";

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  toolbar?: boolean;
}

export function Select({ toolbar, className = "", children, ...rest }: Props) {
  const cls = [toolbar ? "sort-select" : "ui-select", className].filter(Boolean).join(" ");
  return (
    <select className={cls} {...rest}>
      {children}
    </select>
  );
}
