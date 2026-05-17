"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";

type Mode = "login" | "register";

const inputClass =
  "w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 backdrop-blur-sm";

export function AuthForm({ mode }: { mode: Mode }) {
  const { login, register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/20 bg-black/40 backdrop-blur-xl shadow-2xl p-8 sm:p-10">
      <p className="text-xs uppercase tracking-[0.25em] text-white/70 mb-2 text-center">
        {mode === "login" ? "Welcome back" : "Get started"}
      </p>
      <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-2 text-center">
        {mode === "login" ? "Sign in" : "Create account"}
      </h2>
      <p className="text-sm text-white/60 mb-8 text-center">
        {mode === "login"
          ? "Manage your web projects professionally."
          : "Start tracking tasks, bugs, and releases."}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "register" && (
          <Field label="Name">
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Your name"
            />
          </Field>
        )}
        <Field label="Email">
          <input
            className={inputClass}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Password">
          <input
            className={inputClass}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            placeholder="••••••••"
          />
        </Field>

        {error && (
          <p className="text-sm text-red-300 bg-red-500/20 border border-red-400/30 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full rounded-xl bg-white/90 hover:bg-white text-black px-4 py-3 text-sm font-semibold transition disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin mx-auto" />
          ) : mode === "login" ? (
            "Sign in"
          ) : (
            "Create account"
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-white/60">
        {mode === "login" ? (
          <>
            No account?{" "}
            <Link href="/register" className="text-white font-medium hover:underline">
              Register
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-white font-medium hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-white/70 mb-1.5 block">
        {label}
      </span>
      {children}
    </label>
  );
}
