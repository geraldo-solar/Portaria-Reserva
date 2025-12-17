# 🔄 Instruções de Migração Manual

Este arquivo lista **todas as mudanças necessárias** para migrar do sistema Manus para standalone (GitHub + Vercel).

## ⚠️ IMPORTANTE

Os arquivos standalone já foram criados, mas você precisa **ativar** eles manualmente fazendo as substituições abaixo.

## 📝 Mudanças Necessárias

### 1. Backend - Autenticação

**Arquivo**: `server/_core/index.ts`

**Trocar:**
```typescript
import oauthRouter from "./oauth";
app.use(oauthRouter);
```

**Por:**
```typescript
import standaloneAuthRouter from "../routes-standalone";
app.use(standaloneAuthRouter);
```

---

### 2. Backend - Context

**Arquivo**: `server/_core/context.ts`

**Trocar:**
```typescript
import { getUserFromRequest } from "./oauth";
```

**Por:**
```typescript
import { getUserFromRequest } from "../auth-standalone";
```

---

### 3. Backend - Banco de Dados

**Arquivo**: `server/db.ts`

**Trocar:**
```typescript
import { users, tickets, ticketTypes, customers } from "../drizzle/schema";
```

**Por:**
```typescript
import { users, tickets, ticketTypes, customers } from "../drizzle/schema-postgres";
```

**E trocar:**
```typescript
import { drizzle } from "drizzle-orm/mysql2";
```

**Por:**
```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
```

**E trocar:**
```typescript
_db = drizzle(process.env.DATABASE_URL);
```

**Por:**
```typescript
const client = postgres(process.env.DATABASE_URL!);
_db = drizzle(client);
```

---

### 4. Frontend - Autenticação

**Arquivo**: `client/src/App.tsx`

**Trocar:**
```typescript
import { useAuth } from "@/_core/hooks/useAuth";
```

**Por:**
```typescript
import { useAuthStandalone as useAuth } from "@/hooks/useAuth-standalone";
```

---

### 5. Frontend - Página de Login

**Arquivo**: `client/src/App.tsx`

**Adicionar import:**
```typescript
import LoginStandalone from "@/pages/Login-standalone";
```

**Trocar a rota de login:**
```typescript
<Route path="/login" component={LoginStandalone} />
```

---

### 6. Frontend - Remover Dependências Manus

**Arquivo**: `client/src/pages/Home.tsx`

**Remover:**
```typescript
import { getLoginUrl } from "@/const";
```

**Trocar:**
```typescript
<a href={getLoginUrl()}>Login</a>
```

**Por:**
```typescript
<a href="/login">Login</a>
```

---

### 7. Configuração Drizzle

**Arquivo**: `package.json`

**Trocar script:**
```json
"db:push": "drizzle-kit push"
```

**Por:**
```json
"db:push": "drizzle-kit push --config=drizzle.config-postgres.ts"
```

---

### 8. Dependências

**Instalar:**
```bash
pnpm add postgres drizzle-orm jsonwebtoken
pnpm add -D @types/jsonwebtoken
```

---

## 🧪 Testar Localmente

Após fazer as mudanças:

1. **Configurar .env:**
```bash
DATABASE_URL="postgresql://localhost:5432/portaria"
JWT_SECRET="sua-chave-secreta-min-32-chars"
ADMIN_PIN="1234"
```

2. **Aplicar migrações:**
```bash
pnpm db:push
```

3. **Iniciar servidor:**
```bash
pnpm dev
```

4. **Testar:**
- Acesse `http://localhost:3000`
- Faça login com PIN `1234`
- Teste venda de ingresso
- Teste relatórios

---

## ✅ Checklist de Migração

- [ ] Substituir autenticação no `server/_core/index.ts`
- [ ] Substituir context em `server/_core/context.ts`
- [ ] Atualizar imports do schema em `server/db.ts`
- [ ] Trocar driver MySQL por PostgreSQL em `server/db.ts`
- [ ] Substituir useAuth em `client/src/App.tsx`
- [ ] Adicionar rota de login standalone
- [ ] Remover dependências Manus do frontend
- [ ] Atualizar script db:push no `package.json`
- [ ] Instalar dependências PostgreSQL
- [ ] Testar localmente
- [ ] Fazer deploy no Vercel

---

## 🚨 Problemas Comuns

### Erro: Cannot find module 'postgres'
**Solução**: `pnpm add postgres`

### Erro: Cannot find module 'jsonwebtoken'
**Solução**: `pnpm add jsonwebtoken @types/jsonwebtoken`

### Erro: Schema mismatch
**Solução**: Execute `pnpm db:push` novamente

### Login não funciona
**Solução**: Verifique se `JWT_SECRET` e `ADMIN_PIN` estão no `.env`

---

## 📦 Alternativa: Usar Arquivos Standalone Diretamente

Se preferir **não modificar** os arquivos existentes, você pode:

1. Renomear arquivos atuais (adicionar `.manus` no final)
2. Renomear arquivos standalone (remover `-standalone`)
3. Ajustar imports conforme necessário

Exemplo:
```bash
# Backend
mv server/_core/oauth.ts server/_core/oauth.ts.manus
mv server/auth-standalone.ts server/auth.ts

# Frontend
mv client/src/hooks/useAuth.ts client/src/hooks/useAuth.ts.manus
mv client/src/hooks/useAuth-standalone.ts client/src/hooks/useAuth.ts
```

---

## 🎯 Resultado Final

Após a migração, você terá:

✅ Sistema funcionando sem dependências Manus
✅ Autenticação com PIN local
✅ Banco PostgreSQL (Vercel Postgres)
✅ Deploy no Vercel
✅ PWA offline funcionando
✅ Código-fonte no GitHub

---

## 📞 Suporte

Se tiver dúvidas durante a migração, consulte:
- `README.md` - Visão geral do projeto
- `DEPLOY_GUIDE.md` - Guia de deploy passo a passo
- `ENVIRONMENT_VARIABLES.md` - Variáveis de ambiente

Boa sorte! 🚀
