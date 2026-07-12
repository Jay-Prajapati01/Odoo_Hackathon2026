import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";

export const Forbidden: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md bg-white border border-gray-200 rounded-xl p-8 shadow-md"
      >
        <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Access Restricted (403)</h2>
        <p className="text-xs font-semibold text-primary font-mono uppercase tracking-widest mt-2">
          Role Permissions Violation
        </p>
        <p className="text-xs text-gray-500 mt-4 leading-relaxed">
          Your current security role does not have administrative privileges to access this ERP module. 
          Please contact your IT administrator or switch your sandbox profile in the user menu.
        </p>
        <div className="mt-8 flex gap-3 justify-center">
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2 rounded-lg transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Overview</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
};
