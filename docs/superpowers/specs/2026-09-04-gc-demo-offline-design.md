# GC — Demo offline para apresentação do case

**Data:** 4 de setembro de 2026  
**Status:** aprovado para planejamento  
**Persistência aprovada:** arquivo JSON local, sem SQL, Firebase, Supabase ou serviços externos

## 1. Objetivo

Criar uma demonstração web responsiva do **GC — Gerenciador de Comunidade** para apresentar o case do projeto no SENAC. A demo deve comprovar os principais fluxos do produto por meio de uma interface funcional, uma API REST própria em Node.js e dados persistidos localmente em JSON.

A entrega não pretende ser a versão de produção. Ela prioriza estabilidade, clareza visual e facilidade de reiniciar a apresentação, mantendo uma arquitetura cliente-servidor real e código integralmente em TypeScript.

## 2. Definição de “offline”

- Nenhuma funcionalidade pode depender de internet, CDN, fonte remota, Firebase, Supabase ou API de terceiros.
- O pacote final deve conter uma versão previamente compilada.
- Na apresentação, será necessário somente ter Node.js instalado e executar o iniciador do sistema.
- O navegador acessará a aplicação por `http://localhost:3000`.
- O código-fonte continuará disponível para desenvolvimento com `npm install`, mas essa instalação não será exigida durante a apresentação.

## 3. Escopo funcional

### 3.1 Autenticação de demonstração

- Entrar com e-mail e senha por meio da API local.
- Criar uma conta local de membro.
- Exibir contas de acesso rápido para alternar entre cargos durante a apresentação.
- Manter a sessão no navegador enquanto o servidor estiver em execução.
- Encerrar a sessão e retornar à tela de entrada.

### 3.2 Painel inicial

- Mostrar saudação e resumo da comunidade.
- Exibir avisos recentes.
- Exibir próximos eventos e quantidade de participantes.
- Exibir membros online de forma demonstrativa.
- Oferecer atalhos para canais, eventos e membros.
- Mostrar claramente que o sistema está em “modo de demonstração offline”.

### 3.3 Canais e chat

- Organizar a comunidade nos canais `avisos`, `chat-geral`, `duvidas`, `eventos` e `equipe`.
- Aplicar visibilidade conforme o cargo; `equipe` será privado para Dono, Administrador, Moderador e Organizador de Eventos.
- Permitir leitura e envio de mensagens nos canais autorizados.
- Permitir exclusão de mensagens próprias.
- Permitir que cargos com moderação excluam mensagens de terceiros.
- Salvar cada alteração no arquivo JSON.
- Simular atualização rápida no mesmo navegador; comunicação por rede em tempo real não faz parte desta demo offline.

### 3.4 Mensagens diretas

- Listar conversas diretas disponíveis.
- Abrir uma conversa entre dois membros.
- Enviar e persistir mensagens diretas.
- Impedir acesso de um usuário a conversas das quais ele não participa.

### 3.5 Eventos

- Listar eventos por data e categoria.
- Exibir título, descrição, data, horário, categoria, cor, recorrência, criador e convidados.
- Permitir confirmação e cancelamento de presença.
- Permitir criação e edição para Dono, Administrador e Organizador de Eventos.
- Permitir exclusão para Dono, Administrador ou criador autorizado.
- Disponibilizar filtros simples por período e categoria.

### 3.6 Membros, cargos e permissões

- Mostrar diretório de membros com nome, foto por iniciais, cargo, descrição curta, status e histórico resumido de participação.
- Permitir abertura do perfil de cada membro.
- Permitir que Dono e Administrador alterem o cargo de um membro.
- Permitir que Dono e Administrador criem e editem cargos personalizados.
- Exibir uma matriz simples de permissões.
- Permitir remoção ou banimento demonstrativo por cargos autorizados.
- Proteger a conta do Dono contra remoção, banimento ou rebaixamento por outro cargo.

### 3.7 Convites

- Criar convite com código curto e link local representativo.
- Definir quantidade máxima de usos e validade.
- Listar convites ativos e usos realizados.
- Permitir copiar código e link.
- Explicar na interface que o compartilhamento externo está simulado porque a aplicação é offline.

### 3.8 Restauração

- Disponibilizar a ação “Restaurar demonstração”.
- Exigir confirmação explícita antes da restauração.
- Substituir os dados alterados pela cópia inicial de demonstração.
- Encerrar sessões existentes após a restauração e retornar ao login.

## 4. Papéis e permissões iniciais

