interface Props {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function SegmentedControl({ options, value, onChange, disabled }: Props) {
  return (
    <div className="seg-control" role="tablist">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          role="tab"
          aria-selected={value === opt}
          className={value === opt ? "on" : ""}
          disabled={disabled}
          onClick={() => onChange(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
