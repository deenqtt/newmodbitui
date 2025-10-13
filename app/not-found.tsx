"use client";

import { AlertTriangle, Home, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function NotFound() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-20 dark:opacity-10"></div>

      {/* Animated Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20"></div>

      <div className="relative z-10 max-w-2xl w-full text-center space-y-8">
        {/* Main Visual */}
        <div className="space-y-6">
          <div className="relative">
            {/* Animated Background Circle */}
            <div className="absolute inset-0 w-48 h-48 mx-auto bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full opacity-20 animate-pulse"></div>

            {/* Main Icon */}
            <div className="relative z-10 w-48 h-48 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 rounded-3xl shadow-2xl flex items-center justify-center">
              <AlertTriangle className="w-24 h-24 text-white" />
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 w-8 h-8 bg-red-400 rounded-full animate-bounce shadow-lg"></div>
            <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-yellow-400 rounded-full animate-bounce shadow-lg" style={{ animationDelay: '0.5s' }}></div>
            <div className="absolute top-1/2 -right-8 w-4 h-4 bg-green-400 rounded-full animate-bounce shadow-lg" style={{ animationDelay: '1s' }}></div>
          </div>

          {/* Error Code */}
          <div className="space-y-2">
            <h1 className="text-8xl lg:text-9xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              404
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full mx-auto"></div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
              Page Not Found
            </h2>
            <p className="text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed">
              The page you're looking for has been moved, deleted, or does not exist.
              Let's get you back on track with your IoT monitoring dashboard.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-lg p-4 border border-white/20 dark:border-gray-700/50">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">99.9%</div>
              <div className="text-xs text-muted-foreground">Uptime</div>
            </div>
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-lg p-4 border border-white/20 dark:border-gray-700/50">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">24/7</div>
              <div className="text-xs text-muted-foreground">Monitoring</div>
            </div>
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-lg p-4 border border-white/20 dark:border-gray-700/50">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">500+</div>
              <div className="text-xs text-muted-foreground">Devices</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <Home className="w-5 h-5" />
              Go to Dashboard
            </Link>

            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/80 dark:bg-gray-800/80 hover:bg-white/90 dark:hover:bg-gray-800/90 text-foreground border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <RefreshCw className="w-5 h-5" />
              Try Again
            </button>
          </div>

          {/* Footer Message */}
          <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm rounded-lg px-6 py-4 border border-white/20 dark:border-gray-700/50">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <ArrowLeft className="w-4 h-4" />
              <span>If you're experiencing issues, contact your system administrator</span>
            </div>
          </div>
        </div>
      </div>

      {/* Background Elements */}
      <div className="absolute top-10 left-10 w-20 h-20 bg-blue-200 dark:bg-blue-900 rounded-full opacity-20 animate-float"></div>
      <div className="absolute bottom-20 right-16 w-16 h-16 bg-indigo-200 dark:bg-indigo-900 rounded-full opacity-20 animate-float" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-32 right-20 w-12 h-12 bg-purple-200 dark:bg-purple-900 rounded-full opacity-20 animate-float" style={{ animationDelay: '2s' }}></div>

      {mounted && (
        <style jsx>{`
          @keyframes float {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-10px);
            }
          }

          .animate-float {
            animation: float 6s ease-in-out infinite;
          }
        `}</style>
      )}
    </div>
  );
}
