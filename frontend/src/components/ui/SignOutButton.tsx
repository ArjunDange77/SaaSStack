import { useAuth } from "@/auth/AuthContext";

export function SignOutButton({ className = "" }: { className?: string }) {
  const { logout } = useAuth();
  return (
    <button
      type="button"
      className={`sign-out-btn ${className}`.trim()}
      onClick={logout}
    >
      Sign out
    </button>
  );
}
