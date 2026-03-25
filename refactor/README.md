# Refactor roleta-raspadinha

## Estrutura
- `frontend/` → subir na Vercel
- `backend/` → subir no Render
- `supabase/schema.sql` → executar no SQL Editor do Supabase
- `render.yaml` → blueprint opcional do Render

## O que foi corrigido
- separação real entre frontend e backend
- troca de SQLite por Supabase/Postgres
- `config.js` corrigido para retornar JSON direto
- endpoints principais reorganizados
- configuração pronta para Vercel + Render + Supabase
- base preparada para manter a mesma lógica de roleta, raspadinha, indicações, histórico e dashboard

## Checklist do que ainda falta
- [ ] subir `schema.sql` no Supabase
- [ ] preencher `.env` do backend no Render
- [ ] trocar a URL do backend em `frontend/config.js`
- [ ] subir os arquivos do `frontend/` na Vercel
- [ ] testar cadastro, prêmios, sorteio, raspadinha e dashboard
- [ ] migrar dados antigos do SQLite para o Supabase, se quiser manter histórico
- [ ] revisar login admin, porque o projeto antigo misturava sessão e páginas estáticas
- [ ] mover imagens e vídeos usados nos HTML para a pasta pública do frontend

## Variáveis do Render
Veja `backend/.env.example`.

## Observação importante
O projeto antigo tinha bug estrutural no `config.js`: ele devolvia `{ ok, data }`, mas várias páginas tentavam usar o retorno como se fosse o JSON final. Isso quebrava dashboard, histórico e indicações em vários pontos. Nesta versão, `CONFIG.fetch()` devolve o payload diretamente.
