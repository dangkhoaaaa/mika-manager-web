import { AuthBackdrop } from "@/components/auth/AuthBackdrop";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <AuthBackdrop />
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-6">
        {children}
      </div>
    </div>
  );
}
