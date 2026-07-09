import { useAuth } from "@workspace/replit-auth-web";
import { useUpdateMyProfile } from "@workspace/api-client-react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UserCircle } from "lucide-react";

export function ProfilePage() {
  const { user } = useAuth();
  const [phone, setPhone] = useState(user?.phone || "");
  const updateProfile = useUpdateMyProfile();

  useEffect(() => {
    if (user?.phone) setPhone(user.phone);
  }, [user?.phone]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate(
      { data: { phone } },
      {
        onSuccess: () => {
          toast.success("Profile updated");
        }
      }
    );
  };

  if (!user) return null;

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">My Profile</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <UserCircle className="w-16 h-16 text-muted-foreground" />
          <div>
            <CardTitle>{user.firstName} {user.lastName}</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-lg mb-6 flex items-center justify-between">
            <span className="text-sm font-medium">Account Role</span>
            <span className="uppercase tracking-wider font-bold text-primary">{user.role}</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. +220 123 4567" />
            </div>
            <Button type="submit" disabled={updateProfile.isPending}>Save Changes</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
