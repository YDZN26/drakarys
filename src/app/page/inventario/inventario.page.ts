import { Component, OnInit, NgZone, ViewChild, ElementRef, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { NavController, Platform } from '@ionic/angular';
import { SupabaseService } from '../../supabase.service';
import { MensajeService } from 'src/app/mensaje.service';
import { Subscription } from 'rxjs';

import { BrowserMultiFormatReader } from '@zxing/browser';
import type { Result } from '@zxing/library';

@Component({
  selector: 'app-inventario',
  templateUrl: './inventario.page.html',
  styleUrls: ['./inventario.page.scss'],
})
export class InventarioPage implements OnInit, OnDestroy {
  nombreUsuario: string = 'Usuario';

  productos: any[] = [];
  productosFiltrados: any[] = [];
  productosBaseParaAlertas: any[] = [];

  productosStockBajo: any[] = [];
  productosCriticos: any[] = [];
  productosReposicionInterna: any[] = [];
  productosSinStock: any[] = [];

  categorias: any[] = [];
  categoriaSeleccionada: number | null = null;
  textoBusqueda: string = '';
  mensaje: string = '';

  filtroAlertaModal: string = 'todos';

  stockMinimo: number = 2;
  stockMinimoExhibicion: number = 2;
  stockMinimoAlmacenTienda: number = 2;
  stockMinimoAlmacenCasa: number = 2;

  modalStockBajoAbierto: boolean = false;
  scannerAbierto: boolean = false;

  mostrarModalCerrarSesion: boolean = false;
  cerrarSesionConfirmado: boolean = false;

  private mensajeSub!: Subscription;
  private backButtonSub: any;

  private codeReader: BrowserMultiFormatReader | null = null;
  private streamActual: MediaStream | null = null;

  private cerrandoScanner: boolean = false;
  private cerrandoStockBajo: boolean = false;

  @ViewChild('videoScanner', { static: false }) videoScanner!: ElementRef<HTMLVideoElement>;

  constructor(
    private navCtrl: NavController,
    private supabaseService: SupabaseService,
    private mensajeService: MensajeService,
    private zone: NgZone,
    private platform: Platform,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const rolUsuario = localStorage.getItem('rolUsuario') || '';

    if (rolUsuario !== 'dueño') {
      this.navCtrl.navigateRoot('/tab-inicial/balance');
      return;
    }

    this.cargarUsuarioSesion();

    this.cargarProductos();
    this.cargarCategorias();

    this.mensajeSub = this.mensajeService.mensaje$.subscribe((mensaje: string) => {
      if (mensaje) {
        console.log('Mensaje recibido:', mensaje);
        this.mensaje = mensaje;
        this.cargarProductos(this.categoriaSeleccionada);
      }
    });

    this.backButtonSub = this.platform.backButton.subscribeWithPriority(99999, () => {
      if (this.scannerAbierto) {
        this.cerrarScanner();
        return;
      }

      if (this.modalStockBajoAbierto) {
        this.cerrarModalStockBajo();
        return;
      }

      if (this.mostrarModalCerrarSesion) {
        this.cerrarModalCerrarSesion();
        return;
      }

      this.navCtrl.back();
    });
  }

  ngOnDestroy() {
    this.detenerCamaraScanner();

    if (this.mensajeSub) {
      this.mensajeSub.unsubscribe();
    }

    if (this.backButtonSub) {
      this.backButtonSub.unsubscribe();
    }
  }

  async ionViewWillEnter() {
    const rolUsuario = localStorage.getItem('rolUsuario') || '';

    if (rolUsuario !== 'dueño') {
      this.navCtrl.navigateRoot('/tab-inicial/balance');
      return;
    }

    this.cargarUsuarioSesion();

    await this.cargarProductos(this.categoriaSeleccionada);
  }

  async ionViewWillLeave() {
    await this.detenerCamaraScanner();
  }

  @HostListener('window:popstate', ['$event'])
  controlarBackDelSistema(event: any) {
    if (this.scannerAbierto) {
      history.pushState(null, '', window.location.href);
      this.cerrarScanner();
      return;
    }

    if (this.modalStockBajoAbierto) {
      history.pushState(null, '', window.location.href);
      this.cerrarModalStockBajo();
      return;
    }

    if (this.mostrarModalCerrarSesion) {
      history.pushState(null, '', window.location.href);
      this.cerrarModalCerrarSesion();
      return;
    }
  }

  cargarUsuarioSesion() {
    const usuario = this.supabaseService.obtenerUsuario();

    let nombre = 'Usuario';

    if (usuario) {
      nombre =
        usuario.username ||
        usuario.usuario ||
        usuario.nombre ||
        usuario.nombre_usuario ||
        usuario.nombreUsuario ||
        'Usuario';
    }

    this.zone.run(() => {
      this.nombreUsuario = this.capitalize(nombre);
      this.cdr.detectChanges();
    });
  }

  capitalize(nombre: string): string {
    if (!nombre) {
      return 'Usuario';
    }

    return nombre.charAt(0).toUpperCase() + nombre.slice(1);
  }

  abrirModalCerrarSesion() {
    this.mostrarModalCerrarSesion = true;
  }

  cerrarModalCerrarSesion() {
    this.mostrarModalCerrarSesion = false;
  }

  confirmarCerrarSesion() {
    this.cerrarSesionConfirmado = true;
    this.mostrarModalCerrarSesion = false;
  }

  alCerrarModalCerrarSesion() {
    if (this.cerrarSesionConfirmado) {
      this.cerrarSesionConfirmado = false;
      this.supabaseService.cerrarSesion();
      this.nombreUsuario = 'Usuario';
      this.navCtrl.navigateRoot('/login');
    }
  }

  async cargarCategorias() {
    try {
      this.categorias = await this.supabaseService.obtenerCategorias();
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  }

  async cargarProductos(categoriaId: number | null = null) {
    try {
      const todos = await this.supabaseService.obtenerProductos();

      const productosNormalizados = todos.map((producto: any) => {
        const stockExhibicion = Number(producto.stock_exhibicion || 0);
        const stockAlmacenTienda = Number(producto.stock_almacen_tienda || 0);
        const stockAlmacenCasa = Number(producto.stock_almacen_casa || 0);
        const stockDanado = Number(producto.stock_danado || 0);

        return {
          ...producto,
          stock_exhibicion: stockExhibicion,
          stock_almacen_tienda: stockAlmacenTienda,
          stock_almacen_casa: stockAlmacenCasa,
          stock_danado: stockDanado,
          stock_total: stockExhibicion + stockAlmacenTienda + stockAlmacenCasa
        };
      });

      this.productos = categoriaId
        ? productosNormalizados.filter((p: any) => p.categoria_id === categoriaId)
        : productosNormalizados;

      this.aplicarFiltros();
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  }

  async actualizarInventario(event: any) {
    try {
      this.cargarUsuarioSesion();
      await this.cargarCategorias();
      await this.cargarProductos(this.categoriaSeleccionada);
    } catch (error) {
      console.error('Error al actualizar inventario:', error);
    } finally {
      event.target.complete();
    }
  }

  filtrarPorCategoria(categoriaId: number | null) {
    this.categoriaSeleccionada = categoriaId;
    this.cargarProductos(categoriaId);
  }

  filtrarAlertasModal(tipo: string) {
    this.filtroAlertaModal = tipo;
  }

  mostrarSeccionAlertas(tipo: string): boolean {
    return this.filtroAlertaModal === 'todos' || this.filtroAlertaModal === tipo;
  }

  buscarProductos(event: any) {
    this.textoBusqueda = event?.target?.value || '';
    this.aplicarFiltros();
  }

  normalizarTexto(valor: any): string {
    return (valor || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  escaparRegExp(valor: string): string {
    return valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  coincidePalabraBusqueda(texto: string, palabra: string): boolean {
    if (/^\d+$/.test(palabra)) {
      const regex = new RegExp(`(^|[^a-z0-9])${this.escaparRegExp(palabra)}([^a-z0-9]|$)`);
      return regex.test(texto);
    }

    return texto.includes(palabra);
  }

  coincideTextoBusqueda(texto: string, palabrasBusqueda: string[]): boolean {
    return palabrasBusqueda.every(palabra => this.coincidePalabraBusqueda(texto, palabra));
  }

  aplicarFiltros() {
    let productosBase = [...this.productos];

    const searchTerm = this.normalizarTexto(this.textoBusqueda);

    if (searchTerm) {
      const palabrasBusqueda = searchTerm
        .split(' ')
        .map(palabra => palabra.trim())
        .filter(palabra => palabra.length > 0);

      productosBase = productosBase.filter((producto: any) => {
        const nombre = this.normalizarTexto(producto.nombre);
        const descripcion = this.normalizarTexto(producto.descripcion);
        const codigoBarras = producto.codigo_barras ? producto.codigo_barras.toString().toLowerCase() : '';

        const coincideNombre = this.coincideTextoBusqueda(nombre, palabrasBusqueda);
        const coincideDescripcion = this.coincideTextoBusqueda(descripcion, palabrasBusqueda);
        const coincideCodigo = codigoBarras.includes(searchTerm);

        return coincideNombre || coincideDescripcion || coincideCodigo;
      });
    }

    this.productosBaseParaAlertas = productosBase;
    this.recalcularAlertasInventario();

    this.productosFiltrados = this.ordenarProductosPorPrioridad(productosBase);
  }

  recalcularAlertasInventario() {
    const productosBase = this.productosBaseParaAlertas || [];

    this.productosSinStock = productosBase.filter((producto: any) => {
      return this.esProductoSinStock(producto);
    });

    this.productosCriticos = productosBase.filter((producto: any) => {
      return this.esProductoCritico(producto);
    });

    this.productosReposicionInterna = productosBase.filter((producto: any) => {
      return this.esProductoReposicionInterna(producto);
    });

    this.productosStockBajo = [
      ...this.productosSinStock,
      ...this.productosCriticos,
      ...this.productosReposicionInterna
    ];
  }

  verificarStockBajo() {
    this.recalcularAlertasInventario();
  }

  esProductoSinStock(producto: any): boolean {
    return this.obtenerTotalVendible(producto) === 0;
  }

  esProductoCritico(producto: any): boolean {
    const totalVendible = this.obtenerTotalVendible(producto);
    return totalVendible > 0 && totalVendible < this.stockMinimo;
  }

  obtenerAlertasReposicionProducto(producto: any): string[] {
    const alertas: string[] = [];

    const stockExhibicion = Number(producto.stock_exhibicion || 0);
    const stockAlmacenTienda = Number(producto.stock_almacen_tienda || 0);
    const stockAlmacenCasa = Number(producto.stock_almacen_casa || 0);

    if (stockExhibicion < this.stockMinimoExhibicion && (stockAlmacenTienda + stockAlmacenCasa) > 0) {
      alertas.push('Reponer exhibición');
    }

    if (stockAlmacenTienda < this.stockMinimoAlmacenTienda && stockAlmacenCasa > 0) {
      alertas.push('Reponer almacén tienda');
    }

    if (stockAlmacenCasa < this.stockMinimoAlmacenCasa && this.obtenerTotalVendible(producto) > 0) {
      alertas.push('Comprar para almacén casa');
    }

    return alertas;
  }

  esProductoReposicionInterna(producto: any): boolean {
    const totalVendible = this.obtenerTotalVendible(producto);

    return totalVendible >= this.stockMinimo
      && this.obtenerAlertasReposicionProducto(producto).length > 0;
  }

  obtenerTipoAlertaProducto(producto: any): string {
    if (this.esProductoSinStock(producto)) {
      return 'sin_stock';
    }

    if (this.esProductoCritico(producto)) {
      return 'critico';
    }

    if (this.esProductoReposicionInterna(producto)) {
      return 'reposicion';
    }

    return '';
  }

  obtenerTextoAlertaProducto(producto: any): string {
    const tipo = this.obtenerTipoAlertaProducto(producto);

    if (tipo === 'sin_stock') {
      return 'Sin stock';
    }

    if (tipo === 'critico') {
      return 'Crítico';
    }

    if (tipo === 'reposicion') {
      const alertas = this.obtenerAlertasReposicionProducto(producto);

      if (alertas.length > 0) {
        return alertas.join(' · ');
      }

      return 'Reponer stock';
    }

    return '';
  }

  obtenerRecomendacionUbicacionesProducto(producto: any): string {
    const tipo = this.obtenerTipoAlertaProducto(producto);

    if (tipo === 'sin_stock') {
      return 'Producto agotado. Se recomienda comprar o reponer stock.';
    }

    if (tipo === 'critico') {
      return 'Stock total bajo. Se recomienda comprar o reponer este producto.';
    }

    const alertas = this.obtenerAlertasReposicionProducto(producto);

    if (alertas.length > 0) {
      return alertas.join(' · ');
    }

    return 'Stock disponible.';
  }

  obtenerPrioridadProducto(producto: any): number {
    if (this.esProductoSinStock(producto)) {
      return 1;
    }

    if (this.esProductoCritico(producto)) {
      return 2;
    }

    if (this.esProductoReposicionInterna(producto)) {
      return 3;
    }

    return 4;
  }

  ordenarProductosPorPrioridad(productos: any[]): any[] {
    return productos.sort((a: any, b: any) => {
      const prioridadA = this.obtenerPrioridadProducto(a);
      const prioridadB = this.obtenerPrioridadProducto(b);

      if (prioridadA !== prioridadB) {
        return prioridadA - prioridadB;
      }

      const nombreA = (a.nombre || '').toString().toLowerCase();
      const nombreB = (b.nombre || '').toString().toLowerCase();

      if (nombreA < nombreB) {
        return -1;
      }

      if (nombreA > nombreB) {
        return 1;
      }

      return 0;
    });
  }

  totalAlertasInventario(): number {
    return this.productosSinStock.length
      + this.productosCriticos.length
      + this.productosReposicionInterna.length;
  }

  obtenerDetalleStockBajo(producto: any): string {
    const detalles: string[] = [];

    const stockExhibicion = Number(producto.stock_exhibicion || 0);
    const stockAlmacenTienda = Number(producto.stock_almacen_tienda || 0);
    const stockAlmacenCasa = Number(producto.stock_almacen_casa || 0);

    detalles.push(`Exhibición: ${stockExhibicion}`);
    detalles.push(`Almacén tienda: ${stockAlmacenTienda}`);
    detalles.push(`Almacén casa: ${stockAlmacenCasa}`);
    detalles.push(`Total vendible: ${this.obtenerTotalVendible(producto)}`);

    return detalles.join(' | ');
  }

  marcarImagenError(producto: any) {
    producto.imagenError = true;
  }

  mostrarProductosStockBajo() {
    this.filtroAlertaModal = 'todos';
    this.cerrandoStockBajo = false;
    this.modalStockBajoAbierto = true;
  }

  cerrarModalStockBajo() {
    if (this.cerrandoStockBajo) {
      return;
    }

    this.cerrandoStockBajo = true;
    this.modalStockBajoAbierto = false;

    setTimeout(() => {
      this.cerrandoStockBajo = false;
    }, 300);
  }

  stockBajoCerradoDesdeModal() {
    this.modalStockBajoAbierto = false;
    this.cerrandoStockBajo = false;
  }

  agregarNuevoProducto() {
    this.navCtrl.navigateForward('/agregar-producto');
  }

  verDetalleProducto(producto: any) {
    console.log('Detalle del producto:', producto);
    this.navCtrl.navigateForward(`/agregar-producto/${producto.producto_id}`);
  }

  obtenerTotalVendible(producto: any): number {
    if (!producto) {
      return 0;
    }

    return Number(producto.stock_exhibicion || 0)
      + Number(producto.stock_almacen_tienda || 0)
      + Number(producto.stock_almacen_casa || 0);
  }

  obtenerTotalFisico(producto: any): number {
    if (!producto) {
      return 0;
    }

    return this.obtenerTotalVendible(producto) + Number(producto.stock_danado || 0);
  }

  calcularStockFiltradoVendible(): number {
    return this.productosFiltrados.reduce((total, producto) => {
      return total + this.obtenerTotalVendible(producto);
    }, 0);
  }

  calcularStockFiltradoExhibicion(): number {
    return this.productosFiltrados.reduce((total, producto) => {
      return total + Number(producto.stock_exhibicion || 0);
    }, 0);
  }

  calcularStockFiltradoAlmacenTienda(): number {
    return this.productosFiltrados.reduce((total, producto) => {
      return total + Number(producto.stock_almacen_tienda || 0);
    }, 0);
  }

  calcularStockFiltradoAlmacenCasa(): number {
    return this.productosFiltrados.reduce((total, producto) => {
      return total + Number(producto.stock_almacen_casa || 0);
    }, 0);
  }

  calcularValorTotal(): number {
    return this.productosFiltrados.reduce((total, p) => {
      const precio = Number(p?.precio || 0);
      const stockVendible = this.obtenerTotalVendible(p);
      return total + precio * stockVendible;
    }, 0);
  }

  async abrirScanner() {
    await this.detenerCamaraScanner();

    this.cerrandoScanner = false;
    this.scannerAbierto = true;
  }

  async cerrarScanner() {
    if (this.cerrandoScanner) {
      return;
    }

    this.cerrandoScanner = true;

    await this.detenerCamaraScanner();

    this.scannerAbierto = false;

    setTimeout(() => {
      this.cerrandoScanner = false;
    }, 300);
  }

  async scannerCerradoDesdeModal() {
    await this.detenerCamaraScanner();

    this.scannerAbierto = false;
    this.cerrandoScanner = false;
  }

  async detenerCamaraScanner() {
    try {
      this.codeReader = null;

      if (this.videoScanner && this.videoScanner.nativeElement) {
        const videoEl = this.videoScanner.nativeElement;
        videoEl.pause();
        videoEl.srcObject = null;
        videoEl.load();
      }

      if (this.streamActual) {
        this.streamActual.getTracks().forEach(track => {
          track.stop();
        });

        this.streamActual = null;
      }
    } catch (error) {
      console.error('Error al detener cámara:', error);
    }
  }

  async iniciarLectura() {
    try {
      if (!this.scannerAbierto) return;
      if (!this.videoScanner || !this.videoScanner.nativeElement) return;

      await this.detenerCamaraScanner();

      if (!this.scannerAbierto) return;

      this.codeReader = new BrowserMultiFormatReader();

      this.streamActual = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      const videoEl = this.videoScanner.nativeElement;
      videoEl.srcObject = this.streamActual;
      videoEl.setAttribute('playsinline', 'true');
      videoEl.muted = true;

      await videoEl.play();

      this.codeReader.decodeFromStream(
        this.streamActual,
        videoEl,
        (result: Result | undefined, err: unknown) => {
          if (!this.scannerAbierto || this.cerrandoScanner) return;

          if (result) {
            const codigo = (result.getText() || '').trim();

            if (codigo) {
              this.zone.run(() => {
                this.textoBusqueda = codigo;
                this.aplicarFiltros();
                this.cerrarScanner();
              });
            }
          }
        }
      );
    } catch (error) {
      console.error('Error al abrir cámara o escanear:', error);
      await this.cerrarScanner();
    }
  }
}
