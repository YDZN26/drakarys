import { Component, OnInit, OnDestroy, NgZone, ViewChild, ElementRef, HostListener } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, Platform } from '@ionic/angular';
import { SupabaseService } from '../../supabase.service';
import { MensajeService } from 'src/app/mensaje.service';
import { Subscription } from 'rxjs';

import { BrowserMultiFormatReader } from '@zxing/browser';
import type { Result } from '@zxing/library';

@Component({
  selector: 'app-nueva-venta',
  templateUrl: './nueva-venta.page.html',
  styleUrls: ['./nueva-venta.page.scss'],
})
export class NuevaVentaPage implements OnInit, OnDestroy {

  productos: any[] = [];
  productosFiltrados: any[] = [];
  categorias: any[] = [];

  totalProductosSeleccionados: number = 0;
  valorTotalSeleccionado: number = 0;

  textoBusqueda: string = '';
  categoriaSeleccionada: number | null = null;

  scannerAbierto: boolean = false;
  private codeReader: BrowserMultiFormatReader | null = null;
  private streamActual: MediaStream | null = null;
  private mensajeSub!: Subscription;
  private backButtonSub: any;
  private cerrandoScanner: boolean = false;

  productosCargando: boolean = false;

  modoEditar: boolean = false;
  ventaIdEditar: number = 0;
  detallesVentaEditar: any[] = [];
  productosRecibidosPreview: any[] = [];

  @ViewChild('videoScanner', { static: false }) videoScanner!: ElementRef<HTMLVideoElement>;

  constructor(
    private navCtrl: NavController,
    private platform: Platform,
    private supabaseService: SupabaseService,
    private mensajeService: MensajeService,
    private zone: NgZone,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.mensajeSub = this.mensajeService.mensaje$.subscribe((mensaje: string) => {
      if (mensaje === 'actualizar inventario') {
        this.cargarProductos();
      }
    });

    this.backButtonSub = this.platform.backButton.subscribeWithPriority(99999, () => {
      if (this.scannerAbierto) {
        this.zone.run(() => {
          this.cerrarScanner();
        });
        return;
      }
    });
  }

  ionViewWillEnter() {
    const ventaIdParam = this.route.snapshot.queryParamMap.get('ventaId');
    const modoParam = this.route.snapshot.queryParamMap.get('modo');
    const productosParam = this.route.snapshot.queryParamMap.get('productos');

    this.modoEditar = false;
    this.ventaIdEditar = 0;
    this.detallesVentaEditar = [];
    this.productosRecibidosPreview = [];

    if (ventaIdParam && modoParam === 'editar') {
      this.modoEditar = true;
      this.ventaIdEditar = Number(ventaIdParam);
    }

    if (productosParam) {
      this.productosRecibidosPreview = JSON.parse(productosParam);
    }

    this.cargarProductos();
    this.cargarCategorias();
  }

