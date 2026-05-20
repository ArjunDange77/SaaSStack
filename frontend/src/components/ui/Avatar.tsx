function avatarColorClass(name: string): string {
  const letter = (name.trim()[0] || "A").toUpperCase();
  if (letter >= "A" && letter <= "E") return "avatar-ae";
  if (letter >= "F" && letter <= "J") return "avatar-fj";
  if (letter >= "K" && letter <= "O") return "avatar-ko";
  if (letter >= "P" && letter <= "T") return "avatar-pt";
  return "avatar-uz";
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.slice(0, 2) ?? "?").toUpperCase();
}

interface Props {
  name: string;
  size?: number;
}

export function Avatar({ name, size = 32 }: Props) {
  return (
    <div
      className={`avatar ${avatarColorClass(name)}`}
      style={{ width: size, height: size, fontSize: size * 0.375 }}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
