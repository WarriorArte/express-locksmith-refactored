import { useState, useEffect } from "react";
import { User, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ImageUploader } from "@/components/shared/ImageUploader";
import { useQueryClient } from "@tanstack/react-query";
import { phpApiRequest } from "@/lib/phpApi";

export function ProfileSettings() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    email: "",
    avatar_url: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user || !profile?.id) return;
      
      setIsLoading(true);
      const data = await phpApiRequest<any>(`/profiles.php?id=${encodeURIComponent(profile.id)}`, {
        method: "GET",
      });

      if (data) {
        setProfileForm({
          full_name: data.full_name || "",
          email: data.email || user.email || "",
          avatar_url: data.avatar_url || "",
        });
      }
      setIsLoading(false);
    };

    fetchProfile();
  }, [user, profile?.id]);

  const handleSaveProfile = async () => {
    if (!user || !profile?.id) return;

    setIsSaving(true);
    try {
      await phpApiRequest(`/profiles.php?id=${encodeURIComponent(profile.id)}`, {
        method: "PUT",
        body: JSON.stringify({
          full_name: profileForm.full_name,
          avatar_url: profileForm.avatar_url,
        }),
      });

      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      
      toast({
        title: "Perfil actualizado",
        description: "Tus datos han sido guardados correctamente",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el perfil",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <User className="w-5 h-5 text-primary" />
        Mi Perfil
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Avatar */}
        <div className="lg:col-span-2">
          <Label>Foto de Perfil</Label>
          <div className="mt-2">
            <ImageUploader
              value={profileForm.avatar_url}
              onChange={(url) => setProfileForm(prev => ({ ...prev, avatar_url: url }))}
              folder="avatars"
              placeholder="https://ejemplo.com/avatar.png"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Recomendado: imagen cuadrada de 200x200px
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fullName">Nombre Completo</Label>
          <Input
            id="fullName"
            value={profileForm.full_name}
            onChange={(e) => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))}
            placeholder="Tu nombre completo"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="profileEmail">Correo Electrónico</Label>
          <Input
            id="profileEmail"
            type="email"
            value={profileForm.email}
            disabled
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            El correo no puede ser modificado
          </p>
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t">
        <Button
          className="gap-2"
          onClick={handleSaveProfile}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Guardar Cambios
        </Button>
      </div>
    </div>
  );
}
