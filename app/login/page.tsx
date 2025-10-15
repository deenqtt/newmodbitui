"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LogIn, Eye, EyeOff, RefreshCw, Monitor, Blocks, BarChart3, Zap, Shield, Database, Wifi } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { showToast } from "@/lib/toast-utils";
import { motion } from "framer-motion";
import RealtimeClockWithRefresh from "@/components/realtime-clock";
import { useTheme } from "next-themes";

function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await login(email, password);
    } catch (err: any) {
      showToast.error("Login Failed", err.message || "Please check your credentials.");
      setError(
        err.message || "Failed to login. Please check your credentials."
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Enhanced Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Primary Floating Orbs */}
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-primary rounded-full mix-blend-multiply filter blur-xl opacity-10"
          animate={{
            x: [0, 30, 0],
            y: [0, -30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent rounded-full mix-blend-multiply filter blur-xl opacity-10"
          animate={{
            x: [0, -30, 0],
            y: [0, 30, 0],
            scale: [1, 0.9, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-muted rounded-full mix-blend-multiply filter blur-xl opacity-5"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 180, 360],
            opacity: [0.05, 0.08, 0.05],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* NEW: Additional Animated Elements */}
        <motion.div
          className="absolute top-20 left-20 w-32 h-32 bg-purple-500/10 rounded-full blur-lg"
          animate={{
            x: [0, 20, 0],
            y: [0, -20, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
        <motion.div
          className="absolute bottom-32 right-32 w-40 h-40 bg-blue-500/8 rounded-full blur-lg"
          animate={{
            x: [0, -25, 0],
            y: [0, 25, 0],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
        <motion.div
          className="absolute top-1/3 right-20 w-24 h-24 bg-green-500/12 rounded-full blur-lg"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.1, 0.2, 0.1],
            x: [0, 15, 0],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3
          }}
        />

        {/* Floating Particles */}
        <motion.div
          className="absolute top-16 right-1/4 w-2 h-2 bg-primary/60 rounded-full"
          animate={{
            y: [0, -20, 0],
            x: [0, 10, 0],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5
          }}
        />
        <motion.div
          className="absolute bottom-16 left-1/4 w-2 h-2 bg-accent/60 rounded-full"
          animate={{
            y: [0, 15, 0],
            x: [0, -10, 0],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.5
          }}
        />
        <motion.div
          className="absolute top-1/2 left-16 w-1.5 h-1.5 bg-purple-500/70 rounded-full"
          animate={{
            y: [0, -15, 0],
            opacity: [0.5, 0.9, 0.5],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2.5
          }}
        />
      </div>

      {/* Sparkle Effects - Additional Magic */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-32 left-32 w-1 h-1 bg-yellow-400 rounded-full"
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: 1,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-40 right-40 w-1 h-1 bg-blue-400 rounded-full"
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: 2,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute top-3/4 left-1/3 w-1 h-1 bg-pink-400 rounded-full"
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: 0.5,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Header di atas dengan Theme Toggle & Real-time Clock */}
      <div className="absolute top-4 right-4 flex items-center gap-3 z-20 bg-background/80 backdrop-blur-sm rounded-full px-4 py-2 border border-border/50 shadow-lg">
        {/* Real-time Clock */}
        <RealtimeClockWithRefresh />

        <div className="w-px h-4 bg-border"></div>

        {/* Theme Toggle Button */}
        <ThemeToggle />
      </div>

      {/* Footer di bawah dengan Version & Refresh */}
      <div className="absolute bottom-4 right-4 flex items-center gap-3 z-20 bg-background/80 backdrop-blur-sm rounded-full px-4 py-2 border border-border/50 shadow-lg">
        <span className="text-xs text-muted-foreground font-medium">
          v1.2.0
        </span>

        <div className="w-px h-4 bg-border"></div>

        {/* Refresh Button */}
        <Button variant="ghost" size="sm" onClick={handleRefresh} className="text-muted-foreground hover:text-foreground h-8 w-8 p-0">
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        {/* Left Section - App Description */}
        <div className="relative flex flex-col justify-center items-center p-8 lg:p-12 z-10">
          <motion.div
            className="max-w-lg w-full space-y-8"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {/* Logo and Brand */}
            <motion.div
              className="flex items-center justify-start gap-3"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg">
                <Blocks className="w-7 h-7 text-primary-foreground" />
              </div>
              <div className="text-start">
                <h1 className="text-4xl lg:text-5xl font-bold text-foreground">Nexus</h1>
                <p className="text-lg text-muted-foreground">Universal Dashboard</p>
              </div>
            </motion.div>

            {/* Main Description */}
            <motion.div
              className="space-y-6 text-center lg:text-left"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <h2 className="text-2xl lg:text-3xl font-semibold text-foreground">
                Advanced IoT Monitoring & Control Platform
              </h2>

              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p className="text-lg">
                  Nexus Universal Dashboard is a cutting-edge platform for monitoring and
                  controlling advanced IoT systems, designed to meet the demands of modern
                  industries and smart infrastructure.
                </p>

                {/* Falling Bricks Animation Container */}
                {/* Falling Bricks Animation - Responsive Masonary Grid */}
                <div className="relative py-4 px-2">
                  <motion.div
                    className="grid grid-cols-3 lg:grid-cols-4 gap-2 lg:gap-3 justify-items-center"
                    style={{
                      perspective: "1000px",
                      transformStyle: "preserve-3d"
                    }}
                  >
                    {/* Row 1 - Bottom Row (3 bricks on mobile, 4 on desktop) */}
                    <motion.div
                      className="cursor-pointer group"
                      style={{
                        width: "clamp(80px, 15vw, 120px)",
                        height: "clamp(45px, 8vw, 55px)",
                        transformStyle: "preserve-3d"
                      }}
                      initial={{
                        y: -200,
                        rotateX: -90,
                        rotateZ: -15,
                        opacity: 0
                      }}
                      animate={{
                        y: 0,
                        rotateX: 0,
                        rotateZ: 0,
                        opacity: 1
                      }}
                      transition={{
                        duration: 1.0,
                        delay: 0.2,
                        ease: [0.25, 0.46, 0.45, 0.94]
                      }}
                      whileHover={{
                        scale: 1.05,
                        z: 20,
                        rotateX: -5,
                        rotateY: 5,
                        transition: { duration: 0.3 }
                      }}
                    >
                      <motion.div
                        className="w-full h-full bg-blue-500 rounded-lg border-2 border-blue-400 flex flex-col items-center justify-center p-1.5 shadow-xl hover:shadow-blue-500/25"
                        whileHover={{
                          background: "linear-gradient(135deg, #3b82f6, #1d4ed8)"
                        }}
                      >
                        <Monitor className="w-3 h-3 lg:w-4 lg:h-4 text-white mb-0.5" />
                        <h3 className="font-bold text-white text-[10px] lg:text-xs text-center leading-tight">Monitor</h3>
                      </motion.div>
                      <motion.div
                        className="absolute inset-0 bg-black/30 rounded-lg translate-x-1.5 translate-y-1.5 -z-10 blur-[1px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.2, duration: 0.6 }}
                      />
                    </motion.div>

                    <motion.div
                      className="cursor-pointer group"
                      style={{
                        width: "clamp(80px, 15vw, 120px)",
                        height: "clamp(45px, 8vw, 55px)",
                        transformStyle: "preserve-3d"
                      }}
                      initial={{
                        y: -240,
                        rotateX: -90,
                        rotateZ: 10,
                        opacity: 0
                      }}
                      animate={{
                        y: 0,
                        rotateX: 0,
                        rotateZ: 0,
                        opacity: 1
                      }}
                      transition={{
                        duration: 1.2,
                        delay: 0.4,
                        ease: [0.25, 0.46, 0.45, 0.94]
                      }}
                      whileHover={{
                        scale: 1.05,
                        z: 20,
                        rotateX: -5,
                        rotateY: -5,
                        transition: { duration: 0.3 }
                      }}
                    >
                      <motion.div
                        className="w-full h-full bg-green-500 rounded-lg border-2 border-green-400 flex flex-col items-center justify-center p-1.5 shadow-xl hover:shadow-green-500/25"
                        whileHover={{
                          background: "linear-gradient(135deg, #22c55e, #16a34a)"
                        }}
                      >
                        <Blocks className="w-3 h-3 lg:w-4 lg:h-4 text-white mb-0.5" />
                        <h3 className="font-bold text-white text-[10px] lg:text-xs text-center leading-tight">Protocols</h3>
                      </motion.div>
                      <motion.div
                        className="absolute inset-0 bg-black/30 rounded-lg translate-x-1.5 translate-y-1.5 -z-10 blur-[1px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.6, duration: 0.6 }}
                      />
                    </motion.div>

                    <motion.div
                      className="cursor-pointer group"
                      style={{
                        width: "clamp(80px, 15vw, 120px)",
                        height: "clamp(45px, 8vw, 55px)",
                        transformStyle: "preserve-3d"
                      }}
                      initial={{
                        y: -280,
                        rotateX: -90,
                        rotateZ: -8,
                        opacity: 0
                      }}
                      animate={{
                        y: 0,
                        rotateX: 0,
                        rotateZ: 0,
                        opacity: 1
                      }}
                      transition={{
                        duration: 1.2,
                        delay: 0.6,
                        ease: [0.25, 0.46, 0.45, 0.94]
                      }}
                      whileHover={{
                        scale: 1.05,
                        z: 20,
                        rotateX: -5,
                        rotateY: 5,
                        transition: { duration: 0.3 }
                      }}
                    >
                      <motion.div
                        className="w-full h-full bg-purple-500 rounded-lg border-2 border-purple-400 flex flex-col items-center justify-center p-1.5 shadow-xl hover:shadow-purple-500/25"
                        whileHover={{
                          background: "linear-gradient(135deg, #a855f7, #7c3aed)"
                        }}
                      >
                        <LogIn className="w-3 h-3 lg:w-4 lg:h-4 text-white mb-0.5" />
                        <h3 className="font-bold text-white text-[10px] lg:text-xs text-center leading-tight">Security</h3>
                      </motion.div>
                      <motion.div
                        className="absolute inset-0 bg-black/30 rounded-lg translate-x-1.5 translate-y-1.5 -z-10 blur-[1px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.8, duration: 0.6 }}
                      />
                    </motion.div>

                    {/* 4th brick only on desktop */}
                    <motion.div
                      className="hidden lg:block cursor-pointer group"
                      style={{
                        width: "120px",
                        height: "55px",
                        transformStyle: "preserve-3d"
                      }}
                      initial={{
                        y: -320,
                        rotateX: -90,
                        rotateZ: 15,
                        opacity: 0
                      }}
                      animate={{
                        y: 0,
                        rotateX: 0,
                        rotateZ: 0,
                        opacity: 1
                      }}
                      transition={{
                        duration: 1.2,
                        delay: 0.8,
                        ease: [0.25, 0.46, 0.45, 0.94]
                      }}
                      whileHover={{
                        scale: 1.05,
                        z: 20,
                        rotateX: -5,
                        rotateY: -5,
                        transition: { duration: 0.3 }
                      }}
                    >
                      <motion.div
                        className="w-full h-full bg-red-500 rounded-lg border-2 border-red-400 flex flex-col items-center justify-center p-1.5 shadow-xl hover:shadow-red-500/25"
                        whileHover={{
                          background: "linear-gradient(135deg, #ef4444, #dc2626)"
                        }}
                      >
                        <RefreshCw className="w-4 h-4 text-white mb-0.5" />
                        <h3 className="font-bold text-white text-xs text-center leading-tight">Analytics</h3>
                      </motion.div>
                      <motion.div
                        className="absolute inset-0 bg-black/30 rounded-lg translate-x-1.5 translate-y-1.5 -z-10 blur-[1px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2.0, duration: 0.6 }}
                      />
                    </motion.div>

                    {/* Row 2 - Middle Row */}
                    <motion.div
                      className="cursor-pointer group"
                      style={{
                        width: "clamp(80px, 15vw, 120px)",
                        height: "clamp(45px, 8vw, 55px)",
                        transformStyle: "preserve-3d"
                      }}
                      initial={{
                        y: -400,
                        rotateX: -90,
                        rotateZ: -12,
                        opacity: 0
                      }}
                      animate={{
                        y: 0,
                        rotateX: 0,
                        rotateZ: 0,
                        opacity: 1
                      }}
                      transition={{
                        duration: 1.2,
                        delay: 1.0,
                        ease: [0.25, 0.46, 0.45, 0.94]
                      }}
                      whileHover={{
                        scale: 1.05,
                        z: 20,
                        rotateX: -5,
                        rotateY: 5,
                        transition: { duration: 0.3 }
                      }}
                    >
                      <motion.div
                        className="w-full h-full bg-orange-500 rounded-lg border-2 border-orange-400 flex flex-col items-center justify-center p-1.5 shadow-xl hover:shadow-orange-500/25"
                        whileHover={{
                          background: "linear-gradient(135deg, #f97316, #ea580c)"
                        }}
                      >
                        <BarChart3 className="w-3 h-3 lg:w-4 lg:h-4 text-white mb-0.5" />
                        <h3 className="font-bold text-white text-[10px] lg:text-xs text-center leading-tight">Charts</h3>
                      </motion.div>
                      <motion.div
                        className="absolute inset-0 bg-black/30 rounded-lg translate-x-1.5 translate-y-1.5 -z-10 blur-[1px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2.2, duration: 0.6 }}
                      />
                    </motion.div>

                    <motion.div
                      className="cursor-pointer group"
                      style={{
                        width: "clamp(80px, 15vw, 120px)",
                        height: "clamp(45px, 8vw, 55px)",
                        transformStyle: "preserve-3d"
                      }}
                      initial={{
                        y: -440,
                        rotateX: -90,
                        rotateZ: 5,
                        opacity: 0
                      }}
                      animate={{
                        y: 0,
                        rotateX: 0,
                        rotateZ: 0,
                        opacity: 1
                      }}
                      transition={{
                        duration: 1.2,
                        delay: 1.2,
                        ease: [0.25, 0.46, 0.45, 0.94]
                      }}
                      whileHover={{
                        scale: 1.05,
                        z: 20,
                        rotateX: -5,
                        rotateY: -5,
                        transition: { duration: 0.3 }
                      }}
                    >
                      <motion.div
                        className="w-full h-full bg-cyan-500 rounded-lg border-2 border-cyan-400 flex flex-col items-center justify-center p-1.5 shadow-xl hover:shadow-cyan-500/25"
                        whileHover={{
                          background: "linear-gradient(135deg, #06b6d4, #0891b2)"
                        }}
                      >
                        <Zap className="w-3 h-3 lg:w-4 lg:h-4 text-white mb-0.5" />
                        <h3 className="font-bold text-white text-[10px] lg:text-xs text-center leading-tight">Automation</h3>
                      </motion.div>
                      <motion.div
                        className="absolute inset-0 bg-black/30 rounded-lg translate-x-1.5 translate-y-1.5 -z-10 blur-[1px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2.4, duration: 0.6 }}
                      />
                    </motion.div>

                    <motion.div
                      className="cursor-pointer group"
                      style={{
                        width: "clamp(80px, 15vw, 120px)",
                        height: "clamp(45px, 8vw, 55px)",
                        transformStyle: "preserve-3d"
                      }}
                      initial={{
                        y: -480,
                        rotateX: -90,
                        rotateZ: -5,
                        opacity: 0
                      }}
                      animate={{
                        y: 0,
                        rotateX: 0,
                        rotateZ: 0,
                        opacity: 1
                      }}
                      transition={{
                        duration: 1.2,
                        delay: 1.4,
                        ease: [0.25, 0.46, 0.45, 0.94]
                      }}
                      whileHover={{
                        scale: 1.05,
                        z: 20,
                        rotateX: -5,
                        rotateY: 5,
                        transition: { duration: 0.3 }
                      }}
                    >
                      <motion.div
                        className="w-full h-full bg-yellow-500 rounded-lg border-2 border-yellow-400 flex flex-col items-center justify-center p-1.5 shadow-xl hover:shadow-yellow-500/25"
                        whileHover={{
                          background: "linear-gradient(135deg, #eab308, #ca8a04)"
                        }}
                      >
                        <Shield className="w-3 h-3 lg:w-4 lg:h-4 text-white mb-0.5" />
                        <h3 className="font-bold text-white text-[10px] lg:text-xs text-center leading-tight">Alerts</h3>
                      </motion.div>
                      <motion.div
                        className="absolute inset-0 bg-black/30 rounded-lg translate-x-1.5 translate-y-1.5 -z-10 blur-[1px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2.6, duration: 0.6 }}
                      />
                    </motion.div>

                    {/* 8th brick only on desktop */}
                    <motion.div
                      className="hidden lg:block cursor-pointer group"
                      style={{
                        width: "120px",
                        height: "55px",
                        transformStyle: "preserve-3d"
                      }}
                      initial={{
                        y: -520,
                        rotateX: -90,
                        rotateZ: 18,
                        opacity: 0
                      }}
                      animate={{
                        y: 0,
                        rotateX: 0,
                        rotateZ: 0,
                        opacity: 1
                      }}
                      transition={{
                        duration: 1.2,
                        delay: 1.6,
                        ease: [0.25, 0.46, 0.45, 0.94]
                      }}
                      whileHover={{
                        scale: 1.05,
                        z: 20,
                        rotateX: -5,
                        rotateY: -5,
                        transition: { duration: 0.3 }
                      }}
                    >
                      <motion.div
                        className="w-full h-full bg-pink-500 rounded-lg border-2 border-pink-400 flex flex-col items-center justify-center p-1.5 shadow-xl hover:shadow-pink-500/25"
                        whileHover={{
                          background: "linear-gradient(135deg, #ec4899, #db2777)"
                        }}
                      >
                        <Database className="w-4 h-4 text-white mb-0.5" />
                        <h3 className="font-bold text-white text-xs text-center leading-tight">Storage</h3>
                      </motion.div>
                      <motion.div
                        className="absolute inset-0 bg-black/30 rounded-lg translate-x-1.5 translate-y-1.5 -z-10 blur-[1px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2.8, duration: 0.6 }}
                      />
                    </motion.div>

                    {/* Row 3 - Top Row (Mobile: 1 brick centered, Desktop: 2 bricks) */}
                    <motion.div
                      className="col-span-3 lg:col-span-2 lg:col-start-2 cursor-pointer group"
                      style={{
                        width: "clamp(80px, 20vw, 120px)",
                        height: "clamp(45px, 8vw, 55px)",
                        maxWidth: "200px",
                        transformStyle: "preserve-3d"
                      }}
                      initial={{
                        y: -560,
                        rotateX: -90,
                        rotateZ: 0,
                        opacity: 0
                      }}
                      animate={{
                        y: 0,
                        rotateX: 0,
                        rotateZ: 0,
                        opacity: 1
                      }}
                      transition={{
                        duration: 1.2,
                        delay: 1.8,
                        ease: [0.25, 0.46, 0.45, 0.94]
                      }}
                      whileHover={{
                        scale: 1.05,
                        z: 20,
                        rotateX: -5,
                        rotateY: 0,
                        transition: { duration: 0.3 }
                      }}
                    >
                      <motion.div
                        className="w-full h-full bg-indigo-500 rounded-lg border-2 border-indigo-400 flex flex-col items-center justify-center p-1.5 shadow-xl hover:shadow-indigo-500/25"
                        whileHover={{
                          background: "linear-gradient(135deg, #6366f1, #4f46e5)"
                        }}
                      >
                        <Wifi className="w-3 h-3 lg:w-4 lg:h-4 text-white mb-0.5" />
                        <h3 className="font-bold text-white text-[10px] lg:text-xs text-center leading-tight">Connectivity</h3>
                      </motion.div>
                      <motion.div
                        className="absolute inset-0 bg-black/30 rounded-lg translate-x-1.5 translate-y-1.5 -z-10 blur-[1px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 3.0, duration: 0.6 }}
                      />
                    </motion.div>
                  </motion.div>

                  {/* Simple ground indicator */}
                  <div className="flex justify-center mt-4">
                    <div className="flex space-x-1">
                      <div className="w-2 h-6 bg-gray-400 rounded-t opacity-60"></div>
                      <div className="w-2 h-4 bg-gray-500 rounded-t opacity-60"></div>
                      <div className="w-2 h-8 bg-gray-600 rounded-t opacity-60"></div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Bottom Info */}
            <motion.div
              className="text-center lg:text-left pt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <p className="text-sm text-muted-foreground">
                Access your IoT control system easily and securely
              </p>
            </motion.div>
          </motion.div>
        </div>

        {/* Right Section - Login Form */}
        <div className="relative flex flex-col justify-center items-center p-8 lg:p-12 z-10 bg-gradient-to-br from-background/50 to-muted/20 backdrop-blur-sm">
          <motion.div
            className="max-w-md w-full space-y-8"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            {/* Brand Header on Login Side */}
            <motion.div
              className="text-center lg:hidden"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Blocks className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Nexus</h1>
                  <p className="text-sm text-muted-foreground">Universal Dashboard</p>
                </div>
              </div>
            </motion.div>

            {/* Login Title */}
            <motion.div
              className="text-center space-y-2"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <h2 className="text-3xl font-bold text-foreground">Welcome back</h2>
              <p className="text-muted-foreground">Sign in to access your IoT control center</p>
            </motion.div>

            {/* Login Form */}
            <motion.form
              onSubmit={handleSubmit}
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.9 }}
              >
                <Label htmlFor="email" className="text-foreground font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="bg-input border-input text-foreground placeholder:text-muted-foreground focus:border-ring h-11"
                />
              </motion.div>

              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 1.0 }}
              >
                <Label htmlFor="password" className="text-foreground font-medium">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="pr-12 bg-input border-input text-foreground placeholder:text-muted-foreground focus:border-ring h-11"
                  />
                  <motion.button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded-md transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </motion.button>
                </div>
              </motion.div>

              {/* Error Message */}
              {error && (
                <motion.div
                  className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {error}
                </motion.div>
              )}

              {/* Submit Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 1.1 }}
              >
                <motion.div
                  whileHover={{
                    scale: 1.02,
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-lg h-12 text-base"
                    type="submit"
                    disabled={isLoading}
                    onKeyDown={(e) => {
                      // Prevent default browser behavior for Enter key
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        // Manually trigger form submission
                        const form = e.currentTarget.form;
                        if (form) {
                          const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
                          form.dispatchEvent(submitEvent);
                        }
                      }
                    }}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing In...
                      </>
                    ) : (
                      <>
                        <LogIn className="mr-2 h-4 w-4" />
                        Sign In
                      </>
                    )}
                  </Button>
                </motion.div>
              </motion.div>
            </motion.form>

            {/* Footer */}
            <motion.div
              className="text-center text-xs text-muted-foreground pt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.2 }}
            >
              Secured IoT monitoring platform
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <LoginForm />;
}
