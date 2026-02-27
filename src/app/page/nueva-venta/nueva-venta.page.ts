import { Component, OnInit, NgZone, ViewChild, ElementRef } from '@angular/core';
import { ActionSheetController, NavController, ModalController } from '@ionic/angular';
import { CuotasModalPage } from '../cuotas-modal/cuotas-modal.page';
import { SupabaseService } from '../../supabase.service';

import { BrowserMultiFormatReader } from '@zxing/browser';
import type { Result } from '@zxing/library';

@Component({
  selector: 'app-nueva-venta',
  templateUrl: './nueva-venta.page.html',
  styleUrls: ['./nueva-venta.page.scss'],
})
export class NuevaVentaPage implements OnInit {

  productos: any[] = [];
  productosFiltrados: any[] = [];
  tipo_de_pago: any[] = [];
  totalProductosSeleccionados: number = 0;
  valorTotalSeleccionado: number = 0;

  // ✅ Scanner
  scannerAbierto: boolean = false;
  private codeReader: BrowserMultiFormatReader | null = null;
  private streamActual: MediaStream | null = null;

  @ViewChild('videoScanner', { static: false }) videoScanner!: ElementRef<HTMLVideoElement>;

  constructor(
    private actionSheetCtrl: ActionSheetController,
    private navCtrl: NavController,
    private modalCtrl: ModalController,
    private supabaseService: SupabaseService,
    private zone: NgZone
  ) {}

  productosCargando: boolean = false;
  tiposDePagoCargando: boolean = false;

  ngOnInit() {
    setTimeout(() => {
      this.cargarProductos();
    }, 0);

    setTimeout(() => {
      this.cargarTiposDePago();
    }, 100);
  }

  async cargarProductos() {
    try {
      this.productos = await this.supabaseService.obtenerProductos();
      this.productosFiltrados = this.productos.map((producto) => ({
        ...producto,
        cantidadSeleccionada: 0,
        disponibles: typeof producto.stock === 'number' ? producto.stock : 0,
        precio: typeof producto.precio === 'number' ? producto.precio : 0,
      }));
      console.log(this.productosFiltrados);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  }

  async cargarTiposDePago() {
    try {
      this.tipo_de_pago = await this.supabaseService.obtenerTiposDePago();
    } catch (error) {
      console.error('Error al cargar tipos de pago:', error);
    }
  }

  // Buscar productos por nombre o código
  buscarProductos(event: any) {
    const searchTerm = event.target.value.toLowerCase();
    if (!searchTerm) {
      this.cargarProductos();
    } else {
      this.productosFiltrados = this.productosFiltrados.filter(function(producto) {
        const nombre = producto.nombre.toLowerCase();
        const codigoBarras = producto.codigo_barras ? producto.codigo_barras.toString().toLowerCase() : '';
        return nombre.includes(searchTerm) || codigoBarras.includes(searchTerm);
      });
    }
  }

  // =========================
  // ✅ SCANNER (WEB)
  // =========================

  async abrirScanner() {
    this.scannerAbierto = true;

    setTimeout(() => {
      this.iniciarLectura();
    }, 300);
  }

  async cerrarScanner() {
    this.scannerAbierto = false;

    // ✅ No usamos stopContinuousDecode (no existe en tu versión)
    this.codeReader = null;

    // Detener cámara
    if (this.streamActual) {
      this.streamActual.getTracks().forEach(t => t.stop());
      this.streamActual = null;
    }
  }

  async iniciarLectura() {
    try {
      if (!this.videoScanner || !this.videoScanner.nativeElement) return;

      this.codeReader = new BrowserMultiFormatReader();

      // Pedir cámara trasera
      this.streamActual = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });

      const videoEl = this.videoScanner.nativeElement;
      videoEl.srcObject = this.streamActual;

      // Leer desde stream (compatible)
      this.codeReader.decodeFromStream(
        this.streamActual,
        videoEl,
        (result: Result | undefined, err: unknown) => {
          if (result) {
            const codigo = (result.getText() || '').trim();
            if (codigo) {
              this.buscarProductos({ target: { value: codigo } });
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

  // =========================
  // FIN SCANNER
  // =========================

  aumentarCantidad(producto: any) {
    const index = this.productos.findIndex(p => p.producto_id === producto.producto_id);
    if (producto.cantidadSeleccionada < producto.disponibles) {
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
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Selecciona el método de pago',
      buttons: [
        { text: 'Efectivo', handler: () => { this.goToCarrito('Efectivo', productosSeleccionados); } },
        { text: 'Transferencia Bancaria', handler: () => { this.goToCarrito('Transferencia Bancaria', productosSeleccionados); } },
        { text: 'Tarjeta', handler: () => { this.goToCarrito('Tarjeta', productosSeleccionados); } },
        { text: 'Cuotas', handler: () => { this.presentCuotasModal(); } },
        { text: 'Cancelar', role: 'cancel' }
      ]
    });
    console.log("Aqui llamare a la funcion que muestra el carrito");
    await actionSheet.present();
  }

  async presentCuotasModal() {
    const modal = await this.modalCtrl.create({
      component: CuotasModalPage,
      componentProps: {}
    });

    modal.onDidDismiss().then((data) => {
      if (data.data && data.data.confirmed) {
        const productosSeleccionados = this.productos.filter(producto => producto.cantidadSeleccionada > 0);
        this.goToCarrito('Cuotas', productosSeleccionados, data.data);
      }
    });

    await modal.present();
  }

  goToCarrito(metodoPago: string, productosSeleccionados: any[], cuotaData?: any) {
    this.navCtrl.navigateForward('/preview', {
      queryParams: {
        metodoPago: metodoPago,
        productos: JSON.stringify(productosSeleccionados),
        totalVenta: this.valorTotalSeleccionado,
        ...cuotaData
      }
    });
  }
}