import { Component, EventEmitter, Output, NgZone, ViewChild, ElementRef, OnInit, OnDestroy, HostListener } from '@angular/core';
import { NavController, ActionSheetController, AlertController, Platform } from '@ionic/angular';
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
export class AgregarProductoPage implements OnInit, OnDestroy {
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

  mostrarModalSalir: boolean = false;
  salidaConfirmada: boolean = false;
  formularioGuardado: boolean = false;

  mostrarModalCategorias: boolean = false;
  mostrarModalTraslado: boolean = false;
  mostrarModalOrigenDanado: boolean = false;
  mostrarModalDestinoCambio: boolean = false;

  mostrarModalMensaje: boolean = false;
  tituloModalMensaje: string = '';
  textoModalMensaje: string = '';
  tipoModalMensaje: string = 'info';
  iconoModalMensaje: string = 'information-circle-outline';
  textoBotonModalMensaje: string = 'Entendido';
  modalMensajeEsConfirmacion: boolean = false;

  private resolverModalMensaje: ((valor: boolean) => void) | null = null;

  private codeReader: BrowserMultiFormatReader | null = null;
  private streamActual: MediaStream | null = null;

  private imagenNuevaSeleccionada: boolean = false;
  private imagenAnteriorUrl: string = '';
  private snapshotFormulario: string = '';
  private backButtonSub: any;
  private cerrandoScanner: boolean = false;
  private historialProtegidoCreado: boolean = false;

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
    private loadingService: LoadingService,
    private platform: Platform
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
      } else {
        this.guardarSnapshotFormulario();
      }
    });

    if (!this.historialProtegidoCreado) {
      history.pushState(null, '', window.location.href);
      this.historialProtegidoCreado = true;
    }

    this.backButtonSub = this.platform.backButton.subscribeWithPriority(99999, () => {
      if (this.scannerAbierto) {
        this.cerrarScannerCodigo();
        return;
      }

      if (this.mostrarModalSalir || this.mostrarModalMensaje) {
        return;
      }

      this.intentarSalirDesdeSistema();
    });
  }

  ngOnDestroy() {
    this.detenerCamaraScanner();

    if (this.backButtonSub) {
      this.backButtonSub.unsubscribe();
    }
  }

  ionViewWillLeave() {
    this.detenerCamaraScanner();
  }

  @HostListener('window:popstate', ['$event'])
  controlarBackDelSistema(event: any) {
    if (this.salidaConfirmada || this.formularioGuardado) {
      return;
    }

    history.pushState(null, '', window.location.href);

    if (this.scannerAbierto) {
      this.cerrarScannerCodigo();
      return;
    }

    if (this.mostrarModalSalir || this.mostrarModalMensaje) {
      return;
    }

    this.intentarSalirDesdeSistema();
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
        this.imagenAnteriorUrl = producto.imagen || '';
        this.imagenNuevaSeleccionada = false;

        this.stockExhibicion = Number(producto.stock_exhibicion || 0);
        this.stockAlmacenTienda = Number(producto.stock_almacen_tienda || 0);
        this.stockAlmacenCasa = Number(producto.stock_almacen_casa || 0);
        this.stockDanado = Number(producto.stock_danado || 0);

        this.guardarSnapshotFormulario();
      }
    }
  }

  guardarSnapshotFormulario() {
    this.snapshotFormulario = JSON.stringify(this.obtenerDatosFormulario());
  }

  obtenerDatosFormulario() {
    return {
      selectedOption: this.selectedOption || '',
      codigo: this.codigo || '',
      nombre: this.nombre || '',
      precioUnitario: Number(this.precioUnitario || 0),
      costoUnitario: Number(this.costoUnitario || 0),
      descripcion: this.descripcion || '',
      imagenUrl: this.imagenUrl || '',
      stockExhibicion: Number(this.stockExhibicion || 0),
      stockAlmacenTienda: Number(this.stockAlmacenTienda || 0),
      stockAlmacenCasa: Number(this.stockAlmacenCasa || 0),
      stockDanado: Number(this.stockDanado || 0),
      trasladoSeleccionado: this.trasladoSeleccionado || '',
      cantidadTraslado: Number(this.cantidadTraslado || 0),
      origenDanado: this.origenDanado || '',
      cantidadDanado: Number(this.cantidadDanado || 0),
      cantidadSalidaProveedor: Number(this.cantidadSalidaProveedor || 0),
      destinoCambioProveedor: this.destinoCambioProveedor || '',
      cantidadCambioProveedor: Number(this.cantidadCambioProveedor || 0)
    };
  }

  formularioTieneCambios(): boolean {
    const datosActuales = JSON.stringify(this.obtenerDatosFormulario());
    return datosActuales !== this.snapshotFormulario;
  }

  intentarSalir() {
    if (this.scannerAbierto) {
      this.cerrarScannerCodigo();
      return;
    }

    if (this.formularioGuardado || this.salidaConfirmada || !this.formularioTieneCambios()) {
      this.volverPaginaAnterior();
      return;
    }

    this.mostrarModalSalir = true;
  }

  intentarSalirDesdeSistema() {
    if (this.scannerAbierto) {
      this.cerrarScannerCodigo();
      return;
    }

    if (this.formularioGuardado || this.salidaConfirmada || !this.formularioTieneCambios()) {
      this.volverPaginaAnterior();
      return;
    }

    this.mostrarModalSalir = true;
  }

  volverPaginaAnterior() {
    this.salidaConfirmada = true;

    if (this.historialProtegidoCreado && window.history.length > 1) {
      this.historialProtegidoCreado = false;
      window.history.go(-2);
      return;
    }

    this.navCtrl.back();
  }

  cancelarSalida() {
    this.mostrarModalSalir = false;
  }

  salirSinGuardar() {
    this.mostrarModalSalir = false;

    setTimeout(() => {
      this.volverPaginaAnterior();
    }, 100);
  }

  abrirModalCategorias() {
    this.mostrarModalCategorias = true;
  }

  cerrarModalCategorias() {
    this.mostrarModalCategorias = false;
  }

  seleccionarCategoria(categoria: any) {
    this.selectedOption = categoria.categoria_id.toString();
    this.mostrarModalCategorias = false;
  }

  obtenerNombreCategoriaSeleccionada(): string {
    const categoria = this.categorias.find(
      item => item.categoria_id.toString() === this.selectedOption
    );

    return categoria ? categoria.nombre : '';
  }

  abrirModalTraslado() {
    this.mostrarModalTraslado = true;
  }

  cerrarModalTraslado() {
    this.mostrarModalTraslado = false;
  }

  seleccionarTraslado(traslado: string) {
    this.trasladoSeleccionado = traslado;
    this.mostrarModalTraslado = false;
  }

  obtenerNombreTrasladoSeleccionado(): string {
    if (this.trasladoSeleccionado === 'casa_a_tienda') {
      return 'Almacén casa → Almacén tienda';
    }

    if (this.trasladoSeleccionado === 'tienda_a_exhibicion') {
      return 'Almacén tienda → Exhibición';
    }

    return '';
  }

  abrirModalOrigenDanado() {
    this.mostrarModalOrigenDanado = true;
  }

  cerrarModalOrigenDanado() {
    this.mostrarModalOrigenDanado = false;
  }

  seleccionarOrigenDanado(origen: string) {
    this.origenDanado = origen;
    this.mostrarModalOrigenDanado = false;
  }

  abrirModalDestinoCambio() {
    this.mostrarModalDestinoCambio = true;
  }

  cerrarModalDestinoCambio() {
    this.mostrarModalDestinoCambio = false;
  }

  seleccionarDestinoCambio(destino: string) {
    this.destinoCambioProveedor = destino;
    this.mostrarModalDestinoCambio = false;
  }

  obtenerNombreUbicacion(ubicacion: string): string {
    if (ubicacion === 'exhibicion') {
      return 'Exhibición';
    }

    if (ubicacion === 'almacen_tienda') {
      return 'Almacén tienda';
    }

    if (ubicacion === 'almacen_casa') {
      return 'Almacén casa';
    }

    return '';
  }

  async mostrarMensajeInformativo(
    titulo: string,
    mensaje: string,
    tipo: 'info' | 'exito' | 'error' | 'advertencia' = 'info'
  ): Promise<void> {
    await this.mostrarModalMensajePersonalizado(
      titulo,
      mensaje,
      tipo,
      false,
      'Entendido'
    );
  }

  async mostrarMensajeConfirmacion(
    titulo: string,
    mensaje: string,
    tipo: 'info' | 'exito' | 'error' | 'advertencia' = 'advertencia',
    textoConfirmar: string = 'Confirmar'
  ): Promise<boolean> {
    return await this.mostrarModalMensajePersonalizado(
      titulo,
      mensaje,
      tipo,
      true,
      textoConfirmar
    );
  }

  async mostrarModalMensajePersonalizado(
    titulo: string,
    mensaje: string,
    tipo: 'info' | 'exito' | 'error' | 'advertencia',
    esConfirmacion: boolean,
    textoBoton: string
  ): Promise<boolean> {
    this.tituloModalMensaje = titulo;
    this.textoModalMensaje = mensaje;
    this.tipoModalMensaje = tipo;
    this.modalMensajeEsConfirmacion = esConfirmacion;
    this.textoBotonModalMensaje = textoBoton;
    this.iconoModalMensaje = this.obtenerIconoModalMensaje(tipo);

    this.mostrarModalMensaje = true;

    return new Promise(resolve => {
      this.resolverModalMensaje = resolve;
    });
  }

  cerrarModalMensaje(valor: boolean) {
    this.mostrarModalMensaje = false;

    if (this.resolverModalMensaje) {
      this.resolverModalMensaje(valor);
      this.resolverModalMensaje = null;
    }
  }

  obtenerIconoModalMensaje(tipo: string): string {
    if (tipo === 'exito') {
      return 'checkmark-circle-outline';
    }

    if (tipo === 'error') {
      return 'close-circle-outline';
    }

    if (tipo === 'advertencia') {
      return 'warning-outline';
    }

    return 'information-circle-outline';
  }

  async validarFormularioProducto(): Promise<boolean> {
    const codigoLimpio = (this.codigo || '').toString().trim();
    const nombreLimpio = (this.nombre || '').toString().trim();

    if (!codigoLimpio) {
      await this.mostrarMensajeInformativo(
        'Código obligatorio',
        'Debes ingresar o escanear el código de barras del producto.',
        'advertencia'
      );
      return false;
    }

    if (isNaN(Number(codigoLimpio)) || Number(codigoLimpio) <= 0) {
      await this.mostrarMensajeInformativo(
        'Código inválido',
        'El código de barras debe ser un número válido.',
        'advertencia'
      );
      return false;
    }

    if (!nombreLimpio) {
      await this.mostrarMensajeInformativo(
        'Nombre obligatorio',
        'Debes ingresar el nombre del producto.',
        'advertencia'
      );
      return false;
    }

    if (!this.selectedOption) {
      await this.mostrarMensajeInformativo(
        'Categoría obligatoria',
        'Debes seleccionar una categoría para el producto.',
        'advertencia'
      );
      return false;
    }

    if (Number(this.precioUnitario || 0) <= 0) {
      await this.mostrarMensajeInformativo(
        'Precio inválido',
        'El precio unitario debe ser mayor a 0.',
        'advertencia'
      );
      return false;
    }

    if (Number(this.costoUnitario || 0) < 0) {
      await this.mostrarMensajeInformativo(
        'Costo inválido',
        'El costo unitario no puede ser negativo.',
        'advertencia'
      );
      return false;
    }

    if (
      Number(this.stockExhibicion || 0) < 0 ||
      Number(this.stockAlmacenTienda || 0) < 0 ||
      Number(this.stockAlmacenCasa || 0) < 0 ||
      Number(this.stockDanado || 0) < 0
    ) {
      await this.mostrarMensajeInformativo(
        'Stock inválido',
        'Los valores de stock no pueden ser negativos.',
        'advertencia'
      );
      return false;
    }

    this.codigo = codigoLimpio;
    this.nombre = nombreLimpio;

    return true;
  }

  async validarCodigoBarrasDisponible(): Promise<boolean> {
    const codigoNumero = Number(this.codigo);

    const productoEncontrado = await this.supabaseService.obtenerProductoPorCodigoBarras(codigoNumero);

    if (!productoEncontrado) {
      return true;
    }

    if (
      this.isEditMode &&
      this.productoId &&
      Number(productoEncontrado.producto_id) === Number(this.productoId)
    ) {
      return true;
    }

    await this.mostrarMensajeInformativo(
      'Código duplicado',
      `El código de barras ya está registrado en el producto: ${productoEncontrado.nombre}.`,
      'advertencia'
    );

    return false;
  }

  async confirmarCostoMayorPrecio(): Promise<boolean> {
    const precio = Number(this.precioUnitario || 0);
    const costo = Number(this.costoUnitario || 0);

    if (costo <= precio) {
      return true;
    }

    return await this.mostrarMensajeConfirmacion(
      'Revisar precio',
      'El costo unitario es mayor al precio de venta. Esto puede generar pérdida. ¿Deseas guardar de todas formas?',
      'advertencia',
      'Guardar'
    );
  }

  async agregarProducto() {
    if (!this.codigo || !this.nombre || !this.selectedOption) {
      await this.mostrarMensajeInformativo(
        'Datos incompletos',
        'Revisa que el código, nombre y categoría estén completos.',
        'advertencia'
      );
      return;
    }

    let imagenFinal = this.imagenUrl || null;
    let imagenSubidaNueva: string | null = null;

    if (this.imagenUrl && this.imagenUrl.startsWith('data:image')) {
      const urlSubida = await this.supabaseService.subirImagenProducto(this.imagenUrl, this.nombre);

      if (!urlSubida) {
        await this.mostrarMensajeInformativo(
          'Imagen no guardada',
          'No se pudo optimizar y subir la imagen del producto.',
          'error'
        );
        return;
      }

      imagenFinal = urlSubida;
      imagenSubidaNueva = urlSubida;
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

    let productoGuardado: any = null;

    try {
      const data = await this.supabaseService.agregarProducto(producto);

      if (!data || !data[0]) {
        if (imagenSubidaNueva) {
          await this.supabaseService.eliminarImagenProductoPorUrl(imagenSubidaNueva);
        }

        await this.mostrarMensajeInformativo(
          'Producto no guardado',
          'No se pudo guardar el producto.',
          'error'
        );
        return;
      }

      productoGuardado = data[0];

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
        if (productoGuardado?.producto_id) {
          await this.supabaseService.eliminarProductoLogico(productoGuardado.producto_id);
        }

        if (imagenSubidaNueva) {
          await this.supabaseService.eliminarImagenProductoPorUrl(imagenSubidaNueva);
        }

        await this.mostrarMensajeInformativo(
          'Stock no guardado',
          'No se pudo guardar el stock por ubicación. El producto no fue completado.',
          'error'
        );
        return;
      }

      this.formularioGuardado = true;
      this.guardarSnapshotFormulario();
      this.mensajeService.enviarMensaje('agregado');
      this.volverPaginaAnterior();
    } catch (error) {
      console.error('Error al agregar producto:', error);

      if (productoGuardado?.producto_id) {
        await this.supabaseService.eliminarProductoLogico(productoGuardado.producto_id);
      }

      if (imagenSubidaNueva) {
        await this.supabaseService.eliminarImagenProductoPorUrl(imagenSubidaNueva);
      }

      await this.mostrarMensajeInformativo(
        'Error al guardar',
        'Ocurrió un error al agregar el producto.',
        'error'
      );
    }
  }

  async actualizarProducto() {
    const imagenAnterior = this.imagenAnteriorUrl || '';
    let imagenFinal = this.imagenUrl || '';
    let imagenSubidaNueva: string | null = null;

    if (this.imagenNuevaSeleccionada && this.imagenUrl && this.imagenUrl.startsWith('data:image')) {
      const urlSubida = await this.supabaseService.subirImagenProducto(this.imagenUrl, this.nombre);

      if (!urlSubida) {
        await this.mostrarMensajeInformativo(
          'Imagen no guardada',
          'No se pudo optimizar y subir la nueva imagen del producto.',
          'error'
        );
        return;
      }

      imagenFinal = urlSubida;
      imagenSubidaNueva = urlSubida;
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
        if (imagenSubidaNueva) {
          await this.supabaseService.eliminarImagenProductoPorUrl(imagenSubidaNueva);
        }

        await this.mostrarMensajeInformativo(
          'Producto no actualizado',
          'No se pudo actualizar el producto.',
          'error'
        );
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
        if (imagenSubidaNueva) {
          await this.supabaseService.actualizarProducto({
            ...producto,
            imagen: imagenAnterior
          });

          await this.supabaseService.eliminarImagenProductoPorUrl(imagenSubidaNueva);
        }

        await this.mostrarMensajeInformativo(
          'Stock no actualizado',
          'No se pudo actualizar el stock por ubicación.',
          'error'
        );
        return;
      }

      if (
        imagenSubidaNueva &&
        imagenAnterior &&
        imagenAnterior !== imagenSubidaNueva &&
        !imagenAnterior.startsWith('data:image')
      ) {
        await this.supabaseService.eliminarImagenProductoPorUrl(imagenAnterior);
      }

      this.imagenUrl = imagenFinal;
      this.imagenAnteriorUrl = imagenFinal;
      this.imagenNuevaSeleccionada = false;
      this.formularioGuardado = true;
      this.guardarSnapshotFormulario();
      this.mensajeService.enviarMensaje('actualizado');
      this.volverPaginaAnterior();
    } catch (error) {
      console.error('Error al actualizar producto:', error);

      if (imagenSubidaNueva) {
        await this.supabaseService.eliminarImagenProductoPorUrl(imagenSubidaNueva);
      }

      await this.mostrarMensajeInformativo(
        'Error al actualizar',
        'Ocurrió un error al actualizar el producto.',
        'error'
      );
    }
  }

  async eliminarProducto() {
    if (!this.isEditMode || !this.productoId) {
      await this.mostrarMensajeInformativo(
        'Producto no guardado',
        'No se puede eliminar un producto que aún no fue guardado.',
        'advertencia'
      );
      return;
    }

    const confirmar = await this.mostrarMensajeConfirmacion(
      'Eliminar producto',
      '¿Deseas eliminar este producto?',
      'error',
      'Eliminar'
    );

    if (!confirmar) {
      return;
    }

    await this.loadingService.mostrarLoading('Eliminando producto...');

    try {
      const eliminado = await this.supabaseService.eliminarProductoLogico(this.productoId);

      if (!eliminado) {
        await this.mostrarMensajeInformativo(
          'No se pudo eliminar',
          'No se pudo eliminar el producto.',
          'error'
        );
        return;
      }

      this.formularioGuardado = true;
      this.mensajeService.enviarMensaje('eliminado');
      this.volverPaginaAnterior();
    } finally {
      await this.loadingService.cerrarLoading();
    }
  }

  async moverStock() {
    if (!this.isEditMode || !this.productoId) {
      await this.mostrarMensajeInformativo(
        'Producto no guardado',
        'El producto debe estar guardado antes de mover stock.',
        'advertencia'
      );
      return;
    }

    if (!this.trasladoSeleccionado) {
      await this.mostrarMensajeInformativo(
        'Traslado obligatorio',
        'Debes seleccionar de dónde a dónde se moverá el stock.',
        'advertencia'
      );
      return;
    }

    if (Number(this.cantidadTraslado) <= 0) {
      await this.mostrarMensajeInformativo(
        'Cantidad inválida',
        'La cantidad de traslado debe ser mayor a 0.',
        'advertencia'
      );
      return;
    }

    const origen = this.getOrigenTraslado();
    const destino = this.getDestinoTraslado();

    if (!origen || !destino) {
      await this.mostrarMensajeInformativo(
        'Traslado inválido',
        'No se pudo determinar el origen y destino del traslado.',
        'error'
      );
      return;
    }

    const cantidad = Number(this.cantidadTraslado);
    const nombreOrigen = this.obtenerNombreUbicacion(origen);
    const nombreDestino = this.obtenerNombreUbicacion(destino);
    let mensajeExito = '';

    await this.loadingService.mostrarLoading('Moviendo stock...');

    try {
      const movido = await this.supabaseService.moverStockEntreUbicaciones(
        this.productoId,
        origen,
        destino,
        cantidad
      );

      if (!movido) {
        await this.mostrarMensajeInformativo(
          'No se pudo mover stock',
          'Revisa que exista suficiente stock en la ubicación de origen.',
          'error'
        );
        return;
      }

      this.trasladoSeleccionado = '';
      this.cantidadTraslado = 0;

      await this.cargarProducto();
      this.mensajeService.enviarMensaje('actualizado');

      mensajeExito = `Se movieron ${cantidad} unidades de ${nombreOrigen} a ${nombreDestino}.`;
    } finally {
      await this.loadingService.cerrarLoading();
    }

    if (mensajeExito) {
      await this.mostrarMensajeInformativo('Movimiento realizado', mensajeExito, 'exito');
    }
  }

  async registrarDanado() {
    if (!this.isEditMode || !this.productoId) {
      await this.mostrarMensajeInformativo(
        'Producto no guardado',
        'El producto debe estar guardado antes de registrar dañados.',
        'advertencia'
      );
      return;
    }

    if (!this.origenDanado) {
      await this.mostrarMensajeInformativo(
        'Origen obligatorio',
        'Debes seleccionar de dónde saldrá el producto dañado.',
        'advertencia'
      );
      return;
    }

    if (Number(this.cantidadDanado) <= 0) {
      await this.mostrarMensajeInformativo(
        'Cantidad inválida',
        'La cantidad de productos dañados debe ser mayor a 0.',
        'advertencia'
      );
      return;
    }

    const origen = this.origenDanado as 'exhibicion' | 'almacen_tienda' | 'almacen_casa';
    const cantidad = Number(this.cantidadDanado);
    const nombreOrigen = this.obtenerNombreUbicacion(origen);
    let mensajeExito = '';

    await this.loadingService.mostrarLoading('Registrando producto dañado...');

    try {
      const registrado = await this.supabaseService.moverStockADanado(
        this.productoId,
        origen,
        cantidad
      );

      if (!registrado) {
        await this.mostrarMensajeInformativo(
          'No se pudo registrar dañado',
          'Revisa que exista suficiente stock en la ubicación seleccionada.',
          'error'
        );
        return;
      }

      this.origenDanado = '';
      this.cantidadDanado = 0;

      await this.cargarProducto();
      this.mensajeService.enviarMensaje('actualizado');

      mensajeExito = `Se registraron ${cantidad} unidades como dañadas desde ${nombreOrigen}.`;
    } finally {
      await this.loadingService.cerrarLoading();
    }

    if (mensajeExito) {
      await this.mostrarMensajeInformativo('Producto dañado registrado', mensajeExito, 'exito');
    }
  }

  async enviarAProveedor() {
    if (!this.isEditMode || !this.productoId) {
      await this.mostrarMensajeInformativo(
        'Producto no guardado',
        'El producto debe estar guardado antes de enviar al proveedor.',
        'advertencia'
      );
      return;
    }

    if (Number(this.cantidadSalidaProveedor) <= 0) {
      await this.mostrarMensajeInformativo(
        'Cantidad inválida',
        'La cantidad a enviar al proveedor debe ser mayor a 0.',
        'advertencia'
      );
      return;
    }

    const cantidad = Number(this.cantidadSalidaProveedor);
    let mensajeExito = '';

    await this.loadingService.mostrarLoading('Enviando a proveedor...');

    try {
      const enviado = await this.supabaseService.enviarDanadoAProveedor(
        this.productoId,
        cantidad
      );

      if (!enviado) {
        await this.mostrarMensajeInformativo(
          'No se pudo enviar al proveedor',
          'Revisa que exista suficiente stock dañado para enviar.',
          'error'
        );
        return;
      }

      this.cantidadSalidaProveedor = 0;

      await this.cargarProducto();
      this.mensajeService.enviarMensaje('actualizado');

      mensajeExito = `Se enviaron ${cantidad} unidades dañadas al proveedor.`;
    } finally {
      await this.loadingService.cerrarLoading();
    }

    if (mensajeExito) {
      await this.mostrarMensajeInformativo('Enviado al proveedor', mensajeExito, 'exito');
    }
  }

  async recibirCambioProveedor() {
    if (!this.isEditMode || !this.productoId) {
      await this.mostrarMensajeInformativo(
        'Producto no guardado',
        'El producto debe estar guardado antes de recibir cambio del proveedor.',
        'advertencia'
      );
      return;
    }

    if (!this.destinoCambioProveedor) {
      await this.mostrarMensajeInformativo(
        'Destino obligatorio',
        'Debes seleccionar dónde ingresará el producto recibido.',
        'advertencia'
      );
      return;
    }

    if (Number(this.cantidadCambioProveedor) <= 0) {
      await this.mostrarMensajeInformativo(
        'Cantidad inválida',
        'La cantidad recibida del proveedor debe ser mayor a 0.',
        'advertencia'
      );
      return;
    }

    const destino = this.destinoCambioProveedor as 'exhibicion' | 'almacen_tienda' | 'almacen_casa';
    const cantidad = Number(this.cantidadCambioProveedor);
    const nombreDestino = this.obtenerNombreUbicacion(destino);
    let mensajeExito = '';

    await this.loadingService.mostrarLoading('Recibiendo cambio del proveedor...');

    try {
      const recibido = await this.supabaseService.recibirCambioProveedor(
        this.productoId,
        destino,
        cantidad
      );

      if (!recibido) {
        await this.mostrarMensajeInformativo(
          'No se pudo recibir cambio',
          'No se pudo registrar el cambio recibido del proveedor.',
          'error'
        );
        return;
      }

      this.destinoCambioProveedor = '';
      this.cantidadCambioProveedor = 0;

      await this.cargarProducto();
      this.mensajeService.enviarMensaje('actualizado');

      mensajeExito = `Se recibieron ${cantidad} unidades en ${nombreDestino}.`;
    } finally {
      await this.loadingService.cerrarLoading();
    }

    if (mensajeExito) {
      await this.mostrarMensajeInformativo('Cambio recibido', mensajeExito, 'exito');
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
    const formularioValido = await this.validarFormularioProducto();

    if (!formularioValido) {
      return;
    }

    const codigoDisponible = await this.validarCodigoBarrasDisponible();

    if (!codigoDisponible) {
      return;
    }

    const confirmarCosto = await this.confirmarCostoMayorPrecio();

    if (!confirmarCosto) {
      return;
    }

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
    this.intentarSalir();
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
    await this.detenerCamaraScanner();

    this.cerrandoScanner = false;
    this.scannerAbierto = true;
  }

  async cerrarScannerCodigo() {
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

  async iniciarLecturaCodigo() {
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
            const codigoEscaneado = (result.getText() || '').trim();

            if (codigoEscaneado) {
              this.zone.run(() => {
                this.codigo = codigoEscaneado;
                this.cerrarScannerCodigo();
              });
            }
          }
        }
      );
    } catch (error) {
      console.error('Error al abrir cámara o escanear:', error);
      await this.cerrarScannerCodigo();
    }
  }
}