# Variáveis de Ambiente

Este arquivo documenta todas as variáveis de ambiente necessárias para o deploy standalone.

## Obrigatórias

### Database
```
DATABASE_URL="postgresql://user:password@host:5432/database"
```
URL de conexão com PostgreSQL. Para Vercel, use Vercel Postgres.

### Authentication
```
JWT_SECRET="your-secret-key-change-in-production-min-32-chars"
```
Chave secreta para assinar tokens JWT. Deve ter no mínimo 32 caracteres.

```
ADMIN_PIN="1234"
```
PIN de acesso ao sistema. Altere para um valor seguro em produção.

## Opcionais

### App Configuration
```
NODE_ENV="production"
PORT="3000"
```

### Branding
```
VITE_APP_TITLE="Reserva Solar"
VITE_APP_LOGO="/logo.png"
```

## Exemplo de .env local

Crie um arquivo `.env` na raiz do projeto com:

```bash
DATABASE_URL="postgresql://localhost:5432/portaria"
JWT_SECRET="minha-chave-secreta-muito-longa-e-segura-123456"
ADMIN_PIN="1234"
NODE_ENV="development"
PORT="3000"
VITE_APP_TITLE="Reserva Solar"
VITE_APP_LOGO="/logo.png"
```

## Configuração no Vercel

1. Acesse o projeto no Vercel
2. Vá em Settings → Environment Variables
3. Adicione cada variável acima:
   - `DATABASE_URL` - URL do Vercel Postgres
   - `JWT_SECRET` - Chave secreta (gere uma aleatória)
   - `ADMIN_PIN` - PIN de acesso (altere o padrão)
   - `VITE_APP_TITLE` - Nome do sistema
   - `VITE_APP_LOGO` - URL do logo
4. Faça redeploy do projeto
