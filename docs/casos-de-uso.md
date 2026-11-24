# Casos de uso de Tienda Sol

Cada caso de uso describe **lo que una persona quiere lograr** con el sistema. De cada flujo
(principal y alternos) salen uno o más **casos de prueba**; la relación completa está en
[`matriz.csv`](matriz.csv) y el portal la pinta con verde/rojo.

> Regla práctica: **un flujo = al menos una prueba**. Un flujo alterno sin prueba es un hueco
> donde se esconden los defectos.

Actores:

- **Cajero**: vende en el mostrador (usuario `cajero` / clave `cajero123`).
- **Administradora**: revisa el reporte del día (usuario `admin` / clave `admin123`).
- **Sistema de monitoreo**: consulta `/salud` cada 15 s (Prometheus, el vigía).

---

## CU-01 Iniciar sesión

| | |
|---|---|
| **Actor** | Cajero o administradora |
| **Precondición** | El usuario existe en la semilla |
| **Postcondición** | Hay una sesión activa y se muestra el catálogo |

**Flujo principal**
1. El actor abre la tienda.
2. Escribe usuario y clave y pulsa **Ingresar**.
3. El sistema valida y muestra el **Catálogo** con el nombre del usuario arriba.

**Flujos alternos**
- **2a. Clave incorrecta**: el sistema muestra «Usuario o clave incorrectos» y se queda en el login.
- **2b. Campos vacíos**: el sistema pide «Ingresa usuario y clave».
- **1a. Entra directo a una página interna sin sesión**: el sistema lo devuelve al login.
- **2c. (pendiente) Tres intentos fallidos**: el usuario queda bloqueado 5 minutos.

**Pruebas**: E2E-LOG-001 (principal), E2E-LOG-002 (2a), E2E-LOG-003 (1a), E2E-LOG-004 (2c, pendiente),
API-LOG-001, API-LOG-002, API-SEG-001.

---

## CU-02 Buscar producto

| | |
|---|---|
| **Actor** | Cajero |
| **Precondición** | Sesión iniciada |
| **Postcondición** | El catálogo muestra solo los productos que coinciden |

**Flujo principal**
1. El cajero escribe parte del nombre (ej. «inca») o el código (ej. «P004») en **Buscar producto**.
2. El sistema filtra la lista y dice cuántos productos encontró.

**Flujos alternos**
- **2a. Sin coincidencias**: el sistema dice «No se encontraron productos».

**Pruebas**: E2E-CAT-001, E2E-CAT-002, E2E-CAT-003, VIS-CAT-001 (visual).

---

## CU-03 Registrar venta

| | |
|---|---|
| **Actor** | Cajero |
| **Precondición** | Sesión iniciada; productos con stock y no vencidos |
| **Postcondición** | La venta queda registrada, el stock baja y el reporte la suma |

**Flujo principal**
1. El cajero agrega productos desde el catálogo (**Agregar …**).
2. Abre **Venta**: ve el carrito, el total y puede cambiar cantidades.
3. Escribe el **Efectivo recibido**; el sistema muestra el **Vuelto** al instante.
4. Pulsa **Confirmar venta**.
5. El sistema registra la venta y muestra «Venta N° X registrada. Total S/ … · Vuelto S/ …».

**Reglas de negocio**
- Los productos con promo (Café Altomayo, Panetón D'Onofrio) tienen **10 % de descuento, una sola vez**.
- Total = suma de (precio con descuento × cantidad), redondeado a céntimos.
- Vuelto = efectivo − total.

**Flujos alternos**
- **2a. Cambia la cantidad**: el total se recalcula (con el descuento aplicado una sola vez).
- **2b. Quita un producto**: el total se recalcula (pendiente de automatizar).
- **3a. Efectivo insuficiente** → ver CU-04.

**Pruebas**: E2E-VEN-001, E2E-VEN-003 (2a), E2E-VEN-004 (3), E2E-VEN-005 (2b, pendiente), API-VEN-002.

---

## CU-04 Rechazar pago insuficiente

| | |
|---|---|
| **Actor** | Cajero |
| **Precondición** | Carrito con productos |
| **Postcondición** | **No** se registra ninguna venta; el stock no cambia |

**Flujo principal**
1. El cajero escribe un efectivo menor que el total (ej. S/ 5.00 para S/ 17.01).
2. El vuelto muestra «Falta S/ …».
3. Pulsa **Confirmar venta**.
4. El sistema muestra «Efectivo insuficiente: faltan S/ …» y **no** registra la venta.

**Pruebas**: E2E-VEN-002 (pantalla), API-VEN-001 (servidor).

> Pista para el taller: ¿por qué conviene probar esta regla **en las dos capas**, pantalla y API?

---

## CU-05 Ver reporte del día

| | |
|---|---|
| **Actor** | Administradora (o cajero) |
| **Precondición** | Sesión iniciada |
| **Postcondición** | Ninguna (solo lectura) |

**Flujo principal**
1. El actor abre **Reporte**.
2. El sistema muestra el **Total vendido**, el **Número de ventas** y la lista de ventas del día (hora de Lima).

**Flujos alternos**
- **2a. Aún no hay ventas**: total S/ 0.00, 0 ventas, «Aún no hay ventas hoy».

**Pruebas**: E2E-REP-001 (2a), E2E-REP-002 (principal, con ventas preparadas por API).

---

## CU-06 Producto sin stock o vencido

| | |
|---|---|
| **Actor** | Cajero |
| **Precondición** | En la semilla: Detergente Opal con stock 0 y Mazamorra Negrita vencida (31-01-2025) |
| **Postcondición** | No se puede vender ninguno de los dos |

**Flujo principal**
1. El cajero busca el producto.
2. El sistema lo muestra con la etiqueta **Agotado** o **Vencido** y el botón **Agregar** deshabilitado.
3. Si alguien intenta venderlo por la API, el servidor responde **422** con el motivo.

**Pruebas**: E2E-CAT-004, E2E-CAT-005, API-VEN-003.

---

## CU-07 Vigilar disponibilidad (soporte)

| | |
|---|---|
| **Actor** | Sistema de monitoreo |
| **Postcondición** | Si `/salud` falla más de 1 minuto, se dispara una alerta |

**Flujo principal**
1. Cada 15 s el monitoreo pide `GET /salud`.
2. Si responde 200 con `"estado":"ok"`, cuenta como **arriba**.

**Flujos alternos**
- **2a. 503, tiempo de espera agotado o cuerpo sin `"estado":"ok"`**: cuenta como **caída**.
- **2b. Caída por más de 1 minuto**: Grafana envía la alerta al webhook.

**Pruebas**: API-SAL-001 (y la demo en vivo de monitoreo).
