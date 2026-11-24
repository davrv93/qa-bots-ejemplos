# Mapa de Tienda Sol

Escaneado el 1/11/2026, 7:30:28 a. m. (hora de Lima) desde `https://jmd-learn.online/tienda-sol/TU_CODIGO/` con el usuario **cajero**.

Pantallas encontradas: **login**, **catalogo**, **venta**, **reporte**.

> Mejor localizador = el que vería una persona: `getByRole` con nombre, luego `getByLabel`, luego `getByTestId`; `locator('#id')` solo cuando no hay nombre accesible.

## Pantalla «login» · Iniciar sesión

URL: `https://jmd-learn.online/tienda-sol/TU_CODIGO/`

### Elementos (7)

| Rol | Nombre | Localizador recomendado |
|---|---|---|
| heading | Iniciar sesión | `getByRole('heading', { name: 'Iniciar sesión' })` |
| textbox | Usuario | `getByLabel('Usuario')` |
| textbox | Clave | `getByLabel('Clave')` |
| button | Ingresar | `getByRole('button', { name: 'Ingresar' })` |
| checkbox | Con bugs | `getByLabel('Con bugs')` |
| button | Reiniciar mi tienda | `getByRole('button', { name: 'Reiniciar mi tienda' })` |
| status | — | `locator('#sol-estado')` |

### Formularios

- **Usuario Clave Ingresar**: Usuario (text), Clave (password) → botón «Ingresar»

<details><summary>Árbol de accesibilidad (ariaSnapshot)</summary>

```yaml
- banner: ☀ Tienda Sol
- main:
  - region "Iniciar sesión":
    - heading "Iniciar sesión" [level=1]
    - text: Usuario
    - textbox "Usuario"
    - text: Clave
    - textbox "Clave"
    - button "Ingresar"
- complementary "Controles de mi tienda":
  - checkbox "Con bugs" [checked]
  - text: Con bugs ·
  - button "Reiniciar mi tienda"
  - status
```

</details>

## Pantalla «catalogo» · Catálogo

URL: `https://jmd-learn.online/tienda-sol/TU_CODIGO/catalogo.html`

### Elementos (50)

