import { Component } from '@angular/core';
import { NavController, ActionSheetController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { SupabaseService } from '../../supabase.service'; // Asegúrate de que la ruta esté correcta

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

  constructor(
    private navCtrl: NavController,
    private actionSheetController: ActionSheetController,
    private http: HttpClient,
    private supabaseService: SupabaseService // Inyecta el servicio de Supabase
  ) {}

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

  agregarProducto() {
    const producto = {
      codigo: this.codigo,
      nombre: this.nombre,
      precio: this.precioUnitario,
      costo: this.costoUnitario,
      descripcion: this.descripcion,
      cantidad: this.counterValue,
      categoria_id: this.selectedOption,
      imagen_url: this.imagenUrl
    };

    this.supabaseService.agregarProducto(producto).then((data) => {
      console.log('Producto agregado:', data);
      this.navCtrl.back();
    }).catch((error) => {
      console.error('Error al agregar producto:', error);
    });
  }

  retroceder() {
    this.navCtrl.back();
  }

  decreaseCounter() {
    if (this.counterValue > 0) {
      this.counterValue--; // Decrementa el contador si es mayor que cero
    }
  }

  increaseCounter() {
    this.counterValue++; // Incrementa el contador
  }

  onOptionChange(event: any) {
    this.selectedOption = event.detail.value; // Actualiza la opción seleccionada
  }
}