  async ionViewWillLeave() {
    await this.detenerCamaraScanner();
    this.scannerAbierto = false;
    this.cerrandoScanner = false;
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

  @HostListener('window:popstate', ['$event'])
  controlarBackDelSistema(event: any) {
    if (this.scannerAbierto) {
      history.pushState(null, '', window.location.href);

      this.zone.run(() => {
        this.cerrarScanner();
      });

      return;
    }
  }

  async cargarCategorias() {
    try {
      this.categorias = await this.supabaseService.obtenerCategorias();
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  }

  async cargarProductos() {
    try {
      const data = await this.supabaseService.obtenerProductos();

      if (this.modoEditar && this.ventaIdEditar > 0) {
        this.detallesVentaEditar = await this.supabaseService.obtenerVentaDetalles(this.ventaIdEditar);
      }

      this.productos = (data || []).map((producto: any) => {
        const detalleEncontrado = this.detallesVentaEditar.find((detalle: any) => {
          return Number(detalle.producto_id) === Number(producto.producto_id);
        });

        const productoRecibido = this.productosRecibidosPreview.find((productoPreview: any) => {
          return Number(productoPreview.producto_id) === Number(producto.producto_id);
        });

        const cantidadVendida = detalleEncontrado ? Number(detalleEncontrado.cantidad || 0) : 0;
        const cantidadRecibida = productoRecibido ? Number(productoRecibido.cantidadSeleccionada || 0) : 0;
        const stockExhibicion = Number(producto.stock_exhibicion || 0);

        return {
          ...producto,
          cantidadSeleccionada: productoRecibido ? cantidadRecibida : cantidadVendida,
          disponibles: this.modoEditar ? stockExhibicion + cantidadVendida : stockExhibicion,
          precio: productoRecibido ? Number(productoRecibido.precio || 0) : Number(producto.precio || 0),
        };
      });

      this.actualizarTotales();
      this.aplicarFiltros();

    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  }

  filtrarPorCategoria(categoriaId: number | null) {
    this.categoriaSeleccionada = categoriaId;
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    let lista = [...this.productos];

    if (this.categoriaSeleccionada !== null) {
      lista = lista.filter((producto: any) => {
        return Number(producto.categoria_id) === Number(this.categoriaSeleccionada);
      });
    }

    const palabrasBusqueda = this.normalizarTexto(this.textoBusqueda)
      .split(' ')
      .filter((palabra: string) => palabra.trim() !== '');

    if (palabrasBusqueda.length > 0) {
      lista = lista.filter((producto: any) => {
        return this.productoCoincideBusqueda(producto, palabrasBusqueda);
      });
    }

    this.productosFiltrados = lista;
  }

  buscarProductos(event: any) {
    this.textoBusqueda = (event?.target?.value || '').toString();
    this.aplicarFiltros();
  }

  normalizarTexto(texto: any): string {
    return (texto || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  productoCoincideBusqueda(producto: any, palabrasBusqueda: string[]): boolean {
    const categoriaEncontrada = this.categorias.find((cat: any) => {
      return Number(cat.categoria_id) === Number(producto.categoria_id);
    });

    const textoProducto = this.normalizarTexto(`
      ${producto.nombre || ''}
      ${producto.codigo_barras || ''}
      ${producto.descripcion || ''}
      ${categoriaEncontrada?.nombre || ''}
    `);

    return palabrasBusqueda.every((palabra: string) => {
      return textoProducto.includes(palabra);
    });
  }

  obtenerDisponibles(producto: any): number {
    const disponibles = Number(producto.disponibles || 0);
    const cantidadSeleccionada = Number(producto.cantidadSeleccionada || 0);
    const restante = disponibles - cantidadSeleccionada;

    return restante < 0 ? 0 : restante;
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

  aumentarCantidad(producto: any) {
    const index = this.productos.findIndex(p => p.producto_id === producto.producto_id);

    if (this.obtenerDisponibles(producto) > 0) {
      producto.cantidadSeleccionada++;

      if (index !== -1) {
        this.productos[index].cantidadSeleccionada = producto.cantidadSeleccionada;
      }

      this.actualizarTotales();
    }
  }

  disminuirCantidad(producto: any) {
    const index = this.productos.findIndex(p => p.producto_id === producto.producto_id);

    if (producto.cantidadSeleccionada > 0) {
      producto.cantidadSeleccionada--;

      if (index !== -1) {
        this.productos[index].cantidadSeleccionada = producto.cantidadSeleccionada;
      }

      this.actualizarTotales();
    }
  }

  actualizarTotales() {
    this.zone.run(() => {
      this.totalProductosSeleccionados = this.productos.reduce((total, producto) => {
        const seleccionados = producto.cantidadSeleccionada || 0;
        return total + seleccionados;
      }, 0);

      this.valorTotalSeleccionado = this.productos.reduce((total, producto) => {
        const seleccionados = producto.cantidadSeleccionada || 0;
        const precio = producto.precio || 0;
        return total + seleccionados * precio;
      }, 0);
    });
  }

  async agregarVenta() {
    const productosSeleccionados = this.productos.filter(producto => producto.cantidadSeleccionada > 0);

    if (productosSeleccionados.length === 0) {
      return;
    }

    if (this.modoEditar) {
      this.navCtrl.navigateForward('/preview', {
        queryParams: {
          productos: JSON.stringify(productosSeleccionados),
          totalVenta: this.valorTotalSeleccionado,
          ventaId: this.ventaIdEditar,
          modo: 'editar'
        }
      });
      return;
    }

    this.navCtrl.navigateForward('/preview', {
      queryParams: {
        productos: JSON.stringify(productosSeleccionados),
        totalVenta: this.valorTotalSeleccionado
      }
    });
  }
}