| Permissão | Dono | Administrador | Moderador | Organizador de Eventos | Membro |
| --- | :---: | :---: | :---: | :---: | :---: |
| Acessar canais públicos | Sim | Sim | Sim | Sim | Sim |
| Acessar canal da equipe | Sim | Sim | Sim | Sim | Não |
| Enviar mensagens | Sim | Sim | Sim | Sim | Sim |
| Excluir mensagem de terceiros | Sim | Sim | Sim | Não | Não |
| Criar e editar eventos | Sim | Sim | Não | Sim | Não |
| Gerenciar membros | Sim | Sim | Parcial | Não | Não |
| Remover ou banir membro | Sim | Sim | Sim | Não | Não |
| Criar e editar cargos | Sim | Sim | Não | Não | Não |
| Criar convites | Sim | Sim | Sim | Sim | Não |

“Gerenciar membros” será parcial para Moderador: poderá remover ou banir Membros comuns, mas não poderá alterar cargos nem agir sobre Dono, Administrador ou outro Moderador.

## 5. Dados de demonstração

A comunidade inicial se chamará **Comunidade SENAC Tech** e servirá apenas como cenário de apresentação do GC.

Contas rápidas iniciais, todas com a senha `demo123`:

| Usuário | E-mail | Cargo |
| --- | --- | --- |
| Carlos Barbosa | `carlos@gc.local` | Dono |
| Marina Costa | `marina@gc.local` | Administrador |
| Lucas Martins | `lucas@gc.local` | Moderador |
| Sofia Almeida | `sofia@gc.local` | Organizador de Eventos |
| Pedro Santos | `pedro@gc.local` | Membro |

As senhas não serão gravadas em texto puro. O JSON manterá salt e hash produzidos com `scrypt`, disponível no próprio Node.js.

O seed também conterá avisos, mensagens, conversas diretas, membros e eventos suficientes para todas as telas parecerem preenchidas desde o primeiro acesso.

## 6. Arquitetura

### 6.1 Estrutura geral

- **Frontend:** React, Vite e TypeScript.
- **API:** Express e TypeScript.
- **Persistência:** repositório JSON local com escrita serializada.
- **Autenticação:** token de sessão opaco criado com `crypto.randomUUID()` e mantido em memória no servidor.
- **Validação:** esquemas de entrada compartilhados entre rotas e serviços.
- **Distribuição:** frontend compilado e servidor empacotado em um diretório `release`.

Durante o desenvolvimento, o Vite encaminhará `/api` para o servidor. Na versão de apresentação, o Express servirá tanto a API quanto os arquivos compilados do frontend na mesma porta.

### 6.2 Organização proposta

```text
gc-demo-offline/
├── apps/
│   ├── api/          # rotas, serviços, autenticação e repositório JSON
│   └── web/          # páginas, componentes e cliente da API
├── packages/
│   └── shared/       # tipos, permissões e contratos compartilhados
├── data/
│   └── seed.json     # estado original da demonstração
├── scripts/          # build, empacotamento e validações
├── tests/            # testes integrados da API e fluxos críticos
├── release/          # versão compilada para apresentação offline
├── iniciar-demo.bat
├── iniciar-demo.sh
└── README.md
```

## 7. Modelo de dados JSON

O arquivo ativo terá versão de esquema e as seguintes coleções:

- `community`: identidade e descrição da comunidade.
- `users`: perfil, credenciais protegidas, cargo, estado e histórico resumido.
- `roles`: nome, cor, ordem hierárquica e lista de permissões.
- `channels`: nome, tipo, ordem e cargos autorizados.
- `messages`: canal, autor, conteúdo e datas de criação/edição/exclusão.
- `directThreads`: participantes e data da última atividade.
- `directMessages`: conversa, autor, conteúdo e data.
- `events`: dados do evento, recorrência, criador e regras de edição.
- `eventParticipants`: relação entre evento, usuário e resposta.
- `invites`: código, criador, validade, limite e contador de usos.
- `auditLogs`: registro resumido de ações administrativas úteis à apresentação.

Todas as entidades usarão identificadores UUID em string e datas ISO 8601. A API carregará e validará o arquivo na inicialização. Mutações serão executadas em fila para evitar gravações simultâneas e usarão arquivo temporário antes da substituição do estado ativo.

## 8. API REST

Rotas principais:

