# Comunidades e networking do GC

Finalidade: demonstrar à banca como as mesmas pessoas participam de comunidades profissionais e de convivência. O botão ao lado da comunidade ativa abre uma página de comunidades, permitindo alternância e criação. Atalhos de login mostram pessoas, descrições de seus cargos e comunidades.

O JSON mantém contas e conversas diretas globais. Cada comunidade possui seus próprios vínculos, cargos, canais, mensagens, eventos, participantes e convites. Um adaptador de armazenamento projeta a comunidade selecionada por requisição e reaplica alterações dentro da fila atômica existente. Toda leitura e gravação valida a participação; cargos elevados em uma comunidade não concedem acesso a outra. Dados antigos sem os novos campos continuam representando a comunidade original.

A interface recebe a comunidade ativa e as comunidades do usuário junto com a sessão. A troca atualiza o cabeçalho, permissões e conteúdo, desmontando as telas antigas para evitar respostas atrasadas. A página apresenta cards, pessoas em comum e conexões entre grupos. Criar uma comunidade inclui automaticamente o criador como Dono, permite escolher participantes iniciais e cria canais de avisos e conversa. Mensagens diretas permanecem globais e privadas por participantes.

Serão 12 contas fictícias de demonstração e seis comunidades: SENAC Tech, Criativa Serra, Circuito Empreendedor, Basquete de Sábado, Trilhas da Serra e Cultura em Roda. A API pública de atalhos expõe somente contas explicitamente marcadas no seed; nunca inclui contas cadastradas pelo usuário ou credenciais. Todas as contas demo usam demo123. Eventos ilustrativos continuam apontando ao SENAC Caxias do Sul.

Preservar: TypeScript, React/Vite, Node/Express, JSON local, mapa, tema claro/escuro, paleta GC, permissões existentes, release executável por npm run start:release e dados ativos. O ZIP usa somente seeds, não bancos ativos. Não incluir solicitações hierárquicas ou anotações, que não fazem parte deste pedido.
