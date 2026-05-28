"use client";

import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Fragment } from "react";

export default function Breadcrumbs() {
  const pathname = usePathname();

  const getBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean);
    
    if (segments.length === 0) return [{ label: "Dashboard", href: "/dashboard" }];
    
    const breadcrumbs = [{ label: "Dashboard", href: "/dashboard" }];
    
    segments.forEach((segment, index) => {
      const href = "/" + segments.slice(0, index + 1).join("/");
      const label = segment.charAt(0).toUpperCase() + segment.slice(1);
      breadcrumbs.push({ label, href });
    });
    
    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
      {breadcrumbs.map((crumb, index) => (
        <Fragment key={crumb.href}>
          {index > 0 && <ChevronRight className="size-4" />}
          <a
            href={crumb.href}
            className={`hover:text-foreground transition-colors ${
              index === breadcrumbs.length - 1 ? "text-foreground font-medium" : ""
            }`}
          >
            {crumb.label}
          </a>
        </Fragment>
      ))}
    </nav>
  );
}