```text
GET    /api/health
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/dashboard
GET    /api/channels
GET    /api/channels/:channelId/messages
POST   /api/channels/:channelId/messages
DELETE /api/messages/:messageId

GET    /api/direct-threads
GET    /api/direct-threads/:threadId/messages
POST   /api/direct-threads/:threadId/messages

GET    /api/events
POST   /api/events
PATCH  /api/events/:eventId
DELETE /api/events/:eventId
PUT    /api/events/:eventId/attendance

GET    /api/members
GET    /api/members/:memberId
PATCH  /api/members/:memberId/role
POST   /api/members/:memberId/moderation

GET    /api/roles
POST   /api/roles
PATCH  /api/roles/:roleId

GET    /api/invites
POST   /api/invites
DELETE /api/invites/:inviteId

POST   /api/demo/reset
```

Respostas seguirão o formato `{ "data": ... }` em sucesso e `{ "error": { "code": "...", "message": "..." } }` em falhas. A API aplicará autenticação, autorização e validação; o frontend ocultará ações não permitidas, mas nunca será a única barreira de segurança.

## 9. Interface

- Layout principal com menu lateral azul-marinho e conteúdo em superfícies claras.
- Tipografia do sistema operacional, sem fontes remotas.
- Cores e ícones com aparência profissional, sem excesso de gradientes, brilhos ou elementos com “cara de IA”.
- Navegação para Início, Canais, Mensagens, Eventos, Membros, Cargos e Convites.
- Barra superior com busca local, usuário atual, status offline e acesso à restauração.
- Componentes responsivos para telas de notebook e celular.
- Estados vazios, carregamento, erro e confirmação apresentados de forma clara.
- Navegação por teclado, foco visível, rótulos de formulário e contraste legível.

## 10. Tratamento de erros

- Arquivo inexistente: criar o estado ativo a partir do seed.
- JSON inválido: impedir inicialização, preservar o arquivo defeituoso e informar como restaurar.
- Entrada inválida: retornar `400` com mensagem em português.
- Sessão ausente ou expirada: retornar `401` e levar o usuário ao login.
- Falta de permissão: retornar `403` sem executar a ação.
- Registro inexistente: retornar `404`.
- Conflito hierárquico ou de regra: retornar `409`.
- Falha de gravação: manter o último estado válido em memória, retornar `500` e exibir aviso sem travar a interface.

## 11. Limites assumidos da demo

- Uma única comunidade é exibida.
- Não haverá áudio, vídeo, upload de arquivo, notificação do sistema, bot ou integração externa.
- O tempo real entre vários computadores não será implementado.
- Links de convite serão representativos e só terão uso dentro da instância local.
- O servidor foi pensado para apresentação local, não para publicação na internet.

Esses limites reduzem risco e mantêm o foco nos requisitos centrais validados para o GC: hierarquia, permissões, canais, chat, eventos, membros e convites.

## 12. Testes e verificação

### API

- Login válido e inválido.
- Cadastro de membro.
- Proteção de rotas sem sessão.
- Visibilidade de canal por cargo.
- Envio e exclusão de mensagem.
- Bloqueio de ação sem permissão.
- Criação, edição, presença e exclusão de evento.
- Alteração de cargo e proteção do Dono.
- Criação e revogação de convite.
- Persistência após reinicialização do repositório.
- Restauração completa do seed.

### Frontend

- Renderização do login e acesso rápido.
- Navegação principal.
- Exibição condicional de ações conforme permissões.
- Envio de mensagem e atualização da conversa.
- Confirmação de presença em evento.
- Diálogos de confirmação para ações destrutivas.
- Comportamento responsivo dos principais layouts.

### Validação final

- Verificação de tipos TypeScript.
- Testes automatizados sem falhas.
- Build completo sem acesso a recursos externos.
- Inicialização da pasta `release` com Node.js.
- Teste manual dos cinco perfis.
- Inspeção visual em largura de notebook e celular.
- Reinício do servidor comprovando persistência.
- Restauração comprovando retorno exato ao seed.

## 13. Critérios de aceitação

1. O projeto inicia localmente e abre no navegador.
2. A versão `release` funciona sem internet e sem instalação de pacotes durante a apresentação.
3. Todas as telas principais possuem dados e ações demonstráveis.
4. As diferenças de permissão entre os cinco cargos são visíveis e validadas pela API.
5. Mensagens, eventos, presenças, cargos e convites persistem no JSON ativo.
6. A restauração devolve a demo ao estado inicial.
7. O README explica instalação, desenvolvimento, apresentação, contas rápidas e estrutura da API em linguagem simples.
8. O pacote final contém código-fonte, testes, versão compilada e iniciadores para Windows e Linux/macOS.
