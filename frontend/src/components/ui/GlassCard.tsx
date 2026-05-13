"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children:   React.ReactNode;
  className?: string;
  animate?:   boolean;
  delay?:     number;
  onClick?:   () => void;
}

export function GlassCard({ children, className, animate = true, delay = 0, onClick }: GlassCardProps) {
  const content = (
    <div
      onClick={onClick}
      className={cn(
        "glass p-4",
        onClick && "cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all duration-200",
        className,
      )}
    >
      {children}
    </div>
  );

  if (!animate) return content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
    >
      {content}
    </motion.div>
  );
}
