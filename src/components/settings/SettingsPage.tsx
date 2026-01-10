import { Toaster } from "@/components/ui/sonner";
import { ProfileSection } from "./ProfileSection";
import { ChangePasswordSection } from "./ChangePasswordSection";
import { DeleteAccountSection } from "./DeleteAccountSection";

interface SettingsPageProps {
  userEmail: string;
  accessToken: string;
}

export function SettingsPage({ userEmail, accessToken }: SettingsPageProps) {
  return (
    <main className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Ustawienia</h1>

      <div className="flex flex-col gap-6">
        <ProfileSection email={userEmail} />
        <ChangePasswordSection accessToken={accessToken} />
        <DeleteAccountSection accessToken={accessToken} />
      </div>

      <Toaster />
    </main>
  );
}
