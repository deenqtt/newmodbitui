"use client";

import { motion } from "framer-motion";
import { Loader2, Server, Wifi, Zap, Database, Shield, Activity } from "lucide-react";

interface LoadingPageProps {
  message?: string;
  variant?: "default" | "inline" | "minimal" | "skeleton";
  icon?: "server" | "wifi" | "zap" | "database" | "shield" | "activity";
}

const icons = {
  server: Server,
  wifi: Wifi,
  zap: Zap,
  database: Database,
  shield: Shield,
  activity: Activity,
};

function getDefaultIcon(pathname: string): "server" | "wifi" | "zap" | "database" | "shield" | "activity" {
  if (pathname.includes('/devices') || pathname.includes('/lo-ra-wan')) return 'wifi';
  if (pathname.includes('/analytics') || pathname.includes('/energy')) return 'zap';
  if (pathname.includes('/network') || pathname.includes('/mqtt')) return 'database';
  if (pathname.includes('/security') || pathname.includes('/access')) return 'shield';
  if (pathname.includes('/monitoring') || pathname.includes('/alarms')) return 'activity';
  return 'server';
}

export function LoadingPage({
  message = "Loading page...",
  variant = "default",
  icon
}: LoadingPageProps) {
  // Get current pathname client-side
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  const defaultIcon = icon || getDefaultIcon(pathname);

  if (variant === "inline") {
    const Icon = icons[defaultIcon] || Loader2;
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center gap-3 py-6"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <Icon className="h-5 w-5 text-primary" />
        </motion.div>
        <span className="text-sm text-muted-foreground">{message}</span>
      </motion.div>
    );
  }

  if (variant === "minimal") {
    const Icon = icons[defaultIcon] || Loader2;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center justify-center p-8"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <Icon className="h-8 w-8 text-primary" />
        </motion.div>
      </motion.div>
    );
  }

  if (variant === "skeleton") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-background p-4 space-y-4"
      >
        {/* Skeleton header */}
        <motion.div
          className="h-8 bg-muted rounded-lg animate-pulse"
          style={{ width: '60%' }}
        />

        {/* Skeleton cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-card border border-border rounded-lg p-4 space-y-2"
            >
              <div className="h-4 bg-muted rounded animate-pulse" style={{ width: '70%' }} />
              <div className="h-6 bg-muted rounded animate-pulse" style={{ width: '50%' }} />
              <div className="h-3 bg-muted rounded animate-pulse" style={{ width: '30%' }} />
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  }

  const Icon = icons[defaultIcon] || Server;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center justify-center min-h-screen bg-background relative overflow-hidden"
    >
      {/* Background elements */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.05 }}
        transition={{ delay: 0.5 }}
      >
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary/10 rounded-full blur-xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-primary/5 rounded-full blur-2xl" />
      </motion.div>

      {/* Main loading container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
        className="relative z-10 text-center max-w-md mx-auto px-6"
      >
        {/* Icon container with pulsing effect */}
        <motion.div
          className="relative mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          {/* Pulsing background circles */}
          <motion.div
            className="absolute inset-0 bg-primary/20 rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.1, 0.3]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{
              width: '5rem',
              height: '5rem',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />

          <motion.div
            className="absolute inset-0 bg-primary/10 rounded-full"
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.2, 0.05, 0.2]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.3
            }}
            style={{
              width: '5rem',
              height: '5rem',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />

          {/* Main icon */}
          <motion.div
            className="relative bg-card border border-border rounded-2xl p-4 shadow-lg"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              <Icon className="h-12 w-12 text-primary" />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Loading text with staggered animation */}
        <motion.h2
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-2xl font-bold text-foreground mb-2"
        >
          Loading Dashboard
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-muted-foreground mb-6"
        >
          {message}
        </motion.p>

        {/* Enhanced progress bar with multiple segments */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="space-y-2"
        >
          <div className="flex gap-1 justify-center">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="h-1 bg-primary/20 rounded-full flex-1"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{
                  delay: 1 + (i * 0.1),
                  duration: 0.6,
                  ease: "easeOut"
                }}
              >
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{
                    delay: 1.5 + (i * 0.1),
                    duration: 0.4,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatDelay: 1.5 - (i * 0.1)
                  }}
                />
              </motion.div>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.5 }}
            className="text-xs text-muted-foreground"
          >
            This may take a moment...
          </motion.p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
