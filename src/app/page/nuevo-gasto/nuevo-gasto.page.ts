import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-nuevo-gasto',
  templateUrl: './nuevo-gasto.page.html',
  styleUrls: ['./nuevo-gasto.page.scss'],
})
export class NuevoGastoPage {
  
  constructor(private navCtrl: NavController) {}

  agregarGasto() {
    // Aquí puedes añadir la lógica para agregar el gasto
    console.log('Gasto agregado');
    
    // Navegar a otra página si es necesario
    // this.navCtrl.navigateForward('/alguna-otra-pagina');
  }
}
