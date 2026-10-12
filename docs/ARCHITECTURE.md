# Arquitectura proposta
- Frontend: React + TypeScript + Vite.
- Backend/API: serviço server-side separado, por exemplo Cloudflare Workers.
- Base de dados: PostgreSQL no Neon, acessível apenas pelo backend.
- Pagamentos: adaptadores server-side para APIs oficiais dos fornecedores.
- Frontend pode ser publicado no Cloudflare Pages depois de configurar build e variáveis públicas.

## Fluxo seguro de pagamento
1. Comerciante autenticado pede ao backend para criar pagamento.
2. Backend valida comerciante, moeda, montante e chave de idempotência.
3. Backend cria registo pendente e inicia operação no fornecedor.
4. Fornecedor envia webhook; backend verifica autenticidade e consulta o fornecedor quando necessário.
5. Backend actualiza estado e regista auditoria.
6. Frontend consulta o estado; nunca confirma pagamento por conta própria.
