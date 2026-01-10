import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm } from "./ChangePasswordForm";

interface ChangePasswordSectionProps {
  accessToken: string;
}

export function ChangePasswordSection({ accessToken }: ChangePasswordSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Zmień hasło</CardTitle>
      </CardHeader>
      <CardContent>
        <ChangePasswordForm accessToken={accessToken} />
      </CardContent>
    </Card>
  );
}
