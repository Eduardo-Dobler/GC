# Atualização: solicitações e anotações

- Conversas diretas obedecem à hierarquia da comunidade ativa: cargo superior recebe pedido, com aceite, recusa ou silêncio (ignorar). Não é possível reenviar enquanto o pedido está pendente/ignorado; a recusa libera uma nova tentativa.
- Canais privados incluem superiores somente após o aceite. A permissão **Criar canais** passou a integrar a edição de cargos; membros comuns não a recebem por padrão.
- Acessos para Solicitações estão abaixo dos botões Nova conversa e Novo canal; também há uma entrada na navegação.
- Anotações privadas por usuário incluem título, cards coloridos, texto com formatação simples, checklist, tabelas, descrição do local, link Google Maps e ações de editar/excluir. A demo inclui anotações individuais para Carlos, Pedro e Sofia.
- A seed de apresentação inclui uma solicitação de conversa pendente para o Dono, uma solicitação de entrada em canal privado e uma conversa já aceita, além do canal `equipe-senac-tech` aguardando aprovação.
- Dados JSON anteriores recebem os novos campos por migração compatível e a release continua autocontida.

# Atualização: comunidades e networking

- Página Minhas comunidades acessível junto ao nome da comunidade no menu lateral.
- Busca, troca de espaço e criação por qualquer usuário, com participantes iniciais escolhidos.
- Cargos, canais, mensagens de canais, eventos, presenças e convites isolados por comunidade; gravações permanecem na fila atômica JSON.
- Criador recebe o cargo Dono somente no novo grupo; cargos em outros espaços permanecem intactos.
- 12 contas rápidas com descrições dos cargos e vínculos; 6 comunidades profissionais e sociais com pessoas em comum, canais e eventos próprios.
- Mensagens diretas globais e seleção de qualquer pessoa ativa.
- Remoção e banimento limitados à comunidade; a pessoa mantém a sessão e os vínculos dos demais grupos.
- Formato retrocompatível com bancos antigos; os novos exemplos aparecem em instalações novas ou após Restaurar demo.
- Verificação: TypeScript, build e testes automatizados da API, interface e release.

# Revisão do GC — 16/09/2026

## Dependências

A auditoria reproduziu os mesmos 8 alertas informados: 3 moderados, 4 altos e 1 crítico. Depois das atualizações abaixo, `npm audit` retornou **0 vulnerabilidades**, incluindo as dependências de desenvolvimento. Este resultado corresponde à base consultada na data da revisão.

| Dependência direta | Versão anterior | Versão revisada |
| --- | --- | --- |
| Vite | 6.1.0 | 6.4.3 |
| Vitest | 3.0.5 | 4.1.11 |
| React Router DOM | 6.30.1 | 7.18.3 |
| tsx | 4.19.2 | 4.23.13 |

O `package-lock.json` foi atualizado junto com os manifestos dos workspaces. As versões do Vite foram alinhadas entre a raiz e o frontend. A interface e os testes foram adaptados para o React Router 7, retirando as opções de migração `future` da versão anterior. A release compilada também foi reconstruída com as dependências revisadas.

As versões foram conferidas nos avisos dos mantenedores: [Vite — correção de caminhos no Windows](https://github.com/vitejs/vite/security/advisories/GHSA-fx2h-pf6j-xcff), [Vitest — correção do mocker](https://github.com/vitest-dev/vitest/security/advisories/GHSA-82fw-gwwq-j7x9) e [React Router — correções de redirecionamento](https://github.com/remix-run/react-router/security/advisories/GHSA-wrjc-x8rr-h8h6) e [RSC](https://github.com/remix-run/react-router/security/advisories/GHSA-qwww-vcr4-c8h2). O GC continua usando uma SPA local, sem RSC.

## Correções no projeto

- **Dados preservados durante o build:** o empacotador removia toda a pasta `release`, incluindo o banco ativo. Agora ele substitui os arquivos gerados e mantém `release/data/gc-demo.json`. A restauração dos dados continua disponível pela confirmação `RESTAURAR` no aplicativo.
- **Permissões atualizadas no momento da gravação:** mudanças de cargo, moderação, canais, eventos, cargos personalizados e convites consultam o estado atual dentro da fila de escrita. Uma requisição pendente deixa de usar uma permissão retirada por uma operação anterior.
- **Banimentos respeitados por operações pendentes:** mensagens diretas e confirmações de presença revalidam o estado ativo do membro antes de persistir.
- **Edições concorrentes de eventos preservadas:** cada PATCH é aplicado sobre o estado mais recente, evitando que uma edição de descrição reverta uma edição de título.
- **Evento excluído:** uma presença que aguarda na fila recebe `404` se o evento já foi excluído; nenhum participante órfão é gravado por essa operação.
- **Nomes de cargos únicos também na edição:** duas renomeações simultâneas para o mesmo nome resultam em uma atualização aceita e um conflito `409`.
- **Verificação da release correta:** `npm run check` agora gera a release antes de executar os testes que a iniciam.
- **Localização em eventos:** eventos aceitam descrição manual do local, link do Google Maps e HTML de iframe. O backend guarda somente uma URL HTTPS validada do Google Maps; os demais atributos do HTML são descartados antes da renderização.
- **Conversas por pessoas:** qualquer membro ativo pode iniciar uma conversa individual ou em grupo, escolhendo participantes de qualquer cargo. Conversas repetidas com o mesmo conjunto de pessoas são reutilizadas.
- **Canais por pessoas:** qualquer membro ativo pode criar canal público ou privado. O privado usa uma lista explícita de usuários, com o criador incluído automaticamente, e mantém compatibilidade com os canais privados antigos baseados em cargo.
- **Privacidade na moderação:** a remoção de uma mensagem também exige acesso ao canal privado correspondente, impedindo que um moderador não participante remova mensagens por ID.
- **Identidade visual:** a logo enviada foi incorporada ao login, carregamento e menu lateral; a interface foi ajustada para preto, branco e laranja.
- **Tema claro e escuro:** o indicador visual “Offline” foi removido da interface e substituído por um switch com ícones de lua e sol. A preferência fica salva em `localStorage`.
- **Mapas na experiência:** o formulário de evento agora gera link e iframe de demonstração a partir de um local pesquisado, mostra prévia segura e oferece um botão direto para abrir a localização.
- **Seed atualizado:** os quatro eventos de exemplo apontam para ambientes do SENAC Caxias do Sul, na Av. Júlio de Castilhos, 3638.

## Validação

Ambiente de execução: Node.js 24.19.0 e npm 11.9.0.

- Auditoria de todas as dependências: 0 vulnerabilidades reportadas.
- TypeScript validado nos pacotes API, frontend e contratos compartilhados.
- Build de produção concluído.
- 94 testes aprovados em 24 arquivos, incluindo localização, validação do iframe v1, criação de conversas/canais, proteção dos canais privados, solicitações, anotações e alternância de tema.
- 15 testes novos cobrem os fluxos de localização, grupos e canais por pessoas, usando gravações JSON reais e uma reconstrução em diretório temporário.

## Como executar

Extraia o ZIP revisado em uma pasta nova e, dentro de `gc-demo-offline`, execute:

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`. Para apresentar a release pronta, use `npm run start:release` e abra `http://localhost:3000`. Todas as contas de demonstração continuam usando `demo123`.

Para repetir a conferência local:

```bash
npm run check
npm audit
```

A consulta de auditoria e a instalação de dependências usam internet. A demonstração compilada continua funcionando offline com Node.js instalado; mapas incorporados precisam de internet no navegador para aparecer. O formato dos dados JSON antigos continua compatível.
