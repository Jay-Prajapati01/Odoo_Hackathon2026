import React from "react";
import { Link } from "react-router-dom";
import { Search, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md bg-white border border-gray-200 rounded-xl p-8 shadow-md"
      >
        <div className="w-16 h-16 rounded-full bg-primary/5 text-primary flex items-center justify-center mx-auto mb-6">
          <Search className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Resource Not Found (404)</h2>
        <p className="text-xs font-semibold text-primary font-mono uppercase tracking-widest mt-2">
          Page or Record Missing
        </p>
        <p className="text-xs text-gray-500 mt-4 leading-relaxed">
          The requested ERP view, asset serial, or document identifier could not be resolved on the active server node.
        </p>
        <div className="mt-8 flex gap-3 justify-center">
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2 rounded-lg transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go to Dashboard</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
};
