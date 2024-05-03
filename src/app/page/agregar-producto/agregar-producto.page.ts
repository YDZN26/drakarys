import { Component } from '@angular/core';
import { NavController, ActionSheetController } from '@ionic/angular';

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

  constructor(
    private navCtrl: NavController,
    private actionSheetController: ActionSheetController
  ) {}

  async showActionSheet() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Seleccionar una opción',
      buttons: [
        {
          text: 'Tomar foto',
          handler: () => {
            // Lógica para tomar una foto
            console.log('Tomar foto');
          }
        },
        {
          text: 'Abrir galería',
          handler: () => {
            // Lógica para abrir la galería
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
    const payload = {
      codigo: this.codigo,
      nombre: this.nombre,
      precioUnitario: this.precioUnitario,
      costoUnitario: this.costoUnitario,
      descripcion: this.descripcion,
      cantidad: this.counterValue,
      categoria: this.selectedOption
    };
  }

  retroceder() {
    // Navegar hacia atrás
    this.navCtrl.back();
  }

  decreaseCounter() {
    if (this.counterValue > 0) {
      this.counterValue--; // Decrementar el contador si es mayor que cero
    }
  }

  increaseCounter() {
    this.counterValue++; // Incrementar el contador
  }

  toggleDropdown() {
    // Cambiar el estado del dropdown al hacer clic en el botón
  }

  onOptionChange(event: any) {
    // Método que se ejecuta cuando cambia la opción seleccionada en el dropdown
    this.selectedOption = event.detail.value; // Actualizar la opción seleccionada
  }
}
