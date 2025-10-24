"use client";

import { useState, useEffect } from "react";
import { Loader2, Activity, CheckCircle, Zap, Shield, Cpu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function LoginSuccessLoader() {
  const { isAuthenticated } = useAuth();
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const loadingSteps = [
    {
      icon: CheckCircle,
      title: "Authentication Verified",
      description: "Login credentials validated successfully",
      color: "text-green-500"
    },
    {
      icon: Shield,
      title: "Securing Session",
      description: "Establishing secure connection",
      color: "text-blue-500"
    },
    {
      icon: Activity,
      title: "Loading Dashboard",
      description: "Initializing monitoring interface",
      color: "text-purple-500"
    },
    {
      icon: Cpu,
      title: "Configuring Systems",
      description: "Setting up IoT device connections",
      color: "text-orange-500"
    }
  ];

  useEffect(() => {
    if (!isAuthenticated) return;

    let currentStep = 0;
    let currentProgress = 0;

    const interval = setInterval(() => {
      currentProgress += Math.random() * 15;
      if (currentProgress >= 25 * (currentStep + 1)) {
        currentStep = Math.min(currentStep + 1, loadingSteps.length - 1);
        setStep(currentStep);
      }
      setProgress(Math.min(currentProgress, 100));

      if (currentProgress >= 100) {
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  if (!isAuthenticated || progress >= 100) return null;

  const currentStepData = loadingSteps[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center space-y-6">
          {/* Animated Icon */}
          <div className="relative">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-lg">
              <currentStepData.icon className="w-10 h-10 text-primary-foreground animate-pulse" />
            </div>

            {/* Outer rotating ring */}
            <div className="absolute inset-0 w-20 h-20 mx-auto border-4 border-muted rounded-full animate-spin border-t-primary"></div>
          </div>

          {/* Progress Text */}
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-foreground">
              {currentStepData.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {currentStepData.description}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {Math.round(progress)}% complete
            </p>
          </div>

          {/* Loading Message */}
          <div className="text-sm bg-muted text-muted-foreground rounded-lg p-3 border border-border">
            <p className="flex items-center justify-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Preparing your IoT Dashboard experience...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
