# GitHub Repos Ranking

Backend para ranking de repositórios GitHub usando Next.js 15, Supabase e GitHub OAuth/Webhooks.

## Arquitetura

Este projeto segue Domain-Driven Design (DDD) com separação clara entre:
- **Domain**: Entidades, Value Objects e Interfaces de Repositório
- **Application**: Casos de Uso e DTOs
- **Infrastructure**: Implementações de repositórios e clientes externos
- **API**: Rotas Next.js App Router

## Setup

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar Supabase

1. Crie um projeto no [Supabase](https://supabase.com)
2. **Instale o Supabase CLI** (se ainda não tiver):
   ```bash
   npm install -g supabase
   # ou
   brew install supabase/tap/supabase
   ```

3. **Link o projeto local com o Supabase remoto**:
   ```bash
   supabase link --project-ref seu-project-ref
   ```
   - Você precisará do **Project Ref** (encontrado na URL do dashboard: `https://supabase.com/dashboard/project/[project-ref]`)
   - E do **Database Password** (definido ao criar o projeto)

4. **Aplicar migrations (schema) ao banco remoto**:
   ```bash
   supabase db push
   ```
   Isso aplicará todas as migrations em `supabase/migrations/` ao seu projeto Supabase.

   **Alternativa manual**: Se preferir, você pode executar o `schema.sql` diretamente no SQL Editor do Supabase.

5. Configure GitHub OAuth:

   **No GitHub:**
   - Vá em [GitHub Settings > Developer settings > OAuth Apps](https://github.com/settings/developers)
   - Crie um novo OAuth App
   - **Authorization callback URL**: `https://[seu-project-ref].supabase.co/auth/v1/callback`
     - Substitua `[seu-project-ref]` pelo ID do seu projeto Supabase (encontrado na URL do dashboard)
   - Copie o **Client ID** e **Client Secret**

   **No Supabase:**
   - Vá em Authentication > Providers > GitHub
   - Cole o Client ID e Client Secret
   - Em Authentication > URL Configuration:
     - **Site URL**: `http://localhost:3000` (dev) ou `https://seu-projeto.vercel.app` (prod)
     - **Redirect URLs**: Adicione:
       - `http://localhost:3000/api/auth/callback`
       - `https://seu-projeto.vercel.app/api/auth/callback`

### 3. Configurar variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

GITHUB_WEBHOOK_SECRET=random_secret_string
CRON_SECRET=random_secret_string
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Como gerar os secrets:**

1. **GITHUB_WEBHOOK_SECRET**: 
   ```bash
   openssl rand -hex 32
   ```
   - Este secret é usado para validar que os webhooks realmente vêm do GitHub
   - O código já usa essa variável ao criar webhooks automaticamente (não precisa configurar manualmente no GitHub)
   - **Importante**: Use a mesma string em produção e desenvolvimento

2. **CRON_SECRET**:
   ```bash
   openssl rand -hex 32
   ```
   - Secret para proteger o endpoint de cron job da Vercel

### 4. Executar o projeto

```bash
npm run dev
```

## Estrutura do Projeto

```
src/
├── domain/           # Camada de domínio
│   ├── entities/     # Entidades de negócio
│   ├── value-objects/# Value Objects
│   └── repositories/ # Interfaces de repositório
├── application/      # Camada de aplicação
│   ├── use-cases/    # Casos de uso
│   └── dtos/         # Data Transfer Objects
├── infra/            # Camada de infraestrutura
│   ├── db/           # Implementações de repositório
│   └── github/       # Cliente GitHub
└── app/              # Next.js App Router
    └── api/          # API Routes
```

## API Endpoints

### Autenticação
- `GET /api/auth/callback` - Callback do OAuth GitHub

### Repositórios
- `POST /api/repositories/sync` - Sincronizar repositórios do usuário

### Webhooks
- `POST /api/webhooks/github` - Receber eventos do GitHub

### Rankings
- `GET /api/rankings?filter=stars` - Buscar rankings (filter: stars, forks, views)

### Cron
- `GET /api/cron/sync-views` - Sincronizar views (protegido por CRON_SECRET)

## Funcionalidades

- **Autenticação**: OAuth com GitHub via Supabase
- **Sincronização**: Busca repositórios públicos do usuário e cria webhooks automaticamente
- **Webhooks**: Recebe atualizações em tempo real de stars/forks (validação de assinatura automática)
- **Snapshots**: Histórico imutável para cálculo de crescimento MoM
- **Rankings**: Visualização pública de rankings com filtros
- **Cron Job**: Sincronização diária de views (3h da manhã)

## Como funciona o GITHUB_WEBHOOK_SECRET

O `GITHUB_WEBHOOK_SECRET` **não é gerado automaticamente** - você precisa criá-lo manualmente:

1. **Gere uma string aleatória**:
   ```bash
   openssl rand -hex 32
   ```

2. **Adicione no `.env.local`**:
   ```env
   GITHUB_WEBHOOK_SECRET=sua_string_gerada_aqui
   ```

3. **Como funciona**:
   - Quando você sincroniza repositórios (`POST /api/repositories/sync`), o código **automaticamente cria webhooks** no GitHub usando esse secret
   - Quando o GitHub envia eventos, o código **valida a assinatura** usando o mesmo secret
   - Isso garante que apenas eventos legítimos do GitHub sejam processados

4. **Importante**:
   - Use a **mesma string** em desenvolvimento e produção
   - Mantenha o secret seguro (não commite no git)
   - Se mudar o secret, você precisará recriar os webhooks (deletar e criar novamente)

## Decisões de Design

- **Imutabilidade**: Entidades retornam novas instâncias ao invés de mutar
- **Snapshots imutáveis**: Cada evento cria um novo snapshot
- **Validação segura**: `timingSafeEqual` para webhooks
- **MoM no banco**: Cálculo via SQL view para performance

## Deploy

O projeto está configurado para deploy na Vercel:

1. Conecte o repositório à Vercel
2. Configure as variáveis de ambiente
3. O cron job será configurado automaticamente via `vercel.json`

## Schema SQL

O schema está disponível em:
- `schema.sql` - Para referência ou execução manual
- `supabase/migrations/20260301160623_initial_schema.sql` - Migration do Supabase CLI

### Comandos Supabase CLI

```bash
# Inicializar projeto (já feito)
supabase init

# Link com projeto remoto
supabase link --project-ref seu-project-ref

# Aplicar migrations ao banco remoto
supabase db push

# Ver status das migrations
supabase migration list

# Criar nova migration
supabase migration new nome_da_migration

# Aplicar migrations localmente (para desenvolvimento)
supabase start
supabase db reset
```

### Estrutura de Migrations

As migrations ficam em `supabase/migrations/` e são aplicadas em ordem cronológica. Use `supabase db push` para aplicar ao banco remoto.

