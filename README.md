# GC — Gerenciador de Comunidade

Demo completa e offline de uma plataforma para administrar comunidade, canais, conversas, eventos, membros, cargos e convites. O frontend usa React + TypeScript; a API usa Node.js + Express + TypeScript; toda persistência é feita em JSON local.

## Início rápido

Requisito: **Node.js 20 ou mais recente**.

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`. O Vite inicia a interface e encaminha `/api` para a API em `http://localhost:3001`.

### Executar a release pronta

A pasta `release/` já acompanha o projeto e não precisa de `node_modules`. Com Node.js instalado, use uma das opções:

```bash
npm run start:release
```

- Windows: dê dois cliques em `iniciar-demo.bat`.
- Linux/macOS: execute `./iniciar-demo.sh`.

A release abre em `http://localhost:3000`. Os iniciadores tentam abrir o navegador automaticamente; se isso não ocorrer, acesse o endereço manualmente.

## Contas da demonstração

Todas usam a senha **`demo123`**. A tela inicial também possui botões de entrada rápida.

| Pessoa | E-mail | Cargo | Cenário principal |
| --- | --- | --- | --- |
| Carlos Barbosa | `carlos@gc.local` | Dono | Acesso total e proteção do proprietário |
| Marina Costa | `marina@gc.local` | Administrador | Membros, cargos, eventos e convites |
| Lucas Martins | `lucas@gc.local` | Moderador | Moderação de mensagens e membros comuns |
| Sofia Almeida | `sofia@gc.local` | Organizador de Eventos | Criação e gestão dos próprios eventos |
| Pedro Santos | `pedro@gc.local` | Membro | Conversas, mensagens diretas e presença |

### Comunidades e networking

O botão de duas setas ao lado do nome da comunidade, no menu lateral, abre **Minhas comunidades**. Nessa página é possível buscar, abrir e criar comunidades com participantes escolhidos. Quem cria uma comunidade recebe o cargo Dono apenas nela.

A demo inclui **12 pessoas e 6 comunidades**: SENAC Tech, Criativa Serra, Circuito Empreendedor, Basquete de Sábado, Trilhas da Serra e Cultura em Roda. Os atalhos de login mostram os cargos, suas descrições e os grupos de cada pessoa. Canais, cargos, eventos e convites pertencem à comunidade selecionada; as conversas diretas são globais e privadas entre seus participantes. Para iniciar conversa com um cargo superior, o destinatário recebe uma solicitação.

Para a banca: entre como **Sofia Almeida**, abra Minhas comunidades e mostre os grupos profissionais e sociais, as pessoas em comum e os eventos de cada espaço. Entre como **Pedro Santos**, crie uma comunidade e demonstre que ele se torna Dono somente do novo grupo.

Para ver os novos exemplos, extraia o pacote em uma **pasta nova**. Se você copiar um banco ativo antigo, seus dados serão preservados e os novos exemplos não serão inseridos automaticamente. A opção Restaurar demo carrega os exemplos novos, mas apaga as alterações feitas na demonstração.

## Funcionalidades incluídas

- Login, cadastro local, sessão opaca e senhas armazenadas com `scrypt`.
- Painel com estatísticas, avisos, próximos eventos e membros online.
- Canais `avisos`, `chat-geral`, `duvidas`, `eventos`, o canal privado `equipe` e o exemplo `equipe-senac-tech`, que começa aguardando aprovação.
- Envio e remoção lógica de mensagens conforme permissões.
- Conversas diretas individuais e em grupo: pessoas de cargo igual ou inferior entram diretamente; cargos superiores recebem solicitação para aceitar, recusar ou ignorar. Pedidos pendentes ou ignorados bloqueiam duplicatas até a recusa.
- Canais públicos ou privados por pessoas escolhidas: a permissão Criar canais controla a criação, e superiores convidados a canais privados aceitam antes de entrar.
- Anotações pessoais com cards, texto formatado, checklist, tabela, links e localização; cada pessoa vê apenas suas anotações.
- Eventos com filtros, criação, edição, exclusão, confirmação de presença e local; o local aceita descrição manual, busca pelo endereço, link do Google Maps e iframe colado pelo usuário.
- Perfis, histórico de atividade, alteração de cargo, remoção e banimento.
- Cinco cargos padrão, cargos personalizados e matriz de dez permissões.
- Criação, cópia e revogação de convites locais.
- Busca local por canais, membros e eventos.
- Restauração integral dos dados iniciais, com confirmação por `RESTAURAR` e encerramento das sessões.
- Layout responsivo para desktop e celular, sem fontes, imagens ou scripts externos. O mapa incorporado é carregado pelo navegador a partir do Google quando houver internet.
- A identidade visual usa a logo GC e a paleta preto, branco e laranja. Os quatro eventos do seed usam o SENAC Caxias do Sul como local de demonstração.
- Switch de tema com ícones de lua e sol na barra superior, alternando entre claro e escuro e salvando a preferência no navegador; o antigo indicador visual “Offline” foi removido.

