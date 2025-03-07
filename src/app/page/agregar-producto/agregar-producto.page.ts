import { Component, EventEmitter, Output } from '@angular/core';
import { NavController, ActionSheetController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { SupabaseService } from '../../supabase.service'; // Asegúrate de que la ruta esté correcta
import { ActivatedRoute } from '@angular/router';
import { MensajeService } from 'src/app/mensaje.service';

@Component({
  selector: 'app-agregar-producto',
  templateUrl: './agregar-producto.page.html',
  styleUrls: ['./agregar-producto.page.scss'],
})
export class AgregarProductoPage {
  counterValue: number = 0; // Valor inicial del contador
  selectedOption: string = ''; // Variable para almacenar la opción seleccionada
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

  constructor(
    private navCtrl: NavController,
    private actionSheetController: ActionSheetController,
    private http: HttpClient,
    private supabaseService: SupabaseService, // Inyecta el servicio de Supabase
    private route: ActivatedRoute,
    private mensajeService: MensajeService  ) {}

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
      const producto = {
        codigo_barras: parseInt(this.codigo,10),
        nombre: this.nombre,
        precio: this.precioUnitario,
        costo: this.costoUnitario,
        descripcion: this.descripcion,
        stock: this.counterValue,
        categoria_id: parseInt(this.selectedOption,10),
        imagen: this.imagenUrl
      };
    
      try {
      const data = await this.supabaseService.agregarProducto(producto);
      console.log('Producto agregado:', data);
      this.mensajeService.enviarMensaje('agregado');
      this.navCtrl.back();
    } catch (error) {
      console.error('Error al agregar producto:', error);
    }
  }

  // Método para actualizar un producto existente
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

    try {
      const data = await this.supabaseService.actualizarProducto(producto);
      console.log('Producto actualizado:', data);
      this.mensajeService.enviarMensaje('actualizado');
      this.navCtrl.back();
    } catch (error) {
      console.error('Error al actualizar producto:', error);
    }
  }

  // Método que decide si se agrega o actualiza el producto según el modo
  guardarProducto() {
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

  async showActionSheet() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Seleccionar una opción',
      buttons: [
        {
          text: 'Tomar foto',
          handler: () => {
            console.log('Tomar foto');
          }
        },
        {
          text: 'Abrir galería',
          handler: () => {
            console.log('Abrir galería');
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
}