| Rol | Nombre | Localizador recomendado |
|---|---|---|
| link | Catálogo | `getByRole('link', { name: 'Catálogo' })` |
| link | Venta (0) | `getByRole('link', { name: 'Venta (0)' })` |
| link | Reporte | `getByRole('link', { name: 'Reporte' })` |
| button | Salir | `getByRole('button', { name: 'Salir' })` |
| heading | Catálogo | `getByRole('heading', { name: 'Catálogo' })` |
| searchbox | Buscar producto | `getByLabel('Buscar producto')` |
| status | 20 productos | `getByRole('status', { name: '20 productos' })` |
| heading | Inca Kola 500 ml | `getByRole('heading', { name: 'Inca Kola 500 ml' })` |
| button | Agregar Inca Kola 500 ml | `getByRole('button', { name: 'Agregar Inca Kola 500 ml' })` |
| heading | Chicha morada Gloria 1 L | `getByRole('heading', { name: 'Chicha morada Gloria 1 L' })` |
| button | Agregar Chicha morada Gloria 1 L | `getByRole('button', { name: 'Agregar Chicha morada Gloria 1 L' })` |
| heading | Agua San Luis 625 ml | `getByRole('heading', { name: 'Agua San Luis 625 ml' })` |
| button | Agregar Agua San Luis 625 ml | `getByRole('button', { name: 'Agregar Agua San Luis 625 ml' })` |
| heading | Café Altomayo 200 g | `getByRole('heading', { name: 'Café Altomayo 200 g' })` |
| button | Agregar Café Altomayo 200 g | `getByRole('button', { name: 'Agregar Café Altomayo 200 g' })` |
| heading | Arroz Costeño 5 kg | `getByRole('heading', { name: 'Arroz Costeño 5 kg' })` |
| button | Agregar Arroz Costeño 5 kg | `getByRole('button', { name: 'Agregar Arroz Costeño 5 kg' })` |
| heading | Azúcar rubia Dulfina 1 kg | `getByRole('heading', { name: 'Azúcar rubia Dulfina 1 kg' })` |
| button | Agregar Azúcar rubia Dulfina 1 kg | `getByRole('button', { name: 'Agregar Azúcar rubia Dulfina 1 kg' })` |
| heading | Aceite Primor 1 L | `getByRole('heading', { name: 'Aceite Primor 1 L' })` |
| button | Agregar Aceite Primor 1 L | `getByRole('button', { name: 'Agregar Aceite Primor 1 L' })` |
| heading | Leche Gloria azul 400 g | `getByRole('heading', { name: 'Leche Gloria azul 400 g' })` |
| button | Agregar Leche Gloria azul 400 g | `getByRole('button', { name: 'Agregar Leche Gloria azul 400 g' })` |
| heading | Yogurt Laive fresa 1 L | `getByRole('heading', { name: 'Yogurt Laive fresa 1 L' })` |
| button | Agregar Yogurt Laive fresa 1 L | `getByRole('button', { name: 'Agregar Yogurt Laive fresa 1 L' })` |
| heading | Queso fresco de Cajamarca 500 g | `getByRole('heading', { name: 'Queso fresco de Cajamarca 500 g' })` |
| button | Agregar Queso fresco de Cajamarca 500 g | `getByRole('button', { name: 'Agregar Queso fresco de Cajamarca 500 g' })` |
| heading | Galletas Soda Field | `getByRole('heading', { name: 'Galletas Soda Field' })` |
| button | Agregar Galletas Soda Field | `getByRole('button', { name: 'Agregar Galletas Soda Field' })` |
| heading | Papas Lay's clásicas 42 g | `getByRole('heading', { name: 'Papas Lay\'s clásicas 42 g' })` |
| button | Agregar Papas Lay's clásicas 42 g | `getByRole('button', { name: 'Agregar Papas Lay\'s clásicas 42 g' })` |
| heading | Chocolate Sublime 30 g | `getByRole('heading', { name: 'Chocolate Sublime 30 g' })` |
| button | Agregar Chocolate Sublime 30 g | `getByRole('button', { name: 'Agregar Chocolate Sublime 30 g' })` |
| heading | Cancha serrana 200 g | `getByRole('heading', { name: 'Cancha serrana 200 g' })` |
| button | Agregar Cancha serrana 200 g | `getByRole('button', { name: 'Agregar Cancha serrana 200 g' })` |
| heading | Panetón D'Onofrio 900 g | `getByRole('heading', { name: 'Panetón D\'Onofrio 900 g' })` |
| button | Agregar Panetón D'Onofrio 900 g | `getByRole('button', { name: 'Agregar Panetón D\'Onofrio 900 g' })` |
| heading | Ají amarillo molido Tarí 400 g | `getByRole('heading', { name: 'Ají amarillo molido Tarí 400 g' })` |
| button | Agregar Ají amarillo molido Tarí 400 g | `getByRole('button', { name: 'Agregar Ají amarillo molido Tarí 400 g' })` |
| heading | Jabón Bolívar 190 g | `getByRole('heading', { name: 'Jabón Bolívar 190 g' })` |
| button | Agregar Jabón Bolívar 190 g | `getByRole('button', { name: 'Agregar Jabón Bolívar 190 g' })` |
| heading | Detergente Opal 900 g | `getByRole('heading', { name: 'Detergente Opal 900 g' })` |
| button | Agregar Detergente Opal 900 g | `getByRole('button', { name: 'Agregar Detergente Opal 900 g' })` |
| heading | Papel higiénico Suave x4 | `getByRole('heading', { name: 'Papel higiénico Suave x4' })` |
| button | Agregar Papel higiénico Suave x4 | `getByRole('button', { name: 'Agregar Papel higiénico Suave x4' })` |
| heading | Mazamorra morada Negrita 150 g | `getByRole('heading', { name: 'Mazamorra morada Negrita 150 g' })` |
| button | Agregar Mazamorra morada Negrita 150 g | `getByRole('button', { name: 'Agregar Mazamorra morada Negrita 150 g' })` |
| checkbox | Con bugs | `getByLabel('Con bugs')` |
| button | Reiniciar mi tienda | `getByRole('button', { name: 'Reiniciar mi tienda' })` |
| status | — | `locator('#sol-estado')` |

### Formularios

- **Buscar producto**: Buscar producto (search) → botón «»

### Llamadas a la API observadas

- `POST /api/login`
- `GET /api/productos`

<details><summary>Árbol de accesibilidad (ariaSnapshot)</summary>

```yaml
- banner:
  - text: ☀ Tienda Sol Luis Huamán
  - navigation "Principal":
    - link "Catálogo":
      - /url: /tienda-sol/TU_CODIGO/catalogo.html
    - link "Venta (0)":
      - /url: /tienda-sol/TU_CODIGO/venta.html
    - link "Reporte":
      - /url: /tienda-sol/TU_CODIGO/reporte.html
    - button "Salir"
