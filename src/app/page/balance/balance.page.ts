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
    { nombre: '1 Ego-T', descripcion: 'Efectivo, 11 de ene - 11:58 am', precio: 90 },
    { nombre: '1 Papellilo Moon 3 en 1', descripcion: 'Tarjeta, 11 de ene - 11:59 am', precio: 20 },
    { nombre: '2 Waka Smash 6000', descripcion: 'Transferencia, 11 de ene - 12:39 pm', precio: 270 },
    { nombre: '1 Encendedor Clipper, 1 Papelillo OCB', descripcion: 'Transferencia, 11 de ene - 14:00 pm', precio: 20 },
    { nombre: 'Producto 5', descripcion: 'Descripción 5', precio: 50 },
    { nombre: 'Producto 6', descripcion: 'Descripción 6', precio: 60 },
  ];

  egresos = [
      { nombre: 'Transporte', descripcion: 'Tarjeta, 11 de ene - 18:59 pm', precio: 75 },
      { nombre: 'Comida', descripcion: 'Efectivo, 11 de ene - 19:34 pm', precio: 30 },
      { nombre: 'Recojo de productos', descripcion: 'Transferencia, 11 de ene - 20:09 pm', precio: 10 },
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
