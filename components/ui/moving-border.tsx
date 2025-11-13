"use client";
import React, { useState, useEffect } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionTemplate,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";

export function Button({
  borderRadius = "1.75rem",
  children,
  as: Component = "button",
  containerClassName,
  borderClassName,
  duration,
  className,
  ...otherProps
}: {
  borderRadius?: string;
  children: React.ReactNode;
  as?: any;
  containerClassName?: string;
  borderClassName?: string;
  duration?: number;
  className?: string;
  [key: string]: any;
}) {
  return (
    <Component
      className={cn(
        "relative h-12 w-32 md:h-16 md:w-40 overflow-hidden bg-transparent p-[1px] text-lg md:text-xl",
        containerClassName,
      )}
      style={{
        borderRadius: borderRadius,
      }}
      {...otherProps}
    >
      <div
        className="absolute inset-0"
        style={{ borderRadius: `calc(${borderRadius} * 0.96)` }}
      >
        <MovingBorder duration={duration} rx="30%" ry="30%">
          <div
            className={cn(
              "h-20 w-20 bg-[radial-gradient(#0ea5e9_40%,transparent_60%)] opacity-[0.8]",
              borderClassName,
            )}
          />
        </MovingBorder>
      </div>

      <div
        className={cn(
          "relative flex h-full w-full items-center justify-center border border-slate-800 bg-slate-900/[0.8] text-sm text-white antialiased backdrop-blur-xl",
          className,
        )}
        style={{
          borderRadius: `calc(${borderRadius} * 0.96)`,
        }}
      >
        {children}
      </div>
    </Component>
  );
}

export const MovingBorder = ({
  children,
  duration = 3000,
  rx,
  ry,
  ...otherProps
}: {
  children: React.ReactNode;
  duration?: number;
  rx?: string;
  ry?: string;
  [key: string]: any;
}) => {
  const pathRef = useRef<any>();
  const progress = useMotionValue<number>(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    console.log("MovingBorder: Component did mount.");
    setIsMounted(true);
  }, []);

  useAnimationFrame((time) => {
    if (!isMounted) {
      console.log("MovingBorder: Animation frame skipped - component not mounted.");
      return;
    }
    
    const path = pathRef.current;
    if (!path) {
      console.log("MovingBorder: Animation frame skipped - path ref not available.");
      return;
    }

    try {
      const length = path.getTotalLength();
      if (length > 0) {
        const pxPerMillisecond = length / duration;
        progress.set((time * pxPerMillisecond) % length);
      } else {
        console.log("MovingBorder: Path length is 0, skipping animation frame.");
      }
    } catch (error) {
      console.error("MovingBorder: Error getting path length in useAnimationFrame.", error);
    }
  });

  const x = useTransform(progress, (val) => {
    if (!pathRef.current) return 0;
    try {
      const point = pathRef.current.getPointAtLength(val);
      return point ? point.x : 0;
    } catch (e) {
      return 0;
    }
  });

  const y = useTransform(progress, (val) => {
    if (!pathRef.current) return 0;
    try {
      const point = pathRef.current.getPointAtLength(val);
      return point ? point.y : 0;
    } catch (e) {
      return 0;
    }
  });

  const transform = useMotionTemplate`translateX(${x}px) translateY(${y}px) translateX(-50%) translateY(-50%)`;

  console.log("MovingBorder: Rendering component.", { isMounted });

  return (
    <>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className="absolute h-full w-full"
        width="100%"
        height="100%"
        {...otherProps}
      >
        <rect
          fill="none"
          width="100%"
          height="100%"
          rx={rx}
          ry={ry}
          ref={pathRef}
        />
      </svg>
      {isMounted && (
        <motion.div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            display: "inline-block",
            transform,
          }}
        >
          {children}
        </motion.div>
      )}
    </>
  );
};
