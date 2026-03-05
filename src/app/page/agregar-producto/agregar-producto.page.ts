import { Component, EventEmitter, Output, NgZone, ViewChild, ElementRef } from '@angular/core';
import { NavController, ActionSheetController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { SupabaseService } from '../../supabase.service';
import { ActivatedRoute } from '@angular/router';
import { MensajeService } from 'src/app/mensaje.service';

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

import { BrowserMultiFormatReader } from '@zxing/browser';
import type { Result } from '@zxing/library';

@Component({
  selector: 'app-agregar-producto',
  templateUrl: './agregar-producto.page.html',
  styleUrls: ['./agregar-producto.page.scss'],
})
export class AgregarProductoPage {
  counterValue: number = 0;
  selectedOption: string = '';
  codigo: string = '';
  nombre: string = '';
  precioUnitario: number = 0;
  costoUnitario: number = 0;
  descripcion: string = '';
  imagenUrl: string = '';
  categorias: any[] = [];

  isEditMode: boolean = false;
  productoId: number | null = null;

  @Output() emisorMensajes = new EventEmitter<string>();

  // ✅ (AUMENTADO) Scanner código
  scannerAbierto: boolean = false;
  private codeReader: BrowserMultiFormatReader | null = null;
  private streamActual: MediaStream | null = null;

  @ViewChild('videoScanner', { static: false }) videoScanner!: ElementRef<HTMLVideoElement>;

  constructor(
    private navCtrl: NavController,
    private actionSheetController: ActionSheetController,
    private http: HttpClient,
    private supabaseService: SupabaseService,
    private route: ActivatedRoute,
    private mensajeService: MensajeService,
    private zone: NgZone
  ) {}

  ngOnInit(){
    this.cargarCategorias();

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
      console.log('Categorias Obtenidas',  this.categorias);
    } catch (error) {
      console.error('Error al obtener categorias', error);
    }
  }

  async cargarProducto() {
    if (this.productoId !== null) {
      const producto = await this.supabaseService.obtenerProductoPorId(this.productoId);
      if (producto) {
        this.codigo = producto.codigo_barras.toString();
        this.nombre = producto.nombre;
        this.precioUnitario = producto.precio;
        this.costoUnitario = producto.costo;
        this.descripcion = producto.descripcion;
        this.counterValue = producto.stock;
        this.selectedOption = producto.categoria_id.toString();
        this.imagenUrl = producto.imagen;
      }
    }
  }

  async agregarProducto() {

    if (!this.codigo || !this.nombre || !this.selectedOption) {
      console.error("Faltan datos obligatorios");
      return;
    }

    const producto = {
      codigo_barras: Number(this.codigo),
      nombre: this.nombre,
      precio: Number(this.precioUnitario),
      costo: Number(this.costoUnitario),
      descripcion: this.descripcion,
      stock: Number(this.counterValue),
      categoria_id: Number(this.selectedOption),
      imagen: this.imagenUrl || null
    };

    console.log("Producto a enviar:", producto);

    try {
      const data = await this.supabaseService.agregarProducto(producto);

      if (!data) {
        console.error("Supabase no insertó el producto");
        return;
      }

      console.log("Producto agregado:", data);
      this.mensajeService.enviarMensaje('agregado');
      this.navCtrl.back();

    } catch (error) {
      console.error("Error al agregar producto:", error);
    }
  }

  async actualizarProducto() {
    const producto = {
      producto_id: this.productoId,
      codigo_barras: parseInt(this.codigo, 10),
      nombre: this.nombre,
      precio: this.precioUnitario,
      costo: this.costoUnitario,
      descripcion: this.descripcion,
      stock: this.counterValue,
      categoria_id: parseInt(this.selectedOption, 10),
      imagen: this.imagenUrl
    };

    this.supabaseService.actualizarProducto(producto).then(data => {
      console.log('Producto actualizado:', data);
      this.mensajeService.enviarMensaje('actualizado');
      this.navCtrl.back();
    }).catch(error => {
      console.error('Error al actualizar producto:', error);
    });
  }

  guardarProducto() {
    console.log('CLICK guardarProducto', { isEditMode: this.isEditMode });

    if (this.isEditMode) {
      this.actualizarProducto();
    } else {
      this.agregarProducto();
    }
  }

  retroceder() {
    this.navCtrl.back();
  }

  decreaseCounter() {
    if (this.counterValue > 0) {
      this.counterValue--;
    }
  }

  increaseCounter() {
    this.counterValue++;
  }

  onOptionChange(event: any) {
    this.selectedOption = event.detail.value;
  }

  // =========================
  // ✅ FOTO (TOMAR / GALERÍA)
  // =========================

  async tomarFoto() {
    try {
      const image = await Camera.getPhoto({
        quality: 70,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });

      // ✅ (AUMENTADO) guardo la imagen en el mismo campo que ya usas
      this.imagenUrl = image.dataUrl || '';
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

      // ✅ (AUMENTADO) guardo la imagen en el mismo campo que ya usas
      this.imagenUrl = image.dataUrl || '';
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

      try { await videoEl.play(); } catch (e) {}

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