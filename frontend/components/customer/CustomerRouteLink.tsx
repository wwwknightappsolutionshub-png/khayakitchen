import type { AnchorHTMLAttributes, ReactNode } from "react";

type CustomerRouteLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
};

/** Full document navigation — avoids stale Next.js client router cache in the PWA. */
export function CustomerRouteLink({ href, children, ...props }: CustomerRouteLinkProps) {
  return (
    <a href={href} {...props}>
      {children}
    </a>
  );
}