- main:
  - heading "Catálogo" [level=1]
  - search:
    - text: Buscar producto
    - searchbox "Buscar producto"
  - status: 20 productos
  - list "Productos":
    - listitem "Inca Kola 500 ml":
      - text: P001 · Bebidas
      - heading "Inca Kola 500 ml" [level=2]
      - text: "S/ 2.50 Stock: 48"
      - button "Agregar Inca Kola 500 ml": Agregar
    - listitem "Chicha morada Gloria 1 L":
      - text: P002 · Bebidas
      - heading "Chicha morada Gloria 1 L" [level=2]
      - text: "S/ 4.90 Stock: 20"
      - button "Agregar Chicha morada Gloria 1 L": Agregar
    - listitem "Agua San Luis 625 ml":
      - text: P003 · Bebidas
      - heading "Agua San Luis 625 ml" [level=2]
      - text: "S/ 1.80 Stock: 60"
      - button "Agregar Agua San Luis 625 ml": Agregar
    - listitem "Café Altomayo 200 g":
      - text: P004 · Abarrotes
      - heading "Café Altomayo 200 g" [level=2]
      - deletion: S/ 18.90
      - text: "S/ 17.01 Stock: 12 Promo -10%"
      - button "Agregar Café Altomayo 200 g": Agregar
    - listitem "Arroz Costeño 5 kg":
      - text: P005 · Abarrotes
      - heading "Arroz Costeño 5 kg" [level=2]
      - text: "S/ 24.50 Stock: 15"
      - button "Agregar Arroz Costeño 5 kg": Agregar
    - listitem "Azúcar rubia Dulfina 1 kg":
      - text: P006 · Abarrotes
      - heading "Azúcar rubia Dulfina 1 kg" [level=2]
      - text: "S/ 4.20 Stock: 30"
      - button "Agregar Azúcar rubia Dulfina 1 kg": Agregar
    - listitem "Aceite Primor 1 L":
      - text: P007 · Abarrotes
      - heading "Aceite Primor 1 L" [level=2]
      - text: "S/ 11.90 Stock: 18"
      - button "Agregar Aceite Primor 1 L": Agregar
    - listitem "Leche Gloria azul 400 g":
      - text: P008 · Lácteos
      - heading "Leche Gloria azul 400 g" [level=2]
      - text: "S/ 4.10 Stock: 40"
      - button "Agregar Leche Gloria azul 400 g": Agregar
    - listitem "Yogurt Laive fresa 1 L":
      - text: P009 · Lácteos
      - heading "Yogurt Laive fresa 1 L" [level=2]
      - text: "S/ 7.50 Stock: 10"
      - button "Agregar Yogurt Laive fresa 1 L": Agregar
    - listitem "Queso fresco de Cajamarca 500 g":
      - text: P010 · Lácteos
      - heading "Queso fresco de Cajamarca 500 g" [level=2]
      - text: "S/ 16.00 Stock: 6"
      - button "Agregar Queso fresco de Cajamarca 500 g": Agregar
    - listitem "Galletas Soda Field":
      - text: P011 · Snacks
      - heading "Galletas Soda Field" [level=2]
      - text: "S/ 1.20 Stock: 80"
      - button "Agregar Galletas Soda Field": Agregar
    - listitem "Papas Lay's clásicas 42 g":
      - text: P012 · Snacks
      - heading "Papas Lay's clásicas 42 g" [level=2]
      - text: "S/ 2.00 Stock: 35"
      - button "Agregar Papas Lay's clásicas 42 g": Agregar
    - listitem "Chocolate Sublime 30 g":
      - text: P013 · Snacks
      - heading "Chocolate Sublime 30 g" [level=2]
      - text: "S/ 1.50 Stock: 50"
      - button "Agregar Chocolate Sublime 30 g": Agregar
    - listitem "Cancha serrana 200 g":
      - text: P014 · Snacks
      - heading "Cancha serrana 200 g" [level=2]
      - text: "S/ 3.50 Stock: 22"
      - button "Agregar Cancha serrana 200 g": Agregar
    - listitem "Panetón D'Onofrio 900 g":
      - text: P015 · Temporada
      - heading "Panetón D'Onofrio 900 g" [level=2]
      - deletion: S/ 32.90
      - text: "S/ 29.61 Stock: 8 Promo -10%"
      - button "Agregar Panetón D'Onofrio 900 g": Agregar
    - listitem "Ají amarillo molido Tarí 400 g":
      - text: P016 · Abarrotes
      - heading "Ají amarillo molido Tarí 400 g" [level=2]
      - text: "S/ 6.80 Stock: 14"
      - button "Agregar Ají amarillo molido Tarí 400 g": Agregar
    - listitem "Jabón Bolívar 190 g":
      - text: P017 · Limpieza
      - heading "Jabón Bolívar 190 g" [level=2]
      - text: "S/ 3.90 Stock: 25"
      - button "Agregar Jabón Bolívar 190 g": Agregar
    - listitem "Detergente Opal 900 g":
      - text: P018 · Limpieza
      - heading "Detergente Opal 900 g" [level=2]
      - text: "S/ 9.50 Stock: 0 Agotado"
      - button "Agregar Detergente Opal 900 g" [disabled]: Agregar
    - listitem "Papel higiénico Suave x4":
      - text: P019 · Limpieza
      - heading "Papel higiénico Suave x4" [level=2]
      - text: "S/ 6.50 Stock: 30"
      - button "Agregar Papel higiénico Suave x4": Agregar
    - listitem "Mazamorra morada Negrita 150 g":
      - text: P020 · Postres
      - heading "Mazamorra morada Negrita 150 g" [level=2]
      - text: "S/ 3.20 Stock: 9 Vencido"
      - button "Agregar Mazamorra morada Negrita 150 g" [disabled]: Agregar
