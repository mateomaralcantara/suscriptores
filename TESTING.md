# Pruebas

```powershell
npm run test:unit   # lógica de negocio, sin servidor
npm run build
npm run test:e2e    # contra el build de producción (`next start`)
npm run validate    # todo lo anterior más TypeScript y ESLint
```

Requiere Node 22.18 o superior (las pruebas se escriben en TypeScript y Node las ejecuta directamente).

## Qué cubren

- **Unitarias (`tests/unit`)**: firma y caducidad de sesiones, manipulación de tokens, hash de contraseñas, límites de peticiones, precios en enteros, validación de pedidos y depósitos, y las reglas del almacén: cobro exacto, saldo insuficiente, idempotencia, cancelación con reembolso único, refill, aislamiento entre usuarios y cuadre del libro mayor.
- **Extremo a extremo (`tests/e2e`)**: arrancan el servidor real y comprueban que las páginas privadas redirigen al login, que todos los endpoints de cuenta rechazan peticiones anónimas, cookies falsificadas y orígenes ajenos (CSRF), que un cliente no entra en `/admin` ni ve pedidos de otro, y el ciclo completo de un pedido por la API.

## Qué no cubren

No hay pruebas de interfaz automatizadas en el repositorio, ni pruebas de persistencia (aún no existe base de datos conectada).
