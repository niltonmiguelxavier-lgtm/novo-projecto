# API planeada — ainda não implementada
- `POST /api/v1/payments`: criar pagamento autenticado com idempotência.
- `GET /api/v1/payments/:id`: consultar estado com autorização do comerciante.
- `POST /api/v1/webhooks/:provider`: receber eventos e verificar assinatura.
- `GET /api/v1/health`: estado operacional sem expor segredos.

Validar esquema, permissões, moeda, montante, limites e idempotência. Só definir estados finais após confirmação verificada no backend.
