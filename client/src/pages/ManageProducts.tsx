import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, AlertCircle, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ManageProducts() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<{ id: number; name: string } | null>(null);

  const utils = trpc.useUtils();
  const ticketTypesQuery = trpc.ticketTypes.list.useQuery();
  // Using access.createProduct instead of ticketTypes.create
  const createTicketTypeMutation = trpc.access.createProduct.useMutation({
    onSuccess: () => {
      utils.ticketTypes.list.invalidate();
    },
  });
  const deleteTicketTypeMutation = trpc.ticketTypes.delete.useMutation({
    onSuccess: () => {
      utils.ticketTypes.list.invalidate();
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    },
  });

  // Diagnostic
  const { data: brevoStatus } = trpc.system.brevoStatus.useQuery();
  if (brevoStatus) {
    console.log("diagnostico_brevo:", brevoStatus);
  }

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

    const price = parseFloat(formData.price.replace(',', '.'));
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

      setFormData({ name: "", description: "", price: "" });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Erro ao cadastrar produto");
    }
  };

  const handleDeleteClick = (product: { id: number; name: string }) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    try {
      await deleteTicketTypeMutation.mutateAsync(productToDelete.id);
    } catch (err) {
      setError("Erro ao excluir produto");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100">
      {/* Header */}
      <header className="bg-white border-b border-emerald-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
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
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulário de Cadastro */}
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
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Ex: Inteira, Meia-entrada, VIP"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrição
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Ex: Ingresso inteira para acesso completo"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                      value={formData.price}
                      onChange={handleChange}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Valores com 0,00 são permitidos (cortesias)
                    </p>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md">
                      <AlertCircle size={16} />
                      <span className="text-sm">{error}</span>
                    </div>
                  )}

                  {success && (
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-md">
                      <CheckCircle size={16} />
                      <span className="text-sm">Produto cadastrado com sucesso!</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={createTicketTypeMutation.isPending}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                  >
                    <Plus size={16} className="mr-2" />
                    {createTicketTypeMutation.isPending ? "Cadastrando..." : "Cadastrar Produto"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Dicas */}
          <div className="lg:col-span-1">
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-900 text-lg">Dicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-blue-800">
                <p>✓ Você pode cadastrar produtos com preço R$ 0,00 para cortesias</p>
                <p>✓ Todos os produtos aparecem na seleção ao vender ingressos</p>
                <p>✓ Os preços podem ser editados a qualquer momento</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Lista de Produtos */}
        <Card className="mt-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Produtos Cadastrados</CardTitle>

            </div>
          </CardHeader>
          <CardContent>
            {ticketTypesQuery.isLoading ? (
              <p className="text-center text-gray-500 py-8">Carregando produtos...</p>
            ) : ticketTypesQuery.data && ticketTypesQuery.data.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Nome
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Descrição
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Preço
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ticketTypesQuery.data.map((product) => (
                      <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-900 font-medium">{product.name}</td>
                        <td className="px-4 py-2 text-gray-600 text-xs">{product.description || "-"}</td>
                        <td className="px-4 py-2 text-gray-900 font-semibold">
                          R$ {product.price.toFixed(2)}
                        </td>
                        <td className="px-4 py-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteClick({ id: product.id, name: product.name })}
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
              <p className="text-center text-gray-500 py-8">
                Nenhum produto cadastrado ainda. Cadastre o primeiro produto acima!
              </p>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Diálogo de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o produto "{productToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
