import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-balance',
  templateUrl: './balance.page.html',
  styleUrls: ['./balance.page.scss'],
})
export class BalancePage {
  days: string[] = Array.from({ length: 31 }, (_, i) => `${i + 1} de ene`);

  ingresos = [
    { nombre: 'Ego-T', descripcion: '1 Ego-T', precio: 90 },
    { nombre: 'Papellilo Moon 3 en 1', descripcion: '1 Papellilo Moon 3 en 1', precio: 20 },
    { nombre: 'Waka Smash 6000', descripcion: '1 Waka Smash 6000', precio: 135 },
    { nombre: 'Encendedor Clipper', descripcion: '1 Encendedor Clipper', precio: 10 },
    { nombre: 'Producto 5', descripcion: 'Descripción 5', precio: 50 },
    { nombre: 'Producto 6', descripcion: 'Descripción 6', precio: 60 },
  ];

  egresos = [
      { nombre: 'Gasto 1', descripcion: '', precio: 10 },
      { nombre: 'Gasto 2', descripcion: '', precio: 30 },
      { nombre: 'Gasto 3', descripcion: '', precio: 10 },
    ];

  filteredItems = this.ingresos; // Inicia mostrando ingresos

  constructor(private navCtrl: NavController) {}

  mostrarIngresos() {
    this.filteredItems = this.ingresos;
  }

  mostrarEgresos() {
    this.filteredItems = this.egresos;
  }

  goToNuevaVentaPage() {
    this.navCtrl.navigateForward('/nueva-venta');
  }

  goToNuevoGastoPage() {
    this.navCtrl.navigateForward('/nuevo-gasto');
  }
}