Para demonstrar a hierarquia, entre como **Carlos Barbosa** e abra **Solicitações**: há um pedido de conversa feito por Pedro, um pedido para entrar no canal `equipe-senac-tech` e uma conversa já aceita com o histórico disponível. Aceite, recuse ou ignore os pedidos para mostrar as mudanças de estado; pedidos pendentes ou ignorados não podem ser reenviados até uma recusa.

## Comandos

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Inicia API e frontend em modo de desenvolvimento |
| `npm test` | Executa testes unitários, de integração e de interface |
| `npm run test:watch` | Mantém os testes em observação |
| `npm run typecheck` | Valida todo o TypeScript sem gerar arquivos |
| `npm run build` | Recria a release offline completa |
| `npm run build:release` | Equivalente direto para gerar `release/` |
| `npm run start:release` | Inicia a release compilada em `localhost:3000` |
| `npm run check` | Valida tipos, recria a release e testa o código e a release recém-gerada |
| `npm audit` | Consulta a auditoria de todas as dependências (requer internet) |
| `npm ci` | Faz uma instalação limpa usando exatamente o `package-lock.json` |

## Organização do projeto

```text
apps/
  api/                 API Express e regras de aplicação
  web/                 Interface React/Vite
packages/
  shared/              Tipos, schemas Zod e permissões compartilhadas
data/
  seed.json            Estado inicial imutável
scripts/
  build-release.ts     Empacotador determinístico da release
tests/                 Testes da API, persistência, permissões e interface
release/
  server.cjs           API Node.js já compilada com dependências
  public/              Interface já compilada
  data/seed.json       Seed da release
```

### Persistência JSON

No desenvolvimento, a API cria `data/gc-demo.json` na primeira inicialização. Na release, cria `release/data/gc-demo.json`. Esses arquivos são o estado ativo; `seed.json` permanece intacto para permitir a restauração.

As gravações são serializadas e passam primeiro por um arquivo temporário, reduzindo o risco de JSON parcial. A API é a única camada que lê ou altera o banco local.

`npm run build` e `npm run check` preservam `release/data/gc-demo.json`. Para voltar aos dados iniciais, use a ação **Restaurar demo** dentro do aplicativo.

### Atualizar uma cópia anterior

Extraia o ZIP revisado em uma pasta nova e execute `npm install` nela. Caso queira manter os dados da cópia anterior, copie `data/gc-demo.json` e `release/data/gc-demo.json`, quando existirem, para as mesmas pastas da versão nova, com os servidores parados. O formato do banco JSON continua compatível.

As mudanças desta revisão estão detalhadas em [REVISAO.md](REVISAO.md).

## API JSON

Todas as respostas bem-sucedidas usam `{ "data": ... }`; falhas usam `{ "error": { "code", "message" } }`. Exceto login, cadastro, contas de demonstração e saúde, as rotas exigem `Authorization: Bearer <token>`.