- complementary "Controles de mi tienda":
  - checkbox "Con bugs" [checked]
  - text: Con bugs ·
  - button "Reiniciar mi tienda"
  - status
```

</details>

## Pantalla «venta» · Venta

URL: `https://jmd-learn.online/tienda-sol/TU_CODIGO/venta.html`

### Elementos (11)

| Rol | Nombre | Localizador recomendado |
|---|---|---|
| link | Catálogo | `getByRole('link', { name: 'Catálogo' })` |
| link | Venta (0) | `getByRole('link', { name: 'Venta (0)' })` |
| link | Reporte | `getByRole('link', { name: 'Reporte' })` |
| button | Salir | `getByRole('button', { name: 'Salir' })` |
| heading | Venta | `getByRole('heading', { name: 'Venta' })` |
| link | catálogo | `getByRole('link', { name: 'catálogo' })` |
| spinbutton | Efectivo recibido (S/) | `getByLabel('Efectivo recibido (S/)')` |
| button | Confirmar venta | `getByRole('button', { name: 'Confirmar venta' })` |
| checkbox | Con bugs | `getByLabel('Con bugs')` |
| button | Reiniciar mi tienda | `getByRole('button', { name: 'Reiniciar mi tienda' })` |
| status | — | `locator('#sol-estado')` |

