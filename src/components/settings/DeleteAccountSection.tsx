import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteAccountForm } from "./DeleteAccountForm";

interface DeleteAccountSectionProps {
  accessToken: string;
}

export function DeleteAccountSection({ accessToken }: DeleteAccountSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Usuń konto</CardTitle>
        <CardDescription>
          Po usunięciu konta wszystkie Twoje dane zostaną trwale usunięte i nie będzie możliwości ich odzyskania.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DeleteAccountForm accessToken={accessToken} />
      </CardContent>
    </Card>
  );
}
