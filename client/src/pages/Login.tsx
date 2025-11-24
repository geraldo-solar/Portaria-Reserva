import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { APP_LOGO, APP_TITLE } from "@/const";

export default function Login() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Simular validação de PIN
    if (pin === "1234") {
      // Armazenar sessão no localStorage
      localStorage.setItem("portaria_authenticated", "true");
      localStorage.setItem("portaria_login_time", new Date().toISOString());
      setLocation("/");
    } else {
      setError("PIN inválido. Tente novamente.");
      setPin("");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={APP_LOGO} alt="Logo" className="w-16 h-16 rounded-lg" />
          </div>
          <CardTitle className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
            {APP_TITLE}
          </CardTitle>
          <p className="text-gray-600 text-sm mt-2">Sistema de Portaria de Eventos</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PIN de Acesso
              </label>
              <Input
                type="password"
                inputMode="numeric"
                placeholder="Digite o PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value.slice(0, 4))}
                maxLength={4}
                className="text-center text-2xl tracking-widest font-mono"
                autoFocus
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={pin.length !== 4 || loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-2"
            >
              {loading ? "Acessando..." : "Acessar"}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-gray-500">
            <p>Sistema seguro de portaria</p>
            <p className="mt-1">© 2024 Todos os direitos reservados</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
