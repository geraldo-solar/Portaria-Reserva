/**
 * Página de login standalone (sem OAuth Manus)
 */

import { useState } from "react";
import { useAuthStandalone } from "@/hooks/useAuth-standalone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_LOGO, APP_TITLE } from "@/const";
import { toast } from "sonner";

export default function LoginStandalone() {
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuthStandalone();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!pin) {
      toast.error("Digite o PIN de acesso");
      return;
    }

    setIsLoading(true);
    const result = await login(pin);
    setIsLoading(false);

    if (result.success) {
      toast.success("Login realizado com sucesso!");
      window.location.href = "/";
    } else {
      toast.error(result.error || "PIN inválido");
      setPin("");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-600 to-teal-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-24 h-24 bg-teal-600 rounded-2xl flex items-center justify-center">
              <img src={APP_LOGO} alt="Logo" className="w-16 h-16 object-contain" />
            </div>
          </div>
          <CardTitle className="text-2xl text-teal-700">Portaria {APP_TITLE}</CardTitle>
          <CardDescription>Sistema de Portaria de Eventos</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="pin" className="text-sm font-medium text-teal-700">
                PIN de Acesso
              </label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                placeholder="Digite o PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                disabled={isLoading}
                className="text-center text-lg tracking-widest"
                maxLength={10}
                autoFocus
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-700"
              disabled={isLoading}
            >
              {isLoading ? "Acessando..." : "Acessar"}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Sistema seguro de portaria</p>
            <p className="text-xs mt-1">© 2024 Todos os direitos reservados</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
