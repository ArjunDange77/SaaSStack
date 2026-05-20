interface Props {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

export function FilterPills({ options, value, onChange }: Props) {
  return (
    <div className="filter-pills" role="tablist">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          role="tab"
          aria-selected={value === opt}
          className={`filter-pill${value === opt ? " active" : ""}`}
          onClick={() => onChange(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
