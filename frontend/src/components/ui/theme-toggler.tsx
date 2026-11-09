"use client";

import * as React from "react";
import { flushSync } from "react-dom";

export type ThemeSelection = "light" | "dark" | "system";
export type Resolved = "light" | "dark";
export type Direction = "radial" | "ltr" | "rtl" | "ttb" | "btt";

export type ChildrenRender =
  | React.ReactNode
  | ((state: {
      resolved: Resolved;
      effective: ThemeSelection;
      toggleTheme: (theme: ThemeSelection, event?: React.MouseEvent | MouseEvent) => void;
    }) => React.ReactNode);

export interface ThemeTogglerProps {
  theme: ThemeSelection;
  resolvedTheme: Resolved;
  setTheme: (theme: ThemeSelection) => void;
  direction?: Direction;
  duration?: number;
  onImmediateChange?: (theme: ThemeSelection) => void;
  children?: ChildrenRender;
}

const WIPE_DURATION = 650;
const WIPE_EASING = "cubic-bezier(0.4, 0, 0.2, 1)";
const WIPE_TYPE = "animate-ui-theme";

const WIPE_STYLE = `
::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}
::view-transition-old(root) {
  z-index: 1;
}
::view-transition-new(root) {
  z-index: 9999;
}
:root:active-view-transition-type(${WIPE_TYPE}) body,
:root:active-view-transition-type(${WIPE_TYPE}) body * {
  view-transition-name: none !important;
}
`;

function getSystemEffective(): Resolved {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getClipKeyframes(
  direction: Direction,
  origin?: { x: number; y: number; maxRadius: number }
): [string, string] {
  if (direction === "radial" && origin) {
    const { x, y, maxRadius } = origin;
    return [`circle(0px at ${x}px ${y}px)`, `circle(${maxRadius}px at ${x}px ${y}px)`];
  }

  switch (direction) {
    case "ltr":
      return ["inset(0 100% 0 0)", "inset(0 0 0 0)"];
    case "rtl":
      return ["inset(0 0 0 100%)", "inset(0 0 0 0)"];
    case "ttb":
      return ["inset(0 0 100% 0)", "inset(0 0 0 0)"];
    case "btt":
      return ["inset(100% 0 0 0)", "inset(0 0 0 0)"];
    default:
      return ["inset(0 100% 0 0)", "inset(0 0 0 0)"];
  }
}

function startWipe(update: () => void) {
  const doc = document as unknown as {
    startViewTransition?: (options: { update: () => void; types?: string[] } | (() => void)) => {
      ready: Promise<void>;
      finished: Promise<void>;
    };
  };

  if (!doc.startViewTransition) return null;

  try {
    return doc.startViewTransition({ update, types: [WIPE_TYPE] });
  } catch {
    return doc.startViewTransition(update);
  }
}

function subscribeToNothing() {
  return () => {};
}

function useIsMounted() {
  return React.useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false
  );
}

const PLACEHOLDER_STATE = {
  effective: "system",
  resolved: "light",
} as const satisfies { effective: ThemeSelection; resolved: Resolved };

export function ThemeToggler({
  theme,
  resolvedTheme,
  setTheme,
  onImmediateChange,
  direction = "radial",
  duration = WIPE_DURATION,
  children,
  ...props
}: ThemeTogglerProps) {
  const mounted = useIsMounted();
  const [current, setCurrent] = React.useState<{
    effective: ThemeSelection;
    resolved: Resolved;
  }>({
    effective: theme,
    resolved: resolvedTheme,
  });

  React.useEffect(() => {
    setCurrent({ effective: theme, resolved: resolvedTheme });
  }, [theme, resolvedTheme]);

  const toggleTheme = React.useCallback(
    async (nextTheme: ThemeSelection, event?: React.MouseEvent | MouseEvent) => {
      const resolved = nextTheme === "system" ? getSystemEffective() : nextTheme;

      setCurrent({ effective: nextTheme, resolved });
      onImmediateChange?.(nextTheme);

      if (nextTheme === "system" && resolved === resolvedTheme) {
        setTheme(nextTheme);
        return;
      }

      const hasStartViewTransition =
        typeof document !== "undefined" && "startViewTransition" in document;
      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (!hasStartViewTransition || prefersReducedMotion) {
        flushSync(() => {
          setTheme(nextTheme);
        });
        return;
      }

      // Calculate radial origin if event or button position exists
      let origin: { x: number; y: number; maxRadius: number } | undefined;
      const targetEl = (event?.currentTarget || event?.target) as HTMLElement | null;
      const rect = targetEl?.getBoundingClientRect();

      const clientX = event?.clientX ?? (rect ? rect.left + rect.width / 2 : undefined);
      const clientY = event?.clientY ?? (rect ? rect.top + rect.height / 2 : undefined);

      if (clientX !== undefined && clientY !== undefined) {
        const x = clientX;
        const y = clientY;
        const maxRadius = Math.hypot(
          Math.max(x, window.innerWidth - x),
          Math.max(y, window.innerHeight - y)
        );
        origin = { x, y, maxRadius };
      } else {
        const x = window.innerWidth / 2;
        const y = window.innerHeight / 2;
        const maxRadius = Math.hypot(x, y);
        origin = { x, y, maxRadius };
      }

      const actualDirection = direction === "radial" && !origin ? "ltr" : direction;
      const [fromClip, toClip] = getClipKeyframes(actualDirection, origin);

      try {
        const transition = startWipe(() => {
          flushSync(() => {
            setTheme(nextTheme);
            document.documentElement.classList.toggle("dark", resolved === "dark");
          });
        });

        if (!transition) {
          setTheme(nextTheme);
          return;
        }

        await transition.ready;

        document.documentElement
          .animate(
            { clipPath: [fromClip, toClip] },
            {
              duration,
              easing: WIPE_EASING,
              pseudoElement: "::view-transition-new(root)",
            }
          )
          .finished.finally(() => {
            setTheme(nextTheme);
          });
      } catch {
        setTheme(nextTheme);
      }
    },
    [direction, duration, onImmediateChange, resolvedTheme, setTheme]
  );

  const state = mounted ? current : PLACEHOLDER_STATE;

  return (
    <React.Fragment {...props}>
      {typeof children === "function"
        ? children({
            effective: state.effective,
            resolved: state.resolved,
            toggleTheme,
          })
        : children}
      <style dangerouslySetInnerHTML={{ __html: WIPE_STYLE }} />
    </React.Fragment>
  );
}
