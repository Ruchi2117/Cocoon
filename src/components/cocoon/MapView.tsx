import { lazy, Suspense, type ComponentProps } from "react";
import { ClientOnly } from "@tanstack/react-router";

const CocoonMap = lazy(() => import("./CocoonMap"));

export function MapView(props: ComponentProps<typeof CocoonMap>) {
  const fallback = (
    <div className={`${props.className ?? ""} animate-pulse bg-muted`} aria-label="Loading map" />
  );
  return (
    <ClientOnly fallback={fallback}>
      <Suspense fallback={fallback}>
        <CocoonMap {...props} />
      </Suspense>
    </ClientOnly>
  );
}
