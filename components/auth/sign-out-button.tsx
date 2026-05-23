import { signOutAction } from "@/src/lib/auth/actions";
import { Button } from "@/components/ui/button";

type SignOutButtonProps = {
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg";
};

export function SignOutButton({
  variant = "ghost",
  size = "sm",
}: SignOutButtonProps) {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant={variant} size={size}>
        Sign out
      </Button>
    </form>
  );
}
