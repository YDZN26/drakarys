import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-agregar-producto',
  templateUrl: './agregar-producto.page.html',
  styleUrls: ['./agregar-producto.page.scss'],
})
export class AgregarProductoPage {

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

  accion() {
    // Lógica para la acción del nuevo botón
  }
}



