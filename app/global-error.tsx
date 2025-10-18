"use client";

import { AlertTriangle, Home, RotateCcw, Shield, Bug } from "lucide-react";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring service in production
    console.error("Global Error:", error);
  }, [error]);

  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-grid-pattern opacity-20 dark:opacity-10"></div>

          {/* Animated Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-red-900/20 dark:to-orange-900/20"></div>

          <div className="relative z-10 max-w-2xl w-full text-center space-y-8">
            {/* Main Visual */}
            <div className="space-y-6">
              <div className="relative">
                {/* Rotating Background Rings */}
                <div className="absolute inset-0 w-48 h-48 mx-auto bg-gradient-to-r from-red-400 to-orange-500 rounded-full opacity-20 animate-spin" style={{ animationDuration: '8s' }}></div>
                <div className="absolute inset-0 w-32 h-32 mx-auto m-8 bg-gradient-to-r from-orange-400 to-yellow-500 rounded-full opacity-30 animate-spin" style={{ animationDuration: '6s', animationDirection: 'reverse' }}></div>

                {/* Main Icon */}
                <div className="relative z-10 w-48 h-48 mx-auto bg-gradient-to-br from-red-500 to-orange-600 dark:from-red-600 dark:to-orange-700 rounded-3xl shadow-2xl flex items-center justify-center">
                  <Bug className="w-24 h-24 text-white" />
                </div>

                {/* Emergency Signal Dots */}
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full animate-ping shadow-lg"></div>
                <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-orange-500 rounded-full animate-ping shadow-lg" style={{ animationDelay: '0.5s' }}></div>
                <div className="absolute top-1/4 -left-2 w-3 h-3 bg-yellow-500 rounded-full animate-ping shadow-lg" style={{ animationDelay: '1s' }}></div>
              </div>

              {/* Error Title */}
              <div className="space-y-2">
                <h1 className="text-6xl lg:text-7xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                  Oops!
                </h1>
                <div className="w-16 h-1 bg-gradient-to-r from-red-400 to-orange-400 rounded-full mx-auto"></div>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-6">
              <div className="space-y-3">
                <h2 className="text-2xl lg:text-3xl font-bold text-foreground">
                  Something Went Wrong
                </h2>
                <p className="text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
                  We've encountered an unexpected error. Our team has been notified and is working on a fix.
                  Please try refreshing the page or contact support if the problem persists.
                </p>
              </div>

              {/* Error Details */}
              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-lg p-6 border border-white/20 dark:border-gray-700/50 max-w-lg mx-auto">
                <div className="flex items-center gap-3 mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <span className="font-medium text-red-700 dark:text-red-400">Error Details</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-mono text-red-600 dark:text-red-400">Application Error</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Digest:</span>
                    <span className="font-mono text-gray-600 dark:text-gray-400 text-xs truncate">
                      {error.digest || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time:</span>
                    <span className="font-mono text-gray-600 dark:text-gray-400">
                      {new Date().toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* System Status Card */}
              <div className="max-w-md mx-auto">
                <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-lg p-4 border border-white/20 dark:border-gray-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-green-500" />
                    <span className="font-medium text-sm">System Status</span>
                  </div>
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">Online</div>
                  <div className="text-xs text-muted-foreground">Monitoring active</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto">
                <button
                  onClick={() => reset()}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <RotateCcw className="w-5 h-5" />
                  Try Again
                </button>

                <button
                  onClick={() => window.location.href = '/'}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/80 dark:bg-gray-800/80 hover:bg-white/90 dark:hover:bg-gray-800/90 text-foreground border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <Home className="w-5 h-5" />
                  Go Home
                </button>
              </div>

              {/* Support Message */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 backdrop-blur-sm rounded-lg px-6 py-4 border border-blue-200/50 dark:border-blue-800/50">
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Shield className="w-4 h-4 text-blue-500" />
                  <span className="text-muted-foreground">
                    Need help? Contact our support team at{" "}
                    <a
                      href="mailto:support@company.com"
                      className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      support@company.com
                    </a>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Background Elements */}
          <div className="absolute top-16 left-16 w-24 h-24 bg-red-200 dark:bg-red-900 rounded-full opacity-20 animate-float"></div>
          <div className="absolute bottom-24 right-20 w-18 h-18 bg-orange-200 dark:bg-orange-900 rounded-full opacity-20 animate-float" style={{ animationDelay: '1.5s' }}></div>
          <div className="absolute top-40 right-32 w-12 h-12 bg-yellow-200 dark:bg-yellow-900 rounded-full opacity-20 animate-float" style={{ animationDelay: '3s' }}></div>

          <style jsx>{`
            @keyframes float {
              0%, 100% {
                transform: translateY(0px);
              }
              50% {
                transform: translateY(-15px);
              }
            }

            .animate-float {
              animation: float 8s ease-in-out infinite;
            }
          `}</style>
        </div>
      </body>
    </html>
  );
}