| Método e rota | Uso |
| --- | --- |
| `GET /api/health` | Estado da API e modo offline |
| `POST /api/auth/login` | Entrar com e-mail e senha |
| `POST /api/auth/register` | Criar membro local |
| `GET /api/auth/me` | Consultar sessão atual |
| `POST /api/auth/logout` | Encerrar sessão |
| `GET /api/demo/accounts` | Atalhos públicos das contas de demonstração |
| `GET/POST /api/communities` | Listar comunidades e conexões ou criar comunidade |
| `GET /api/communities/:id/session` | Obter cargo e permissões na comunidade escolhida |
| `GET/PATCH /api/requests` | Consultar e responder solicitações de conversa/canal (PATCH usa `/api/requests/:id`) |
| `GET/POST /api/notes` | Listar e criar anotações pessoais |
| `PATCH/DELETE /api/notes/:id` | Editar ou excluir uma anotação própria |
| `GET /api/people` | Pessoas ativas para conversas e seleção de participantes |
| `GET /api/dashboard` | Resumo da comunidade |
| `GET /api/channels` | Canais visíveis para o usuário |
| `POST /api/channels` | Criar canal público ou privado por pessoas |
| `GET/POST /api/channels/:id/messages` | Ler ou publicar mensagens |
| `DELETE /api/messages/:id` | Remover logicamente uma mensagem |
| `GET /api/direct-threads` | Listar conversas diretas |
| `POST /api/direct-threads` | Criar conversa individual ou em grupo |
| `GET/POST /api/direct-threads/:id/messages` | Ler ou enviar mensagem direta |
| `GET/POST /api/events` | Listar ou criar eventos |
| `PATCH/DELETE /api/events/:id` | Editar ou excluir evento permitido |
| `PUT /api/events/:id/attendance` | Confirmar ou recusar presença |
| `GET /api/members` | Listar membros e capacidades do usuário atual |
| `PATCH /api/members/:id/role` | Alterar cargo de um membro |
| `POST /api/members/:id/moderation` | Banir ou remover um membro |
| `GET/POST /api/roles` | Listar ou criar cargos |
| `PATCH /api/roles/:id` | Editar cargo permitido |
| `GET/POST /api/invites` | Listar ou criar convites |
| `DELETE /api/invites/:id` | Revogar convite |
| `POST /api/demo/reset` | Restaurar o seed com `{ "confirmation": "RESTAURAR" }` |

As consultas de comunidade usam o cabeçalho `X-Community-Id`. Sem ele, a API usa a comunidade original; IDs desconhecidos ou grupos dos quais o usuário não participa são recusados.

## Roteiro curto para apresentação

1. Entre como **Pedro (Membro)** e mostre painel, canais, mensagens diretas e confirmação de presença.
2. Tente localizar `equipe`: o canal privado não aparece para o membro.
3. Entre como **Lucas (Moderador)**, abra um canal e demonstre a remoção de mensagem.
4. Abra Membros e mostre que o moderador atua apenas sobre membros comuns.
5. Entre como **Sofia (Organizador de Eventos)** e crie um evento; ela gerencia apenas os próprios eventos.
6. Entre como **Marina (Administrador)** e altere o cargo de Pedro, crie um cargo personalizado e gere um convite.
7. Entre como **Carlos (Dono)** e destaque a matriz de permissões e a proteção contra rebaixamento/remoção do Dono.
8. Use **Restaurar demo**, digite `RESTAURAR` e confirme o retorno ao estado inicial e à tela de login.

## Garantias e limites

- O aplicativo não faz chamadas de API a CDNs, bancos remotos, Firebase, Supabase ou serviços próprios de terceiros. O iframe do Google Maps é a única exceção visual: ele depende da conexão do navegador para exibir o mapa.
- Convites e envio de e-mail são representações da experiência local; os links só fazem sentido dentro desta demo.
- Sessões ficam somente na memória e são perdidas ao reiniciar o servidor.
- A solução foi desenhada para apresentação local, não para exposição direta à internet ou uso em produção.
- Não há upload de arquivos nem notificações externas.

## Solução de problemas

**Node não encontrado:** instale Node.js 20+ e confirme com `node --version`.

**Porta 3000 ocupada:** inicie a release em outra porta.

Linux/macOS:

```bash
PORT=3100 npm run start:release
```

PowerShell:

```powershell
$env:PORT=3100; npm run start:release
```

**Dados alterados durante ensaios:** use “Restaurar demo” na barra superior e digite exatamente `RESTAURAR`.

**Dependências de desenvolvimento inconsistentes:** remova apenas `node_modules` e execute novamente `npm install`; a release compilada continua independente dessas dependências.
