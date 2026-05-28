"use client";

import * as React from "react";
import { cn, initials } from "@/lib/utils";

export function Avatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  const [err, setErr] = React.useState(false);
  return (
    <span
      className={cn(
        "inline-flex h-9 w-9 shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold text-muted-foreground",
        className,
      )}
    >
      {src && !err ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" onError={() => setErr(true)} />
      ) : (
        initials(name)
      )}
    </span>
  );
}
