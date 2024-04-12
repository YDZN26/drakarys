import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-agregar-producto',
  templateUrl: './agregar-producto.page.html',
  styleUrls: ['./agregar-producto.page.scss'],
})
export class AgregarProductoPage {

  counterValue: number = 0; // Valor inicial del contador

  constructor(private navCtrl: NavController) { }

  agregarProducto() {
    // Lógica para agregar un nuevo producto
  }

  retroceder() {
    // Navegar hacia atrás
    this.navCtrl.back();
  }

  tomarFoto() {
    // Lógica para tomar una foto
  }

  decreaseCounter() {
    if (this.counterValue > 0) {
      this.counterValue--; // Decrementar el contador si es mayor que cero
    }
  }

  increaseCounter() {
    this.counterValue++; // Incrementar el contador
  }
}




