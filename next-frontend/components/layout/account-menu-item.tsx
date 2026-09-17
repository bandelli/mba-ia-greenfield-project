import type { ReactNode } from "react"
import Link from "next/link"

type BaseProps = {
  icon: ReactNode
  label: string
}

type LinkVariant = BaseProps & { href: string; onClick?: never }
type ActionVariant = BaseProps & { href?: never; onClick: () => void }

export type AccountMenuItemProps = LinkVariant | ActionVariant

const itemClassName =
  "flex w-full items-center gap-3 rounded-[var(--radius-2)] border-b border-border px-3 py-2 text-left text-label-md text-foreground hover:bg-muted last:border-b-0"

// Parameterized row for the Account User Menu — used for both "Edit Channel"
// (Link variant, per phase-04-video-channel-management) and "Sign Out"
// (Action variant, per phase-02-auth-frontend).
function AccountMenuItem(props: AccountMenuItemProps) {
  const { icon, label } = props

  if ("href" in props && props.href) {
    return (
      <Link href={props.href} data-slot="account-menu-item" className={itemClassName}>
        <span className="[&_svg]:size-4">{icon}</span>
        {label}
      </Link>
    )
  }

  return (
    <button
      type="button"
      data-slot="account-menu-item"
      className={itemClassName}
      onClick={(props as ActionVariant).onClick}
    >
      <span className="[&_svg]:size-4">{icon}</span>
      {label}
    </button>
  )
}

export { AccountMenuItem }
