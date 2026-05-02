import { Component, EventEmitter, Output, NgZone, ViewChild, ElementRef, OnInit } from '@angular/core';
import { NavController, ActionSheetController, AlertController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { SupabaseService } from '../../supabase.service';
import { ActivatedRoute } from '@angular/router';
import { MensajeService } from 'src/app/mensaje.service';
import { LoadingService } from 'src/app/services/loading.service';

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

import { BrowserMultiFormatReader } from '@zxing/browser';
import type { Result } from '@zxing/library';

@Component({
  selector: 'app-agregar-producto',
  templateUrl: './agregar-producto.page.html',
  styleUrls: ['./agregar-producto.page.scss'],
})
export class AgregarProductoPage implements OnInit {
  selectedOption: string = '';
  codigo: string = '';
  nombre: string = '';
  precioUnitario: number = 0;
  costoUnitario: number = 0;
  descripcion: string = '';
  imagenUrl: string = '';
  categorias: any[] = [];

  productosBase: any[] = [];
  sugerenciasProductos: any[] = [];
  mostrarSugerenciasProductos: boolean = false;

  stockExhibicion: number = 0;
  stockAlmacenTienda: number = 0;
  stockAlmacenCasa: number = 0;
  stockDanado: number = 0;

  trasladoSeleccionado: string = '';
  cantidadTraslado: number = 0;

  origenDanado: string = '';
  cantidadDanado: number = 0;

  cantidadSalidaProveedor: number = 0;
  destinoCambioProveedor: string = '';
  cantidadCambioProveedor: number = 0;

  isEditMode: boolean = false;
  productoId: number | null = null;

  @Output() emisorMensajes = new EventEmitter<string>();

  scannerAbierto: boolean = false;
  private codeReader: BrowserMultiFormatReader | null = null;
  private streamActual: MediaStream | null = null;

  private imagenNuevaSeleccionada: boolean = false;

  @ViewChild('videoScanner', { static: false }) videoScanner!: ElementRef<HTMLVideoElement>;

  constructor(
    private navCtrl: NavController,
    private actionSheetController: ActionSheetController,
    private alertController: AlertController,
    private http: HttpClient,
    private supabaseService: SupabaseService,
    private route: ActivatedRoute,
    private mensajeService: MensajeService,
    private zone: NgZone,
    private loadingService: LoadingService
  ) {}

  ngOnInit() {
    this.cargarCategorias();
    this.cargarProductosBase();

    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam) {
        this.productoId = Number(idParam);
        this.isEditMode = true;
        this.cargarProducto();
      }
    });
  }

  async cargarCategorias() {
    try {
      this.categorias = await this.supabaseService.obtenerCategorias();
      console.log('Categorias Obtenidas', this.categorias);
    } catch (error) {
      console.error('Error al obtener categorias', error);
    }
  }

  async cargarProductosBase() {
    try {
      this.productosBase = await this.supabaseService.obtenerProductosParaSugerencias();
    } catch (error) {
      console.error('Error al obtener productos para sugerencias', error);
    }
  }

  buscarSugerenciasProducto() {
    if (this.isEditMode) {
      this.mostrarSugerenciasProductos = false;
      this.sugerenciasProductos = [];
      return;
    }

    const texto = (this.nombre || '').trim().toLowerCase();

    if (texto.length < 2) {
      this.mostrarSugerenciasProductos = false;
      this.sugerenciasProductos = [];
      return;
    }

    this.sugerenciasProductos = this.productosBase
      .filter(producto =>
        (producto.nombre || '').toLowerCase().includes(texto) &&
        (producto.nombre || '').toLowerCase() !== texto
      )
      .slice(0, 5);

    this.mostrarSugerenciasProductos = this.sugerenciasProductos.length > 0;
  }

  seleccionarSugerenciaProducto(producto: any) {
    this.precioUnitario = Number(producto.precio || 0);
    this.costoUnitario = Number(producto.costo || 0);
    this.selectedOption = producto.categoria_id ? producto.categoria_id.toString() : '';

    this.mostrarSugerenciasProductos = false;
    this.sugerenciasProductos = [];
  }

  ocultarSugerenciasProducto() {
    setTimeout(() => {
      this.mostrarSugerenciasProductos = false;
    }, 200);
  }

  async cargarProducto() {
    if (this.productoId !== null) {
      const producto = await this.supabaseService.obtenerProductoPorId(this.productoId);

      if (producto) {
        this.codigo = producto.codigo_barras ? producto.codigo_barras.toString() : '';
        this.nombre = producto.nombre || '';
        this.precioUnitario = Number(producto.precio || 0);
        this.costoUnitario = Number(producto.costo || 0);
        this.descripcion = producto.descripcion || '';
        this.selectedOption = producto.categoria_id ? producto.categoria_id.toString() : '';
        this.imagenUrl = producto.imagen || '';
        this.imagenNuevaSeleccionada = false;

        this.stockExhibicion = Number(producto.stock_exhibicion || 0);
        this.stockAlmacenTienda = Number(producto.stock_almacen_tienda || 0);
        this.stockAlmacenCasa = Number(producto.stock_almacen_casa || 0);
        this.stockDanado = Number(producto.stock_danado || 0);
      }
    }
  }

  async agregarProducto() {
    if (!this.codigo || !this.nombre || !this.selectedOption) {
      console.error('Faltan datos obligatorios');
      return;
    }

    let imagenFinal = this.imagenUrl || null;

    if (this.imagenUrl && this.imagenUrl.startsWith('data:image')) {
      const urlSubida = await this.supabaseService.subirImagenProducto(this.imagenUrl, this.nombre);

      if (!urlSubida) {
        console.error('No se pudo subir la imagen del producto');
        return;
      }

      imagenFinal = urlSubida;
    }

    const stockTotal =
      Number(this.stockExhibicion || 0) +
      Number(this.stockAlmacenTienda || 0) +
      Number(this.stockAlmacenCasa || 0);

    const producto = {
      codigo_barras: Number(this.codigo),
      nombre: this.nombre,
      precio: Number(this.precioUnitario),
      costo: Number(this.costoUnitario),
      descripcion: this.descripcion,
      stock: stockTotal,
      categoria_id: Number(this.selectedOption),
      imagen: imagenFinal
    };

    try {
      const data = await this.supabaseService.agregarProducto(producto);

      if (!data || !data[0]) {
        console.error('Supabase no insertó el producto');
        return;
      }

      const productoGuardado = data[0];

      const stockGuardado = await this.supabaseService.guardarStockInicialProducto(
        productoGuardado.producto_id,
        {
          exhibicion: Number(this.stockExhibicion || 0),
          almacen_tienda: Number(this.stockAlmacenTienda || 0),
          almacen_casa: Number(this.stockAlmacenCasa || 0),
          danado: Number(this.stockDanado || 0)
        }
      );

      if (!stockGuardado) {
        console.error('No se pudo guardar el stock por ubicación');
        return;
      }

      this.mensajeService.enviarMensaje('agregado');
      this.navCtrl.back();
    } catch (error) {
      console.error('Error al agregar producto:', error);
    }
  }

  async actualizarProducto() {
    let imagenFinal = this.imagenUrl || '';

    if (this.imagenNuevaSeleccionada && this.imagenUrl && this.imagenUrl.startsWith('data:image')) {
      const urlSubida = await this.supabaseService.subirImagenProducto(this.imagenUrl, this.nombre);

      if (!urlSubida) {
        console.error('No se pudo subir la nueva imagen del producto');
        return;
      }

      imagenFinal = urlSubida;
    }

    const stockTotal =
      Number(this.stockExhibicion || 0) +
      Number(this.stockAlmacenTienda || 0) +
      Number(this.stockAlmacenCasa || 0);

    const producto = {
      producto_id: this.productoId,
      codigo_barras: parseInt(this.codigo, 10),
      nombre: this.nombre,
      precio: Number(this.precioUnitario),
      costo: Number(this.costoUnitario),
      descripcion: this.descripcion,
      stock: stockTotal,
      categoria_id: parseInt(this.selectedOption, 10),
      imagen: imagenFinal
    };

    try {
      const data = await this.supabaseService.actualizarProducto(producto);

      if (!data) {
        console.error('No se pudo actualizar el producto');
        return;
      }

      const stockActualizado = await this.supabaseService.guardarStockCompletoProducto(
        Number(this.productoId),
        {
          exhibicion: Number(this.stockExhibicion || 0),
          almacen_tienda: Number(this.stockAlmacenTienda || 0),
          almacen_casa: Number(this.stockAlmacenCasa || 0),
          danado: Number(this.stockDanado || 0)
        }
      );

      if (!stockActualizado) {
        console.error('No se pudo actualizar el stock por ubicación');
        return;
      }

      this.mensajeService.enviarMensaje('actualizado');
      this.navCtrl.back();
    } catch (error) {
      console.error('Error al actualizar producto:', error);
    }
  }

  async eliminarProducto() {
    if (!this.isEditMode || !this.productoId) {
      console.error('No se puede eliminar un producto que aún no fue guardado');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Eliminar producto',
      message: '¿Deseas eliminar este producto?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          handler: async () => {
            await this.loadingService.mostrarLoading('Eliminando producto...');

            try {
              const eliminado = await this.supabaseService.eliminarProductoLogico(this.productoId!);

              if (!eliminado) {
                console.error('No se pudo eliminar el producto');
                return;
              }

              this.mensajeService.enviarMensaje('eliminado');
              this.navCtrl.back();
            } finally {
              await this.loadingService.cerrarLoading();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async moverStock() {
    if (!this.isEditMode || !this.productoId) {
      console.error('El producto debe estar guardado antes de mover stock');
      return;
    }

    if (!this.trasladoSeleccionado) {
      console.error('Debes seleccionar un tipo de traslado');
      return;
    }

    if (Number(this.cantidadTraslado) <= 0) {
      console.error('La cantidad de traslado debe ser mayor a 0');
      return;
    }

    const origen = this.getOrigenTraslado();
    const destino = this.getDestinoTraslado();

    if (!origen || !destino) {
      console.error('No se pudo determinar el origen y destino del traslado');
      return;
    }

    await this.loadingService.mostrarLoading('Moviendo stock...');

    try {
      const movido = await this.supabaseService.moverStockEntreUbicaciones(
        this.productoId,
        origen,
        destino,
        Number(this.cantidadTraslado)
      );

      if (!movido) {
        console.error('No se pudo mover el stock');
        return;
      }

      this.trasladoSeleccionado = '';
      this.cantidadTraslado = 0;

      await this.cargarProducto();
      this.mensajeService.enviarMensaje('actualizado');
    } finally {
      await this.loadingService.cerrarLoading();
    }
  }

  async registrarDanado() {
    if (!this.isEditMode || !this.productoId) {
      console.error('El producto debe estar guardado antes de registrar dañados');
      return;
    }

    if (!this.origenDanado) {
      console.error('Debes seleccionar el origen del dañado');
      return;
    }

    if (Number(this.cantidadDanado) <= 0) {
      console.error('La cantidad de dañado debe ser mayor a 0');
      return;
    }

    const origen = this.origenDanado as 'exhibicion' | 'almacen_tienda' | 'almacen_casa';

    await this.loadingService.mostrarLoading('Registrando producto dañado...');

    try {
      const registrado = await this.supabaseService.moverStockADanado(
        this.productoId,
        origen,
        Number(this.cantidadDanado)
      );

      if (!registrado) {
        console.error('No se pudo registrar el producto dañado');
        return;
      }

      this.origenDanado = '';
      this.cantidadDanado = 0;

      await this.cargarProducto();
      this.mensajeService.enviarMensaje('actualizado');
    } finally {
      await this.loadingService.cerrarLoading();
    }
  }

  async enviarAProveedor() {
    if (!this.isEditMode || !this.productoId) {
      console.error('El producto debe estar guardado antes de enviar al proveedor');
      return;
    }

    if (Number(this.cantidadSalidaProveedor) <= 0) {
      console.error('La cantidad a enviar al proveedor debe ser mayor a 0');
      return;
    }

    await this.loadingService.mostrarLoading('Enviando a proveedor...');

    try {
      const enviado = await this.supabaseService.enviarDanadoAProveedor(
        this.productoId,
        Number(this.cantidadSalidaProveedor)
      );

      if (!enviado) {
        console.error('No se pudo enviar el producto al proveedor');
        return;
      }

      this.cantidadSalidaProveedor = 0;

      await this.cargarProducto();
      this.mensajeService.enviarMensaje('actualizado');
    } finally {
      await this.loadingService.cerrarLoading();
    }
  }

  async recibirCambioProveedor() {
    if (!this.isEditMode || !this.productoId) {
      console.error('El producto debe estar guardado antes de recibir cambio del proveedor');
      return;
    }

    if (!this.destinoCambioProveedor) {
      console.error('Debes seleccionar el destino del cambio del proveedor');
      return;
    }

    if (Number(this.cantidadCambioProveedor) <= 0) {
      console.error('La cantidad recibida del proveedor debe ser mayor a 0');
      return;
    }

    const destino = this.destinoCambioProveedor as 'exhibicion' | 'almacen_tienda' | 'almacen_casa';

    await this.loadingService.mostrarLoading('Recibiendo cambio del proveedor...');

    try {
      const recibido = await this.supabaseService.recibirCambioProveedor(
        this.productoId,
        destino,
        Number(this.cantidadCambioProveedor)
      );

      if (!recibido) {
        console.error('No se pudo registrar el cambio del proveedor');
        return;
      }

      this.destinoCambioProveedor = '';
      this.cantidadCambioProveedor = 0;

      await this.cargarProducto();
      this.mensajeService.enviarMensaje('actualizado');
    } finally {
      await this.loadingService.cerrarLoading();
    }
  }

  getOrigenTraslado(): 'almacen_casa' | 'almacen_tienda' | null {
    if (this.trasladoSeleccionado === 'casa_a_tienda') {
      return 'almacen_casa';
    }

    if (this.trasladoSeleccionado === 'tienda_a_exhibicion') {
      return 'almacen_tienda';
    }

    return null;
  }

  getDestinoTraslado(): 'almacen_tienda' | 'exhibicion' | null {
    if (this.trasladoSeleccionado === 'casa_a_tienda') {
      return 'almacen_tienda';
    }

    if (this.trasladoSeleccionado === 'tienda_a_exhibicion') {
      return 'exhibicion';
    }

    return null;
  }

  async guardarProducto() {
    await this.loadingService.mostrarLoading(
      this.isEditMode ? 'Actualizando producto...' : 'Guardando producto...'
    );

    try {
      if (this.isEditMode) {
        await this.actualizarProducto();
      } else {
        await this.agregarProducto();
      }
    } finally {
      await this.loadingService.cerrarLoading();
    }
  }

  retroceder() {
    this.navCtrl.back();
  }

  onOptionChange(event: any) {
    this.selectedOption = event.detail.value;
  }

  async tomarFoto() {
    try {
      const image = await Camera.getPhoto({
        quality: 70,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });

      this.imagenUrl = image.dataUrl || '';
      this.imagenNuevaSeleccionada = true;
    } catch (error) {
      console.error('Error al tomar foto:', error);
    }
  }

  async abrirGaleria() {
    try {
      const image = await Camera.getPhoto({
        quality: 70,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos
      });

      this.imagenUrl = image.dataUrl || '';
      this.imagenNuevaSeleccionada = true;
    } catch (error) {
      console.error('Error al abrir galería:', error);
    }
  }

  async showActionSheet() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Seleccionar una opción',
      buttons: [
        {
          text: 'Tomar foto',
          handler: () => {
            this.tomarFoto();
          }
        },
        {
          text: 'Abrir galería',
          handler: () => {
            this.abrirGaleria();
          }
        },
        {
          text: 'Cancelar',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  async abrirScannerCodigo() {
    this.scannerAbierto = true;
  }

  async cerrarScannerCodigo() {
    this.scannerAbierto = false;

    this.codeReader = null;

    if (this.streamActual) {
      this.streamActual.getTracks().forEach(t => t.stop());
      this.streamActual = null;
    }
  }

  async iniciarLecturaCodigo() {
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
            const codigoEscaneado = (result.getText() || '').trim();
            if (codigoEscaneado) {
              this.zone.run(() => {
                this.codigo = codigoEscaneado;
              });

              this.cerrarScannerCodigo();
            }
          }
        }
      );
    } catch (error) {
      console.error('Error al abrir cámara o escanear:', error);
      this.cerrarScannerCodigo();
    }
  }
}
