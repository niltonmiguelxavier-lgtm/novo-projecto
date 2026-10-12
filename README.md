# Nevon Pay

Fundação inicial da Nevon Pay, com foco inicial em Moçambique. Este pacote contém uma interface demonstrativa, estrutura de aplicação e documentação; **não é ainda um gateway de pagamentos pronto para dinheiro real**.

## Requisitos
- Node.js 20 ou superior
- npm

## Executar
```bash
npm install
npm run dev
```

Verificar e compilar:
```bash
npm run typecheck
npm run build
npm run preview
```

## Estrutura
- `src/`: aplicação React/TypeScript
- `migrations/`: SQL inicial para PostgreSQL
- `docs/`: estado, arquitectura, API e segurança
- `.env.example`: variáveis públicas de exemplo

## Próximas fases
1. Implementar backend e autenticação real.
2. Ligar PostgreSQL/Neon apenas pelo backend.
3. Implementar validação, autorização, idempotência e webhooks verificados.
4. Integrar fornecedores oficiais de pagamento com credenciais autorizadas.
5. Testar, auditar, configurar monitorização e cumprir requisitos legais aplicáveis.

## Segurança
Não coloques senhas, tokens, chaves privadas ou credenciais no GitHub. Variáveis `VITE_*` são expostas no browser. Não activar pagamentos reais antes de concluir testes, aprovações e revisão de segurança.
