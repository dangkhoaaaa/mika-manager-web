"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/lib/store";
import { ApiError } from "@/lib/api";

const schema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [error, setError] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    try {
      setError("");
      await login(data.email, data.password);
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Đăng nhập thất bại");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md"
    >
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 items-center justify-center text-lg font-bold mb-4">
            MK
          </div>
          <h1 className="text-2xl font-bold">Chào mừng trở lại</h1>
          <p className="text-muted-foreground mt-1">Đăng nhập để tiếp tục hành trình học tập</p>
        </div>

        <div className="glass-strong rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" className="mt-1.5" {...register("email")} />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="password">Mật khẩu</Label>
              <Input id="password" type="password" placeholder="••••••••" className="mt-1.5" {...register("password")} />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <Link href="/forgot-password" className="text-muted-foreground hover:text-foreground">
              Quên mật khẩu?
            </Link>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Chưa có tài khoản?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Đăng ký
            </Link>
          </p>
        </div>
      </motion.div>
  );
}
