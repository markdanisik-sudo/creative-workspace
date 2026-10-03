"use client";

import { LogOut, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/Menu";
import { signOut } from "@/features/auth/actions";

export function UserMenu({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  return (
    <Menu
      label="Account"
      align="end"
      trigger={(props) => (
        <button
          type="button"
          aria-label="Account"
          className="rounded-full transition-transform duration-150 active:scale-95"
          {...props}
        >
          <Avatar name={name} size={30} />
        </button>
      )}
    >
      <MenuLabel>
        <span className="block truncate text-body text-text">{name}</span>
        <span className="block truncate font-normal">{email}</span>
      </MenuLabel>
      <MenuSeparator />
      <MenuItem icon={<Settings size={16} />} onSelect={() => router.push("/settings")}>
        Settings
      </MenuItem>
      <MenuItem icon={<LogOut size={16} />} onSelect={() => startTransition(() => signOut())}>
        Sign out
      </MenuItem>
    </Menu>
  );
}
