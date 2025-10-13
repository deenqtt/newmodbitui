"use client";

import { useState } from "react";
// Impor AuthProvider juga, karena halaman ini akan menyediakannya
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
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
import { Loader2, LogIn, Eye, EyeOff, Activity, Cpu, Zap, Shield } from "lucide-react";

// Komponen ini berisi logika dan UI form login yang sebenarnya.
// Ia sekarang aman untuk memanggil useAuth() karena parent-nya (LoginPage) menyediakan provider.
function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await login(email, password);
      // Login berhasil, router.push sudah ditangani di AuthContext
    } catch (err: any) {
      setError(
        err.message || "Failed to login. Please check your credentials."
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Animated Background Grid Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30"></div>

      {/* Primary Background Image with Data Center Theme */}
      <div className="absolute inset-0">
        <img
          src="/images/datacenter-bg.jpg"
          alt="Data Center Technology"
          className="w-full h-full object-cover opacity-40 dark:opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-indigo-900/60 to-purple-900/40 dark:from-gray-900/90 dark:via-blue-900/70 dark:to-indigo-900/50"></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Left Side - Hero Content */}
            <div className="hidden lg:block space-y-8 text-white">
              <div className="space-y-4 text-center lg:text-left">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20">
                  <Activity className="w-10 h-10 text-blue-300" />
                </div>
                <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                  IoT Control Center
                  <span className="block text-3xl lg:text-4xl font-light text-blue-200 mt-2">
                    Industrial Monitoring
                  </span>
                </h1>
                <p className="text-xl text-blue-100 leading-relaxed max-w-xl">
                  Comprehensive data center and IoT device management platform.
                  Monitor real-time performance, manage configurations, and ensure
                  optimal operational efficiency across your infrastructure.
                </p>
              </div>

              {/* Feature Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 shadow-xl">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <Zap className="w-5 h-5 text-blue-300" />
                    </div>
                    <span className="font-semibold">Real-time Monitoring</span>
                  </div>
                  <p className="text-sm text-blue-200">
                    Live data streams from all connected IoT devices
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 shadow-xl">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <Shield className="w-5 h-5 text-green-300" />
                    </div>
                    <span className="font-semibold">Secure Access</span>
                  </div>
                  <p className="text-sm text-green-200">
                    Enterprise-grade security for critical operations
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 shadow-xl">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <Cpu className="w-5 h-5 text-purple-300" />
                    </div>
                    <span className="font-semibold">AI Analytics</span>
                  </div>
                  <p className="text-sm text-purple-200">
                    Predictive maintenance and automated insights
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 shadow-xl">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                      <Activity className="w-5 h-5 text-orange-300" />
                    </div>
                    <span className="font-semibold">24/7 Uptime</span>
                  </div>
                  <p className="text-sm text-orange-200">
                    Continuous monitoring and alert system
                  </p>
                </div>
              </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex justify-center">
              <Card className="w-full max-w-md shadow-2xl backdrop-blur-xl bg-white/95 dark:bg-gray-900/95 border border-white/20 dark:border-gray-700/50">
                {/* Mobile Hero Section */}
                <div className="lg:hidden text-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg mb-4">
                    <Activity className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    IoT Control Center
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Industrial IoT Monitoring Platform
                  </p>
                </div>

                <CardHeader className="space-y-1 text-center px-8 pt-8 pb-2">
                  <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Welcome Back
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Access your IoT monitoring dashboard
                  </CardDescription>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                  <CardContent className="space-y-6 px-8">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-foreground">
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="operator@company.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                        className="h-12 border-border focus:border-blue-500 focus:ring-blue-500 rounded-lg transition-all duration-200 bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium text-foreground">
                        Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your secure password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={isLoading}
                          className="h-12 pr-12 border-border focus:border-blue-500 focus:ring-blue-500 rounded-lg transition-all duration-200 bg-background"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-4 flex items-center hover:bg-muted rounded-r-lg transition-colors duration-200"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={isLoading}
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <Eye className="h-5 w-5 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">
                        <p className="text-sm">{error}</p>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="px-8 pb-8">
                    <Button
                      className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-lg transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                      type="submit"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Signing In...
                        </>
                      ) : (
                        <>
                          <LogIn className="mr-2 h-5 w-5" />
                          Sign In to Dashboard
                        </>
                      )}
                    </Button>
                    <p className="text-center text-sm text-muted-foreground mt-4">
                      Authorized personnel access only
                    </p>
                  </CardFooter>
                </form>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Komponen Halaman Login utama yang sekarang tugasnya adalah menyediakan AuthProvider
// untuk komponen LoginForm.
export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginForm />
    </AuthProvider>
  );
}
