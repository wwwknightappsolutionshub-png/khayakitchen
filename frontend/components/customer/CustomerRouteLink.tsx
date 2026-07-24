import type { AnchorHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

type CustomerRouteLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
};

function isHardNav(href: string): boolean {
  if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("//")) {
    return true;
  }
  // Tenant switch entry points must remount binding.
  if (href.startsWith("/r/")) {
    return true;
  }
  return false;
}

/**
 * Soft Next.js navigation for in-app customer routes (avoids footer remount flash).
 * Hard document navigation for /r/{slug} tenant switches.
 */
export function CustomerRouteLink({ href, children, ...props }: CustomerRouteLinkProps) {
  if (isHardNav(href)) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }

  const { className, style, onClick, target, rel, "aria-label": ariaLabel, id, title } = props;

  return (
    <Link
      href={href}
      className={className}
      style={style}
      onClick={onClick}
      target={target}
      rel={rel}
      aria-label={ariaLabel}
      id={id}
      title={title}
      prefetch
    >
      {children}
    </Link>
  );
}
