import { Component, OnInit, OnDestroy, NgZone, ViewChild, ElementRef } from '@angular/core';
import { NavController } from '@ionic/angular';
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

  @ViewChild('videoScanner', { static: false }) videoScanner!: ElementRef<HTMLVideoElement>;

  constructor(
    private navCtrl: NavController,
    private supabaseService: SupabaseService,
    private mensajeService: MensajeService,
    private zone: NgZone
  ) {}

  productosCargando: boolean = false;

  ngOnInit() {
    setTimeout(() => {
      this.cargarProductos();
    }, 0);

    setTimeout(() => {
      this.cargarCategorias();
    }, 0);

    this.mensajeSub = this.mensajeService.mensaje$.subscribe((mensaje: string) => {
      if (mensaje === 'actualizar inventario') {
        this.cargarProductos();
      }
    });
  }

  ionViewWillEnter() {
    this.cargarProductos();
  }

  ngOnDestroy() {
    if (this.mensajeSub) {
      this.mensajeSub.unsubscribe();
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

      this.productos = (data || []).map((producto: any) => ({
        ...producto,
        cantidadSeleccionada: 0,
        disponibles: typeof producto.stock === 'number' ? producto.stock : 0,
        precio: typeof producto.precio === 'number' ? producto.precio : 0,
      }));

      this.actualizarTotales();
      this.aplicarFiltros();

      console.log(this.productosFiltrados);
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
      lista = lista.filter((producto: any) => producto.categoria_id === this.categoriaSeleccionada);
    }

    const searchTerm = (this.textoBusqueda || '').toString().toLowerCase().trim();

    if (searchTerm) {
      lista = lista.filter((producto: any) => {
        const nombre = (producto.nombre || '').toString().toLowerCase();
        const codigoBarras = producto.codigo_barras
          ? producto.codigo_barras.toString().toLowerCase()
          : '';
        return nombre.includes(searchTerm) || codigoBarras.includes(searchTerm);
      });
    }

    this.productosFiltrados = lista;
  }

  buscarProductos(event: any) {
    this.textoBusqueda = (event?.target?.value || '').toString();
    this.aplicarFiltros();
  }

  obtenerDisponibles(producto: any): number {
    const disponibles = Number(producto.disponibles || 0);
    const cantidadSeleccionada = Number(producto.cantidadSeleccionada || 0);
    const restante = disponibles - cantidadSeleccionada;
    return restante < 0 ? 0 : restante;
  }

  async abrirScanner() {
    this.scannerAbierto = true;
  }

  async cerrarScanner() {
    this.scannerAbierto = false;
    this.codeReader = null;

    if (this.streamActual) {
      this.streamActual.getTracks().forEach(t => t.stop());
      this.streamActual = null;
    }
  }

  async iniciarLectura() {
    try {
      if (!this.videoScanner || !this.videoScanner.nativeElement) return;

      this.codeReader = new BrowserMultiFormatReader();

      this.streamActual = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });

      const videoEl = this.videoScanner.nativeElement;
      videoEl.srcObject = this.streamActual;

      try {
        await videoEl.play();
      } catch (e) {}

      this.codeReader.decodeFromStream(
        this.streamActual,
        videoEl,
        (result: Result | undefined, err: unknown) => {
          if (result) {
            const codigo = (result.getText() || '').trim();
            if (codigo) {
              this.zone.run(() => {
                this.textoBusqueda = codigo;
                this.aplicarFiltros();
              });

              this.cerrarScanner();
            }
          }
        }
      );
    } catch (error) {
      console.error('Error al abrir cámara o escanear:', error);
      this.cerrarScanner();
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

      console.log('Total productos seleccionados:', this.totalProductosSeleccionados);
      console.log('Valor total:', this.valorTotalSeleccionado);
    });
  }

  async agregarVenta() {
    const productosSeleccionados = this.productos.filter(producto => producto.cantidadSeleccionada > 0);

    if (productosSeleccionados.length === 0) {
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