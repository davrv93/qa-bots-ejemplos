import { type Page, type Locator, expect } from '@playwright/test';

// Generado por scripts/escanear.mjs desde https://jmd-learn.online/tienda-sol/TU_CODIGO/catalogo.html
// Es un ESQUELETO: revisa los nombres, borra lo que no uses y escribe los métodos de negocio (TODO).
export class CatalogoPage {
  readonly catalogo: Locator; // link «Catálogo»
  readonly venta0: Locator; // link «Venta (0)»
  readonly reporte: Locator; // link «Reporte»
  readonly botonSalir: Locator; // button «Salir»
  readonly buscar: Locator; // searchbox «Buscar producto»
  readonly resumen: Locator; // status «20 productos»
  readonly agregarIncaKola500Ml: Locator; // button «Agregar Inca Kola 500 ml»
  readonly agregarChichaMoradaGloria1L: Locator; // button «Agregar Chicha morada Gloria 1 L»
  readonly agregarAguaSanLuis625Ml: Locator; // button «Agregar Agua San Luis 625 ml»
  readonly agregarCafeAltomayo200G: Locator; // button «Agregar Café Altomayo 200 g»
  readonly agregarArrozCosteno5Kg: Locator; // button «Agregar Arroz Costeño 5 kg»
  readonly agregarAzucarRubiaDulfina1Kg: Locator; // button «Agregar Azúcar rubia Dulfina 1 kg»
  readonly agregarAceitePrimor1L: Locator; // button «Agregar Aceite Primor 1 L»
  readonly agregarLecheGloriaAzul400G: Locator; // button «Agregar Leche Gloria azul 400 g»
  readonly agregarYogurtLaiveFresa1L: Locator; // button «Agregar Yogurt Laive fresa 1 L»
  readonly agregarQuesoFrescoDeCajamarca500G: Locator; // button «Agregar Queso fresco de Cajamarca 500 g»
  readonly agregarGalletasSodaField: Locator; // button «Agregar Galletas Soda Field»
  readonly agregarPapasLaySClasicas42G: Locator; // button «Agregar Papas Lay's clásicas 42 g»
  readonly agregarChocolateSublime30G: Locator; // button «Agregar Chocolate Sublime 30 g»
  readonly agregarCanchaSerrana200G: Locator; // button «Agregar Cancha serrana 200 g»
  readonly agregarPanetonDOnofrio900G: Locator; // button «Agregar Panetón D'Onofrio 900 g»
  readonly agregarAjiAmarilloMolidoTari400G: Locator; // button «Agregar Ají amarillo molido Tarí 400 g»
  readonly agregarJabonBolivar190G: Locator; // button «Agregar Jabón Bolívar 190 g»
  readonly agregarDetergenteOpal900G: Locator; // button «Agregar Detergente Opal 900 g»
  readonly agregarPapelHigienicoSuaveX4: Locator; // button «Agregar Papel higiénico Suave x4»
  readonly agregarMazamorraMoradaNegrita150G: Locator; // button «Agregar Mazamorra morada Negrita 150 g»
  readonly solBugs: Locator; // checkbox «Con bugs»
  readonly solReiniciar: Locator; // button «Reiniciar mi tienda»
  readonly solEstado: Locator; // status

  constructor(private readonly page: Page) {
    this.catalogo = page.getByRole('link', { name: 'Catálogo' });
    this.venta0 = page.getByRole('link', { name: 'Venta (0)' });
    this.reporte = page.getByRole('link', { name: 'Reporte' });
    this.botonSalir = page.getByRole('button', { name: 'Salir' });
    this.buscar = page.getByLabel('Buscar producto');
    this.resumen = page.getByRole('status', { name: '20 productos' });
    this.agregarIncaKola500Ml = page.getByRole('button', { name: 'Agregar Inca Kola 500 ml' });
    this.agregarChichaMoradaGloria1L = page.getByRole('button', { name: 'Agregar Chicha morada Gloria 1 L' });
    this.agregarAguaSanLuis625Ml = page.getByRole('button', { name: 'Agregar Agua San Luis 625 ml' });
    this.agregarCafeAltomayo200G = page.getByRole('button', { name: 'Agregar Café Altomayo 200 g' });
    this.agregarArrozCosteno5Kg = page.getByRole('button', { name: 'Agregar Arroz Costeño 5 kg' });
    this.agregarAzucarRubiaDulfina1Kg = page.getByRole('button', { name: 'Agregar Azúcar rubia Dulfina 1 kg' });
    this.agregarAceitePrimor1L = page.getByRole('button', { name: 'Agregar Aceite Primor 1 L' });
    this.agregarLecheGloriaAzul400G = page.getByRole('button', { name: 'Agregar Leche Gloria azul 400 g' });
    this.agregarYogurtLaiveFresa1L = page.getByRole('button', { name: 'Agregar Yogurt Laive fresa 1 L' });
    this.agregarQuesoFrescoDeCajamarca500G = page.getByRole('button', { name: 'Agregar Queso fresco de Cajamarca 500 g' });
    this.agregarGalletasSodaField = page.getByRole('button', { name: 'Agregar Galletas Soda Field' });
    this.agregarPapasLaySClasicas42G = page.getByRole('button', { name: 'Agregar Papas Lay\'s clásicas 42 g' });
    this.agregarChocolateSublime30G = page.getByRole('button', { name: 'Agregar Chocolate Sublime 30 g' });
    this.agregarCanchaSerrana200G = page.getByRole('button', { name: 'Agregar Cancha serrana 200 g' });
    this.agregarPanetonDOnofrio900G = page.getByRole('button', { name: 'Agregar Panetón D\'Onofrio 900 g' });
    this.agregarAjiAmarilloMolidoTari400G = page.getByRole('button', { name: 'Agregar Ají amarillo molido Tarí 400 g' });
    this.agregarJabonBolivar190G = page.getByRole('button', { name: 'Agregar Jabón Bolívar 190 g' });
    this.agregarDetergenteOpal900G = page.getByRole('button', { name: 'Agregar Detergente Opal 900 g' });
    this.agregarPapelHigienicoSuaveX4 = page.getByRole('button', { name: 'Agregar Papel higiénico Suave x4' });
    this.agregarMazamorraMoradaNegrita150G = page.getByRole('button', { name: 'Agregar Mazamorra morada Negrita 150 g' });
    this.solBugs = page.getByLabel('Con bugs');
    this.solReiniciar = page.getByRole('button', { name: 'Reiniciar mi tienda' });
    this.solEstado = page.locator('#sol-estado');
  }

  async abrir() {
    await this.page.goto('catalogo.html');
    await expect(this.page.getByRole('heading', { name: 'Catálogo' })).toBeVisible();
  }

  // TODO: métodos con nombre de negocio, por ejemplo: async ingresar(usuario, clave) { … }
}
