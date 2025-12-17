# 🚀 Guia Completo de Deploy - GitHub + Vercel

Este guia detalha **passo a passo** como fazer deploy do sistema de portaria no GitHub + Vercel.

## 📋 Pré-requisitos

- [ ] Conta no [GitHub](https://github.com)
- [ ] Conta no [Vercel](https://vercel.com)
- [ ] Git instalado localmente
- [ ] Código-fonte do projeto

## 🔧 Passo 1: Preparar o Código

### 1.1 Ajustar Configurações

O projeto já vem configurado para Vercel, mas você precisa:

1. **Revisar `vercel.json`** - Já está configurado
2. **Usar schema PostgreSQL** - Trocar imports de `schema.ts` para `schema-postgres.ts`
3. **Usar autenticação standalone** - Trocar imports de `useAuth` para `useAuth-standalone`

### 1.2 Arquivos Importantes

- ✅ `vercel.json` - Configuração Vercel
- ✅ `drizzle.config-postgres.ts` - Configuração Drizzle PostgreSQL
- ✅ `drizzle/schema-postgres.ts` - Schema PostgreSQL
- ✅ `server/auth-standalone.ts` - Autenticação standalone
- ✅ `server/routes-standalone.ts` - Rotas HTTP standalone
- ✅ `client/src/hooks/useAuth-standalone.ts` - Hook de autenticação
- ✅ `client/src/pages/Login-standalone.tsx` - Página de login

## 📦 Passo 2: Criar Repositório GitHub

### 2.1 Inicializar Git

```bash
cd portaria_eventos
git init
git add .
git commit -m "Initial commit: Sistema de Portaria"
```

### 2.2 Criar Repositório no GitHub

1. Acesse [github.com/new](https://github.com/new)
2. Nome do repositório: `portaria-eventos` (ou outro nome)
3. Deixe **privado** se quiser manter o código fechado
4. **NÃO** inicialize com README (já temos)
5. Clique em "Create repository"

### 2.3 Fazer Push

```bash
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/portaria-eventos.git
git push -u origin main
```

## ☁️ Passo 3: Deploy no Vercel

### 3.1 Criar Projeto

1. Acesse [vercel.com/new](https://vercel.com/new)
2. Clique em "Import Git Repository"
3. Selecione seu repositório `portaria-eventos`
4. Clique em "Import"

### 3.2 Configurar Build

Vercel detecta automaticamente, mas confirme:

- **Framework Preset**: Other
- **Build Command**: `pnpm build`
- **Output Directory**: `client/dist`
- **Install Command**: `pnpm install`

### 3.3 Configurar Variáveis de Ambiente

**IMPORTANTE**: Adicione ANTES de fazer deploy!

1. Clique em "Environment Variables"
2. Adicione cada variável abaixo:

| Nome | Valor | Descrição |
|------|-------|-----------|
| `DATABASE_URL` | *(deixe vazio por enquanto)* | URL do Vercel Postgres |
| `JWT_SECRET` | `sua-chave-secreta-min-32-caracteres-aqui` | Chave para JWT |
| `ADMIN_PIN` | `1234` | PIN de acesso (altere!) |
| `NODE_ENV` | `production` | Ambiente |
| `VITE_APP_TITLE` | `Reserva Solar` | Título do app |
| `VITE_APP_LOGO` | `/logo.png` | Logo do app |

**Gerar JWT_SECRET seguro:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

3. Clique em "Deploy" (ainda vai falhar sem banco de dados)

## 🗄️ Passo 4: Configurar Banco de Dados

### 4.1 Criar Vercel Postgres

1. No dashboard do Vercel, vá no seu projeto
2. Clique na aba "Storage"
3. Clique em "Create Database"
4. Selecione "Postgres"
5. Nome: `portaria-db` (ou outro)
6. Região: Escolha a mais próxima
7. Clique em "Create"

### 4.2 Conectar ao Projeto

1. Após criar, clique em "Connect to Project"
2. Selecione seu projeto `portaria-eventos`
3. Clique em "Connect"
4. A variável `DATABASE_URL` será adicionada automaticamente

### 4.3 Aplicar Migrações

**Opção A: Via Vercel CLI (Recomendado)**

```bash
# Instalar Vercel CLI
npm i -g vercel

# Fazer login
vercel login

# Puxar variáveis de ambiente
vercel env pull .env.local

# Aplicar migrações
pnpm db:push
```

**Opção B: Manualmente**

1. Copie a `DATABASE_URL` do Vercel
2. Cole no seu `.env` local
3. Execute `pnpm db:push`

### 4.4 Popular Dados Iniciais (Opcional)

```bash
# Edite seed-db.mjs com seus tipos de ingressos
node seed-db.mjs
```

## 🔄 Passo 5: Redeploy

1. Volte ao dashboard do Vercel
2. Vá em "Deployments"
3. Clique em "Redeploy" no último deployment
4. Aguarde o build completar

## ✅ Passo 6: Testar

1. Acesse a URL do Vercel (ex: `portaria-eventos.vercel.app`)
2. Faça login com o PIN configurado
3. Teste venda de ingresso
4. Teste relatórios
5. Teste modo offline (DevTools → Network → Offline)

## 🌐 Passo 7: Domínio Personalizado (Opcional)

### 7.1 Adicionar Domínio

1. No Vercel, vá em "Settings" → "Domains"
2. Adicione seu domínio (ex: `portaria.seusite.com`)
3. Configure DNS conforme instruções do Vercel

### 7.2 Tipos de Configuração

**Subdomínio (Recomendado):**
```
CNAME  portaria  cname.vercel-dns.com
```

**Domínio Raiz:**
```
A      @         76.76.21.21
```

## 🔧 Troubleshooting

### ❌ Build Falha

**Erro**: `Cannot find module 'drizzle-orm/pg-core'`

**Solução**: Instalar dependência PostgreSQL
```bash
pnpm add drizzle-orm pg
```

### ❌ Erro de Conexão com Banco

**Erro**: `Connection refused`

**Solução**:
1. Verifique se `DATABASE_URL` está configurada
2. Confirme que o banco está na mesma região
3. Tente redeployar

### ❌ Login Não Funciona

**Erro**: `PIN inválido`

**Solução**:
1. Verifique se `ADMIN_PIN` está configurado
2. Limpe cookies do navegador
3. Verifique logs do Vercel

### ❌ PWA Não Funciona Offline

**Solução**:
1. Acesse via HTTPS (Vercel fornece automaticamente)
2. Faça um acesso online primeiro
3. Verifique Service Worker em DevTools

## 📊 Monitoramento

### Logs

Acesse logs em tempo real:
```bash
vercel logs portaria-eventos --follow
```

Ou no dashboard: Deployments → Clique no deployment → "Logs"

### Analytics

Vercel fornece analytics gratuito:
- Pageviews
- Visitors
- Top pages
- Referrers

Acesse em: Dashboard → Analytics

## 🔄 Atualizações Futuras

Sempre que fizer mudanças:

```bash
git add .
git commit -m "Descrição das mudanças"
git push
```

Vercel faz deploy automático a cada push!

## 🎉 Pronto!

Seu sistema de portaria está no ar! 🚀

**URLs Úteis:**
- 🌐 App: `https://seu-projeto.vercel.app`
- 📊 Dashboard: `https://vercel.com/seu-usuario/seu-projeto`
- 💾 Banco: Storage → portaria-db

**Próximos Passos:**
1. Altere o `ADMIN_PIN` padrão
2. Configure domínio personalizado
3. Adicione mais tipos de ingressos
4. Personalize logo e cores
