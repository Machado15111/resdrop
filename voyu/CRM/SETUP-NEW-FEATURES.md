# Voyu CRM — Setup das novas funcionalidades

Ordem recomendada. Tudo é gratuito no plano do Supabase (Edge Functions incluídas);
só o item 5 (IA) tem custo por uso na Anthropic.

Projeto Supabase: `sinyinnovnhfmtritdyb`

---

## 1. Tornar o acesso 100% por convite (importante)

Tirar o "Criar conta" da tela de login já foi feito no app. Mas para impedir
que alguém crie conta pela API direto, **desligue o auto-cadastro** no Supabase:

- Supabase → **Authentication → Sign In / Providers → Email**
- Desligue **"Allow new users to sign up"** (Disable signups).

Assim, só usuários criados por você (item 3) conseguem entrar.

## 2. Rodar o SQL (tabela de créditos + bucket de documentos)

- Supabase → **SQL Editor** → cole o conteúdo de
  [`supabase/setup-new-features.sql`](supabase/setup-new-features.sql) → **Run**.

Isso cria a tabela `credits` (aba Créditos) e o bucket privado `attachments`
(documentos do cliente), ambos com RLS.

## 3. Publicar a função de criar usuários (aba Usuários → "Convidar usuário")

Precisa do [Supabase CLI](https://supabase.com/docs/guides/cli) instalado e logado
(`supabase login`).

```bash
cd "voyu/CRM"
supabase link --project-ref sinyinnovnhfmtritdyb
supabase functions deploy admin-create-user --project-ref sinyinnovnhfmtritdyb
```

Não precisa de segredo extra — o Supabase injeta `SUPABASE_SERVICE_ROLE_KEY`
automaticamente dentro da função. A função confere que quem chama é **admin**
antes de criar.

## 4. Conferir os papéis

Os papéis continuam: `admin`, `agente`, `financeiro`, `viewer`, `pending`.
Ao criar um usuário pela aba Usuários você já define o papel direto.

## 5. Publicar a função de IA (Importar de screenshot)

```bash
supabase functions deploy parse-booking --project-ref sinyinnovnhfmtritdyb
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxx --project-ref sinyinnovnhfmtritdyb
```

- Pegue a chave em https://console.anthropic.com → API Keys.
- Custo: alguns centavos por screenshot. Modelo padrão: `claude-opus-4-8`
  (o mais capaz). Para baratear, troque `MODEL` no topo de
  [`supabase/functions/parse-booking/index.ts`](supabase/functions/parse-booking/index.ts)
  para `claude-haiku-4-5` e re-deploy.
- **Sempre confira os valores** que a IA preencher antes de salvar a reserva.

## 6. Re-deploy do app (front-end)

```bash
cd "voyu/CRM"
~/.local/bin/vercel deploy --prod --yes
```

---

## O que cada coisa faz no app

| Funcionalidade | Onde aparece | Depende de |
|---|---|---|
| Acesso só por convite | Tela de login (sem "Criar conta") | item 1 |
| Criar usuário (e-mail + senha) | Aba **Usuários** | item 3 |
| Créditos / tickets em aberto | Aba **Créditos** | item 2 (SQL) |
| Documentos do cliente (passaporte…) | Modal do cliente → **Documentos** | item 2 (bucket) |
| Importar reserva de screenshot (IA) | Aba **Reservas** → botão IA | item 5 |
| Abrir ficha do cliente a partir da reserva | Modal da reserva → **Abrir cliente** | — |
| Atalhos "Nova reserva / Novo cliente" | **Dashboard** | — |
| Gráfico de faturamento/margem por mês | **Dashboard** | — |

Tudo que precisa de Supabase (itens 2, 3, 5) é tolerante a falha: se você ainda
não rodou, o app mostra um aviso em vez de quebrar.
