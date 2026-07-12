import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Shield, Lock, Mail, AlertCircle, Sparkles } from "lucide-react";
import { motion } from "motion/react";

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error || "Login failed. Please check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (quickEmail: string) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await login(quickEmail, "password");
      navigate("/dashboard");
    } catch (err: any) {
      setError("Demo login failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-gray px-4 relative overflow-hidden">
      {/* Visual background accents */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]" />

      <div className="w-full max-w-md">
        {/* LOGO BOX */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25 mb-3">
            <span className="text-white font-extrabold text-2xl font-mono">A</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">AssetFlow ERP</h1>
          <p className="text-xs font-semibold text-primary mt-1.5 tracking-widest uppercase font-mono">
            ENTERPRISE RESOURCE CONTROLLER
          </p>
        </div>

        {/* LOGIN CARD */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white border border-gray-200 rounded-xl shadow-lg shadow-gray-200/50 p-8"
        >
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2.5 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="name@assetflow.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Access Password
                </label>
                <span className="text-[10px] text-gray-400 font-medium">Default: password</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Authenticate Session</span>
                </>
              )}
            </button>
          </form>

          {/* QUICK DEMO LOGIN SLOTS (For Odoo Hackathon Showcase) */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <div className="flex items-center gap-1.5 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                Frictionless Role Showcase
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => handleQuickLogin("admin@assetflow.com")}
                className="p-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-left transition-all group"
              >
                <span className="block text-[10px] font-black text-gray-800 leading-none">Alex Carter</span>
                <span className="block text-[9px] font-medium text-gray-400 mt-1 uppercase tracking-wider group-hover:text-primary">
                  Admin Portal
                </span>
              </button>

              <button
                onClick={() => handleQuickLogin("manager@assetflow.com")}
                className="p-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-left transition-all group"
              >
                <span className="block text-[10px] font-black text-gray-800 leading-none">Jane Doe</span>
                <span className="block text-[9px] font-medium text-gray-400 mt-1 uppercase tracking-wider group-hover:text-primary">
                  Asset Manager
                </span>
              </button>

              <button
                onClick={() => handleQuickLogin("depthead@assetflow.com")}
                className="p-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-left transition-all group"
              >
                <span className="block text-[10px] font-black text-gray-800 leading-none">Priya Shah</span>
                <span className="block text-[9px] font-medium text-gray-400 mt-1 uppercase tracking-wider group-hover:text-primary">
                  Dept Head (Eng)
                </span>
              </button>

              <button
                onClick={() => handleQuickLogin("employee@assetflow.com")}
                className="p-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-left transition-all group"
              >
                <span className="block text-[10px] font-black text-gray-800 leading-none">Sarah Jenkins</span>
                <span className="block text-[9px] font-medium text-gray-400 mt-1 uppercase tracking-wider group-hover:text-primary">
                  Field Employee
                </span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
