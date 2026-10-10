import React from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Home } from "lucide-react";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', overflowX: 'hidden', width: '100%' }} className="bg-background relative flex flex-col justify-between">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-[#F7F7F7] blur-[150px]" />
        <div className="absolute bottom-[10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#F7F7F7] blur-[120px]" />
      </div>

      <Navbar />

      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-24">
        <div className="glass-card max-w-md w-full p-8 text-center border border-[#E0E0E0]">
          <div className="w-16 h-16 rounded-2xl bg-[#F7F7F7] border border-[#E0E0E0] flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-3xl font-display font-extrabold text-black mb-2">404 Page Not Found</h1>
          <p className="text-[#555555] text-sm mb-8 font-light">
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </p>
          <Link to="/" className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-black font-medium">
            <Home className="w-4 h-4" /> Go back home
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
