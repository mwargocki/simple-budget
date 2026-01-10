import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SessionExpiredToast } from "./SessionExpiredToast";
import { LoginForm } from "./LoginForm";

interface LoginPageProps {
  sessionExpired?: boolean;
}

export function LoginPage({ sessionExpired = false }: LoginPageProps) {
  const [showSessionExpiredToast, setShowSessionExpiredToast] = useState(sessionExpired);

  const handleCloseToast = useCallback(() => {
    setShowSessionExpiredToast(false);
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background">
      <SessionExpiredToast visible={showSessionExpiredToast} onClose={handleCloseToast} />

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Zaloguj się</CardTitle>
          <CardDescription>Wprowadź swoje dane, aby kontynuować</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
