# Comunidades e networking — plano de implementação

Goal: entregar seleção e criação de comunidades, rede de exemplos e atalhos de login completos.
Architecture: contas globais, espaços de comunidades isolados no JSON e adaptador de armazenamento por requisição; a sessão da interface carrega a comunidade selecionada.
Tech Stack: React, TypeScript, Express, Zod, Vitest, JSON.
Spec: docs/superpowers/specs/2026-09-21-comunidades.md

1. Contratos e isolamento: criar testes HTTP de criação, persistência, permissões por comunidade, rejeição de acesso cruzado e privacidade de contas demo; rodar com Vitest e observar 404 antes da implementação. Adicionar CommunitySpace/CommunityMembership/CommunitySummary e validação retrocompatível. Projetar/aplicar dados por comunidade dentro de JsonStore.mutate, sem mutar o contexto global de outra requisição.
2. API e dados: implementar listagem, criação, sessão de comunidade, diretório de pessoas e atalhos demo. Reutilizar routers existentes com armazenamento limitado à comunidade. Expandir seed para 12 pessoas e seis espaços, com canais, conversas e eventos coerentes; manter IDs antigos e senhas válidas.
3. Interface: incluir comunidades na sessão e cabeçalho; criar rota /comunidades com busca, formulário, cards e rede compartilhada. Trocar contexto e remontar telas ao abrir comunidade. Buscar atalhos públicos no login, mostrando cargo e vínculos sem expor contas reais.
4. Validação e entrega: verificar API real e interface; testar troca, criação por membro, persistência e isolamento, executar npm run check. Atualizar README/REVISAO, empacotar fontes e release sem node_modules/bancos ativos e substituir o ZIP anterior.
