import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, FileText, LogOut, Ticket, XCircle, Plus } from "lucide-react";
import { APP_LOGO, APP_TITLE } from "@/const";

export default function Home() {
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("portaria_authenticated");
    localStorage.removeItem("portaria_login_time");
    setLocation("/login");
  };

  const menuItems = [
    {
      title: "Vender Ingresso",
      description: "Registrar nova venda de ingresso",
      icon: Ticket,
      href: "/sell",
      color: "from-purple-600 to-pink-600",
    },
    {
      title: "Cancelar Ingresso",
      description: "Cancelar uma venda realizada",
      icon: XCircle,
      href: "/cancel",
      color: "from-red-600 to-orange-600",
    },
    {
      title: "Dashboard",
      description: "Visualizar dados em tempo real",
      icon: BarChart3,
      href: "/dashboard",
      color: "from-blue-600 to-cyan-600",
    },
    {
      title: "Relatórios",
      description: "Extratos e resumos de vendas",
      icon: FileText,
      href: "/reports",
      color: "from-green-600 to-emerald-600",
    },
    {
      title: "Cadastro de Produtos",
      description: "Gerenciar tipos de ingressos",
      icon: Plus,
      href: "/products",
      color: "from-indigo-600 to-purple-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={APP_LOGO} alt="Logo" className="w-10 h-10 rounded-lg" />
            <div>
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                {APP_TITLE}
              </h1>
              <p className="text-xs text-gray-500">Sistema de Portaria de Eventos</p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="flex items-center gap-2"
          >
            <LogOut size={16} />
            Sair
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Bem-vindo ao Sistema</h2>
          <p className="text-gray-600">Escolha uma opção abaixo para começar</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.href}
                className="hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => setLocation(item.href)}
              >
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${item.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <Icon className="text-white" size={24} />
                  </div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">{item.description}</p>
                  <Button className="w-full" variant="outline">
                    Acessar
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">Ingressos Vendidos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">-</p>
              <p className="text-sm text-blue-700 mt-2">Carregando dados...</p>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-green-900">Receita Total</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">R$ -</p>
              <p className="text-sm text-green-700 mt-2">Carregando dados...</p>
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-orange-200">
            <CardHeader>
              <CardTitle className="text-orange-900">Cancelamentos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-600">-</p>
              <p className="text-sm text-orange-700 mt-2">Carregando dados...</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
