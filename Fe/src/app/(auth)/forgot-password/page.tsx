"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api";

const schema = z.object({
  email: z.string().email("Email không hợp lệ"),
});

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: z.infer<typeof schema>) {
    const res = await authApi.forgotPassword(data.email);
    setSent(true);
    if (res.token) setToken(res.token);
    setMessage(res.message);
  }

  async function handleReset() {
    await authApi.resetPassword(token, newPassword);
    setMessage("Đặt lại mật khẩu thành công!");
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Quên mật khẩu</h1>
          <p className="text-muted-foreground mt-1">Nhập email để nhận link đặt lại mật khẩu</p>
        </div>

        <div className="glass-strong rounded-2xl p-8 space-y-4 shadow-2xl">
          {!sent ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" className="mt-1.5" {...register("email")} />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                Gửi link đặt lại
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{message}</p>
              {token && (
                <>
                  <div>
                    <Label>Mật khẩu mới</Label>
                    <Input
                      type="password"
                      className="mt-1.5"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleReset} className="w-full">
                    Đặt lại mật khẩu
                  </Button>
                </>
              )}
            </div>
          )}

          <p className="text-center text-sm">
            <Link href="/login" className="text-primary hover:underline">
              Quay lại đăng nhập
            </Link>
          </p>
        </div>
      </motion.div>
  );
}
