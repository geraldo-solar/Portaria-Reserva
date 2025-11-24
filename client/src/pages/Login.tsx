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
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Background com logo branca */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-700 via-emerald-600 to-emerald-800 flex items-center justify-center opacity-100">
        <img 
          src={APP_LOGO} 
          alt="Logo Background" 
          className="w-96 h-96 opacity-15 object-contain" 
        />
      </div>

      {/* Card de login */}
      <Card className="w-full max-w-md shadow-2xl relative z-10 bg-white">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-emerald-700 p-3 rounded-lg shadow-md">
              <img src={APP_LOGO} alt="Logo" className="w-20 h-20 object-contain" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-emerald-700">
            {APP_TITLE}
          </CardTitle>
          <p className="text-emerald-600 text-sm mt-2">Sistema de Portaria de Eventos</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-emerald-800 mb-2">
                PIN de Acesso
              </label>
              <Input
                type="password"
                inputMode="numeric"
                placeholder="Digite o PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value.slice(0, 4))}
                maxLength={4}
                className="text-center text-2xl tracking-widest font-mono border-emerald-300 focus:ring-emerald-500"
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
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 disabled:opacity-50"
            >
              {loading ? "Acessando..." : "Acessar"}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-emerald-600">
            <p>Sistema seguro de portaria</p>
            <p className="mt-1">© 2024 Todos os direitos reservados</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
