import React, { useState, useEffect, useRef } from "react";
import { cn } from "~/lib/utils";

interface RingProgressProps {
  progress: number; // 0-100
  size?: number; // Size in pixels
  thickness?: number; // Thickness in pixels
  className?: string;
  bgClassName?: string;
  progressClassName?: string;
  showPercentage?: boolean; // Whether to show percentage in the middle
  fontSize?: number; // Font size for percentage text
  fontColor?: string; // Font color for percentage text
}

export function RingProgress({
  progress,
  size = 40,
  thickness = 4,
  className,
  bgClassName,
  progressClassName,
  showPercentage = true,
  fontSize,
  fontColor,
}: RingProgressProps) {
  const [rotation, setRotation] = useState(0);
  const animationRef = useRef<number | null>(null);
  const normalizedProgress = Math.min(100, Math.max(0, progress));
  const isComplete = normalizedProgress >= 100; // Check if progress is complete
  const isMinimal = normalizedProgress <= 1; // Check if progress is minimal

  // Automatically calculate font size if not provided
  const calculatedFontSize = fontSize || Math.max(10, size / 4);

  // Calculate the circumference of the circle
  const radius = size / 2 - thickness / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate the stroke-dashoffset based on progress
  const strokeDashoffset =
    circumference - (normalizedProgress / 100) * circumference;

  // Animate rotation unless progress is 100%
  useEffect(() => {
    const animate = () => {
      // Calculate rotation speed based on progress
      // Slower rotation as progress increases
      const rotationSpeed = Math.max(0.5, 2 - (normalizedProgress / 100) * 1.5);

      setRotation((prev) => (prev + rotationSpeed) % 360);
      animationRef.current = requestAnimationFrame(animate);
    };

    // Continue animation unless complete
    if (!isComplete) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      setRotation(-90); // Fixed position at 100% (top of circle)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isComplete, normalizedProgress]);

  return (
    <div
      className={cn("relative inline-block", className)}
      style={{ width: size, height: size }}
    >
      {/* Background circle */}
      <svg className="w-full h-full" viewBox={`0 0 ${size} ${size}`}>
        <circle
          className={cn("text-muted stroke-current opacity-20", bgClassName)}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
        />
      </svg>

      {/* Progress circle */}
      <svg
        className="absolute top-0 left-0 w-full h-full"
        viewBox={`0 0 ${size} ${size}`}
        style={{
          transform: `rotate(${isComplete ? -90 : rotation}deg)`,
          transformOrigin: "center",
          transition: isComplete ? "transform 0.3s ease-in-out" : "none",
        }}
      >
        <circle
          className={cn("text-primary stroke-current", progressClassName)}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          strokeDasharray={circumference}
          strokeDashoffset={isMinimal ? circumference * 0.95 : strokeDashoffset} // Show small dot when minimal progress
          strokeLinecap="round"
          style={{
            transition: "stroke-dashoffset 0.5s ease-in-out",
          }}
        />
      </svg>

      {/* Percentage text in the middle */}
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            style={{
              fontSize: `${calculatedFontSize}px`,
              color: fontColor || "currentColor",
              fontWeight: 500,
              transition: "color 0.3s ease",
            }}
          >
            {Math.round(normalizedProgress)}%
          </span>
        </div>
      )}
    </div>
  );
}
