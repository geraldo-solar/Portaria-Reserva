import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, AlertCircle, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function ManageProducts() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const utils = trpc.useUtils();
  const ticketTypesQuery = trpc.ticketTypes.list.useQuery();
  const createTicketTypeMutation = trpc.ticketTypes.create.useMutation({
    onSuccess: () => {
      utils.ticketTypes.list.invalidate();
    },
  });
  const deleteTicketTypeMutation = trpc.ticketTypes.delete.useMutation({
    onSuccess: () => {
      utils.ticketTypes.list.invalidate();
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!formData.name || formData.price === "") {
      setError("Nome e preço são obrigatórios");
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) {
      setError("Preço deve ser um número válido (maior ou igual a 0)");
      return;
    }

    try {
      await createTicketTypeMutation.mutateAsync({
        name: formData.name,
        description: formData.description || undefined,
        price: price,
      });

      setSuccess(true);
      setFormData({
        name: "",
        description: "",
        price: "",
      });

      // Recarregar lista
      ticketTypesQuery.refetch();

      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Erro ao cadastrar produto");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setLocation("/")}
              variant="ghost"
              size="sm"
              className="flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Voltar
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Cadastro de Produtos</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus size={20} />
                  Novo Produto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome do Produto *
                    </label>
                    <Input
                      type="text"
                      name="name"
                      placeholder="Ex: Inteira, Meia-entrada, VIP"
                      value={formData.name}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrição
                    </label>
                    <textarea
                      name="description"
                      placeholder="Ex: Ingresso inteira para acesso completo"
                      value={formData.description}
                      onChange={handleChange}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Preço (R$) *
                    </label>
                    <Input
                      type="number"
                      name="price"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={handleChange}
                    />
                    <p className="text-xs text-gray-500 mt-1">Valores com 0,00 são permitidos (cortesias)</p>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      <AlertCircle size={16} />
                      <span>{error}</span>
                    </div>
                  )}

                  {success && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                      <CheckCircle size={16} />
                      <span>Produto cadastrado com sucesso!</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold"
                  >
                    <Plus size={16} className="mr-2" />
                    Cadastrar Produto
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Info */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900 text-sm">Dicas</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-700 space-y-3">
              <p>✓ Você pode cadastrar produtos com preço R$ 0,00 para cortesias</p>
              <p>✓ Todos os produtos aparecem na seleção ao vender ingressos</p>
              <p>✓ Os preços podem ser editados a qualquer momento</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Produtos */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Produtos Cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            {ticketTypesQuery.isPending ? (
              <p className="text-gray-500">Carregando...</p>
            ) : ticketTypesQuery.data && ticketTypesQuery.data.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Nome</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Descrição</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Preço</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ticketTypesQuery.data.map((product) => (
                      <tr key={product.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-900 font-semibold">{product.name}</td>
                        <td className="px-4 py-2 text-gray-600 text-xs">{product.description || "-"}</td>
                        <td className="px-4 py-2 text-gray-900 font-semibold">
                          R$ {product.price.toFixed(2)}
                        </td>
                        <td className="px-4 py-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={async () => {
                              if (confirm(`Tem certeza que deseja excluir "${product.name}"?`)) {
                                try {
                                  await deleteTicketTypeMutation.mutateAsync(product.id);
                                } catch (err) {
                                  alert("Erro ao excluir produto");
                                }
                              }
                            }}
                            disabled={deleteTicketTypeMutation.isPending}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Nenhum produto cadastrado</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