<details><summary>Árbol de accesibilidad (ariaSnapshot)</summary>

```yaml
- banner:
  - text: ☀ Tienda Sol Luis Huamán
  - navigation "Principal":
    - link "Catálogo":
      - /url: /tienda-sol/TU_CODIGO/catalogo.html
    - link "Venta (0)":
      - /url: /tienda-sol/TU_CODIGO/venta.html
    - link "Reporte":
      - /url: /tienda-sol/TU_CODIGO/reporte.html
    - button "Salir"
- main:
  - heading "Venta" [level=1]
  - paragraph:
    - text: El carrito está vacío. Agrega productos desde el
    - link "catálogo":
      - /url: /tienda-sol/TU_CODIGO/catalogo.html
    - text: .
  - region "Cobro":
    - text: Total
    - status "Total a pagar": S/ 0.00
    - text: Efectivo recibido (S/)
    - spinbutton "Efectivo recibido (S/)"
    - text: Vuelto
    - status "Vuelto": S/ 0.00
    - button "Confirmar venta" [disabled]
- complementary "Controles de mi tienda":
  - checkbox "Con bugs" [checked]
  - text: Con bugs ·
  - button "Reiniciar mi tienda"
  - status
```

</details>

## Pantalla «reporte» · Reporte del día

URL: `https://jmd-learn.online/tienda-sol/TU_CODIGO/reporte.html`

### Elementos (10)

| Rol | Nombre | Localizador recomendado |
|---|---|---|
| link | Catálogo | `getByRole('link', { name: 'Catálogo' })` |
| link | Venta (0) | `getByRole('link', { name: 'Venta (0)' })` |
| link | Reporte | `getByRole('link', { name: 'Reporte' })` |
| button | Salir | `getByRole('button', { name: 'Salir' })` |
| heading | Reporte del día | `getByRole('heading', { name: 'Reporte del día' })` |
| heading | Ventas | `getByRole('heading', { name: 'Ventas' })` |
| table | Ventas del día | `locator('table')` |
| checkbox | Con bugs | `getByLabel('Con bugs')` |
| button | Reiniciar mi tienda | `getByRole('button', { name: 'Reiniciar mi tienda' })` |
| status | — | `locator('#sol-estado')` |

### Llamadas a la API observadas

- `GET /api/reporte`

<details><summary>Árbol de accesibilidad (ariaSnapshot)</summary>

```yaml
- banner:
  - text: ☀ Tienda Sol Luis Huamán
  - navigation "Principal":
    - link "Catálogo":
      - /url: /tienda-sol/TU_CODIGO/catalogo.html
    - link "Venta (0)":
      - /url: /tienda-sol/TU_CODIGO/venta.html
    - link "Reporte":
      - /url: /tienda-sol/TU_CODIGO/reporte.html
    - button "Salir"
- main:
  - heading "Reporte del día" [level=1]
  - paragraph: "Día: 2026-11-01"
  - text: Total vendido
  - status "Total vendido": S/ 0.00
  - text: Número de ventas
  - status "Número de ventas": "0"
  - heading "Ventas" [level=2]
  - table "Ventas del día":
    - rowgroup:
      - row "N° Hora Cajero Total Efectivo Vuelto":
        - columnheader "N°"
        - columnheader "Hora"
        - columnheader "Cajero"
        - columnheader "Total"
        - columnheader "Efectivo"
        - columnheader "Vuelto"
    - rowgroup:
      - row "Aún no hay ventas hoy":
        - cell "Aún no hay ventas hoy"
- complementary "Controles de mi tienda":
  - checkbox "Con bugs" [checked]
  - text: Con bugs ·
  - button "Reiniciar mi tienda"
  - status
```

</details>

## Qué hacer con esto

1. Compara con `pruebas/pages/*.ts`: ¿faltan elementos? ¿cambió un nombre?
2. Pídele a Claude Code que convierta `pages/generado/*.ts` en page objects con métodos de negocio (ver `ia/prompts.md`, «Escanea mi tienda»).
3. Escribe un spec por fila de `docs/matriz.csv` usando solo esos localizadores.
