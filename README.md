# GC — Vite + Supabase

Este é o protótipo do **GC — Gerenciador de Comunidade Profissional** transformado em uma base real usando:

- Vite
- JavaScript
- Supabase Auth
- Supabase Database/PostgreSQL
- Supabase Realtime para chats
- Supabase Storage para foto de perfil
- Row Level Security, ou RLS, para segurança

## O que já está pronto

- Cadastro com nome, usuário, e-mail, senha e foto de perfil
- Login com e-mail e senha
- Criação de equipes
- Entrada por código, estilo Google Classroom
- Entrada por link, estilo Discord
- Cargos e permissões
- Alteração de cargo dos membros
- Criação de grupos com pessoas específicas
- Chat geral automático
- Chat por cargo
- Chat por grupo
- Chat com pessoas específicas
- Mensagens em tempo real
- Eventos para todos, cargo, grupo ou pessoas específicas
- Comunicados internos
- Perfil editável
- Upload de foto de perfil

---

## 1. Instalar dependências

Abra a pasta no VS Code e rode:

```bash
npm install
```

---

## 2. Criar projeto no Supabase

1. Entre no Supabase.
2. Crie um novo projeto.
3. Aguarde o projeto ser criado.
4. Vá em **Project Settings > API**.
5. Copie:
   - Project URL
   - anon public key

---

## 3. Configurar `.env`

Na raiz do projeto, copie o arquivo:

```txt
.env.example
```

Crie um arquivo chamado:

```txt
.env
```

Dentro dele, coloque:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLICA
```

Não suba o arquivo `.env` para o GitHub.

---

## 4. Criar banco de dados no Supabase

1. No Supabase, abra **SQL Editor**.
2. Clique em **New query**.
3. Copie todo o conteúdo do arquivo:

```txt
supabase/schema.sql
```

4. Cole no SQL Editor.
5. Clique em **Run**.

Esse SQL cria as tabelas, funções, permissões, bucket de avatar e realtime das mensagens.

---

## 5. Configurar autenticação para teste

Para testar mais fácil:

1. Vá em **Authentication > Providers > Email**.
2. Deixe o provider de e-mail ativo.
3. Para testes, desative a confirmação obrigatória de e-mail.

Se a confirmação ficar ativa, o usuário precisa confirmar o e-mail antes de entrar.

---

## 6. Rodar o projeto

No terminal:

```bash
npm run dev
```

O Vite vai mostrar um link parecido com:

```txt
http://localhost:5173
```

Abra esse link no navegador.

---

## 7. Como testar vários usuários

Você pode testar de 3 formas:

### Opção A — Dois navegadores

1. Abra o projeto no Chrome.
2. Crie uma conta e uma equipe.
3. Copie o link de convite.
4. Abra o link no Firefox ou Edge.
5. Crie outra conta e entre na equipe.

### Opção B — Aba anônima

1. Use sua conta principal na aba normal.
2. Abra uma aba anônima.
3. Entre com outro usuário.
4. Teste o chat geral.

### Opção C — Outro computador

1. Suba o site no Vercel ou Netlify.
2. Acesse o link em outro computador.
3. Entre na mesma equipe pelo convite.

---

## 8. Publicar no Vercel

1. Envie o projeto para o GitHub.
2. Entre no Vercel.
3. Importe o repositório.
4. Em **Environment Variables**, adicione:

```env
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

5. Faça o deploy.

---

## Estrutura dos arquivos

```txt
GC-vite-supabase/
├── index.html
├── package.json
├── .env.example
├── .gitignore
├── README.md
├── supabase/
│   └── schema.sql
└── src/
    ├── main.js
    ├── style.css
    ├── lib/
    │   └── supabase.js
    └── services/
        ├── authService.js
        ├── chatService.js
        ├── storageService.js
        └── teamService.js
```

---

## Importante

Este projeto já não usa `localStorage` para salvar usuários, senhas, equipes, cargos ou mensagens.

Os dados reais ficam no Supabase.

A senha é tratada pelo Supabase Auth, não pelo JavaScript do projeto.
