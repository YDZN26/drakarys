import { Component, OnInit, NgZone, ViewChild, ElementRef } from '@angular/core';
import { NavController } from '@ionic/angular';
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
export class InventarioPage implements OnInit {
  productos: any[] = [];
  productosFiltrados: any[] = []; // ✅ (AUMENTADO)
  categorias: any[] = [];
  categoriaSeleccionada: number | null = null;
  textoBusqueda: string = '';
  mensaje: string = '';
  private mensajeSub!: Subscription;

  // ✅ (AUMENTADO) Scanner
  scannerAbierto: boolean = false;
  private codeReader: BrowserMultiFormatReader | null = null;
  private streamActual: MediaStream | null = null;

  @ViewChild('videoScanner', { static: false }) videoScanner!: ElementRef<HTMLVideoElement>;

  constructor(
    private navCtrl: NavController,
    private supabaseService: SupabaseService,
    private mensajeService: MensajeService,
    private zone: NgZone
  ) { }

  ngOnInit() {
    this.cargarProductos();
    this.cargarCategorias();
    this.mensajeSub = this.mensajeService.mensaje$.subscribe((mensaje: string) => {
      if (mensaje) {
        console.log('Mensaje recibido:', mensaje);
        this.mensaje = mensaje;
        this.cargarProductos(this.categoriaSeleccionada);
      }
    });
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
      this.productos = categoriaId
        ? todos.filter(p => p.categoria_id === categoriaId)
        : todos;

      // ✅ (AUMENTADO) lista visible
      this.productosFiltrados = this.productos;

      // ✅ (AUMENTADO) si ya había texto, re-filtrar
      if (this.textoBusqueda && this.textoBusqueda.trim().length > 0) {
        this.buscarProductos({ target: { value: this.textoBusqueda } });
      }

    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  }

  filtrarPorCategoria(categoriaId: number | null) {
    this.categoriaSeleccionada = categoriaId;
    this.cargarProductos(categoriaId);
  }

  // ✅ (AUMENTADO) buscar por nombre o código de barras
  buscarProductos(event: any) {
    const searchTerm = (event?.target?.value || '').toString().toLowerCase().trim();
    this.textoBusqueda = event?.target?.value || '';

    if (!searchTerm) {
      this.productosFiltrados = this.productos;
      return;
    }

    this.productosFiltrados = this.productos.filter((producto: any) => {
      const nombre = (producto.nombre || '').toString().toLowerCase();
      const codigoBarras = producto.codigo_barras ? producto.codigo_barras.toString().toLowerCase() : '';
      return nombre.includes(searchTerm) || codigoBarras.includes(searchTerm);
    });
  }

  agregarNuevoProducto() {
    this.navCtrl.navigateForward('/agregar-producto');
  }

  verDetalleProducto(producto: any) {
    console.log('Detalle del producto:', producto);
    this.navCtrl.navigateForward(`/agregar-producto/${producto.producto_id}`);
  }

  calcularValorTotal(): number {
    return this.productos.reduce((total, p) => {
      const precio = p.precio || 0;
      const stock = p.stock || 0;
      return total + precio * stock;
    }, 0);
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

      try { await videoEl.play(); } catch (e) {}

      this.codeReader.decodeFromStream(
        this.streamActual,
        videoEl,
        (result: Result | undefined, err: unknown) => {
          if (result) {
            const codigo = (result.getText() || '').trim();
            if (codigo) {
              this.zone.run(() => {
                this.textoBusqueda = codigo;
                this.buscarProductos({ target: { value: codigo } });
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

}