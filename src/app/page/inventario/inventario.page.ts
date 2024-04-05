import { Component } from '@angular/core';
import { NavController } from '@ionic/angular'; // Importa NavController para navegar a la página de creación de nuevo producto

@Component({
  selector: 'app-inventario',
  templateUrl: './inventario.page.html',
  styleUrls: ['./inventario.page.scss'],
})
export class InventarioPage {

  constructor(private navCtrl: NavController) { }

  agregarNuevoProducto() {
    // Navegar a la página "agregar-producto"
    this.navCtrl.navigateForward('/agregar-producto');
  }
}

