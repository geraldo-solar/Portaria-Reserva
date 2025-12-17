# 🎫 Sistema de Portaria de Eventos

Sistema completo de gerenciamento de portaria para eventos, com venda de ingressos, relatórios e funcionamento offline (PWA).

## ✨ Funcionalidades

- 🎟️ **Venda de Ingressos**: Interface rápida com carrinho e múltiplos produtos
- 📊 **Relatórios**: Estatísticas de vendas por período e método de pagamento
- 🖨️ **Impressão Térmica**: Ingressos e relatórios otimizados para impressoras térmicas 58mm
- 📱 **PWA Offline**: Funciona sem internet, sincroniza automaticamente
- 🔐 **Autenticação Simples**: Login com PIN
- 💾 **Banco de Dados**: PostgreSQL (Vercel Postgres)
- 🎨 **Interface Moderna**: React 19 + Tailwind CSS 4 + shadcn/ui

## 🚀 Deploy Rápido no Vercel

### 1. Preparar Repositório GitHub

```bash
# Clone ou faça upload do código para um repositório GitHub
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/seu-usuario/seu-repo.git
git push -u origin main
```

### 2. Deploy no Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login
2. Clique em "Add New Project"
3. Importe seu repositório GitHub
4. Configure as variáveis de ambiente:

```
DATABASE_URL=<sua-url-do-vercel-postgres>
JWT_SECRET=<chave-secreta-min-32-chars>
ADMIN_PIN=1234
VITE_APP_TITLE=Reserva Solar
VITE_APP_LOGO=/logo.png
```

5. Clique em "Deploy"

### 3. Configurar Banco de Dados

1. No dashboard do Vercel, vá em "Storage" → "Create Database" → "Postgres"
2. Copie a `DATABASE_URL` gerada
3. Adicione nas variáveis de ambiente do projeto
4. Execute as migrações:

```bash
# Localmente, com a DATABASE_URL configurada
pnpm db:push
```

## 💻 Desenvolvimento Local

### Requisitos

- Node.js 18+
- pnpm
- PostgreSQL (ou use Vercel Postgres remotamente)

### Instalação

```bash
# Instalar dependências
pnpm install

# Configurar variáveis de ambiente
cp ENVIRONMENT_VARIABLES.md .env
# Edite o .env com suas configurações

# Rodar migrações
pnpm db:push

# Iniciar servidor de desenvolvimento
pnpm dev
```

Acesse: `http://localhost:3000`

## 📁 Estrutura do Projeto

```
├── client/                 # Frontend React
│   ├── src/
│   │   ├── pages/         # Páginas (Home, SellTicket, Reports, Products)
│   │   ├── components/    # Componentes reutilizáveis
│   │   ├── hooks/         # Hooks customizados
│   │   └── lib/           # Utilitários (trpc, offlineStorage)
│   └── public/            # Arquivos estáticos (manifest.json, sw.js, ícones)
├── server/                # Backend Express + tRPC
│   ├── routers.ts         # Rotas tRPC
│   ├── db.ts              # Funções de banco de dados
│   ├── auth-standalone.ts # Autenticação standalone
│   └── routes-standalone.ts # Rotas HTTP standalone
├── drizzle/               # Schema e migrações
│   ├── schema.ts          # Schema MySQL (Manus)
│   └── schema-postgres.ts # Schema PostgreSQL (Vercel)
└── vercel.json            # Configuração Vercel
```

## 🔧 Scripts Disponíveis

```bash
pnpm dev          # Desenvolvimento
pnpm build        # Build de produção
pnpm test         # Executar testes
pnpm db:push      # Aplicar migrações
```

## 🌐 Funcionalidade Offline (PWA)

O sistema funciona completamente offline após o primeiro acesso:

1. **Cache Automático**: Todos os arquivos estáticos são cacheados
2. **Vendas Offline**: Salvas localmente no IndexedDB
3. **Sincronização Automática**: Quando a conexão voltar, dados são enviados ao servidor
4. **Indicador Visual**: Mostra status online/offline e vendas pendentes

## 🔐 Segurança

- **JWT**: Tokens seguros para sessões
- **Cookies HttpOnly**: Proteção contra XSS
- **PIN Configurável**: Altere `ADMIN_PIN` em produção
- **HTTPS**: Obrigatório em produção (Vercel fornece automaticamente)

## 📝 Variáveis de Ambiente

Veja `ENVIRONMENT_VARIABLES.md` para lista completa e exemplos.

## 🐛 Troubleshooting

### Erro de conexão com banco de dados
- Verifique se `DATABASE_URL` está correta
- Confirme que o banco PostgreSQL está acessível
- Execute `pnpm db:push` para aplicar migrações

### PWA não funciona offline
- Certifique-se de acessar via HTTPS
- Limpe o cache do navegador
- Verifique se o Service Worker foi registrado (DevTools → Application → Service Workers)

### PIN não funciona
- Verifique se `ADMIN_PIN` está configurado corretamente
- Limpe os cookies do navegador
- Tente fazer logout e login novamente

## 📄 Licença

MIT

## 🤝 Suporte

Para dúvidas ou problemas, abra uma issue no GitHub.
