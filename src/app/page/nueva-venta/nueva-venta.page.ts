import { Component } from '@angular/core';
import { ActionSheetController, NavController, ModalController } from '@ionic/angular';
import { CuotasModalPage } from '../cuotas-modal/cuotas-modal.page'; 

@Component({
  selector: 'app-nueva-venta',
  templateUrl: './nueva-venta.page.html',
  styleUrls: ['./nueva-venta.page.scss'],
})
export class NuevaVentaPage {

  productos = [
    { nombre: 'Producto 1', disponibles: 10, precio: 8, imagen: 'assets/Images/producto1.png', cantidadSeleccionada: 0 },
    { nombre: 'Producto 2', disponibles: 5, precio: 10, imagen: 'assets/Images/producto2.png', cantidadSeleccionada: 0 },
    { nombre: 'Producto 3', disponibles: 3, precio: 15, imagen: 'assets/Images/producto3.png', cantidadSeleccionada: 0 },
    { nombre: 'Producto 4', disponibles: 7, precio: 12, imagen: 'assets/Images/producto4.png', cantidadSeleccionada: 0 }
  ];

  totalProductosSeleccionados: number = 0;
  valorTotalSeleccionado: number = 0;

  constructor(private actionSheetCtrl: ActionSheetController, private navCtrl: NavController, private modalCtrl: ModalController) {}

  // Incrementar la cantidad seleccionada
  aumentarCantidad(producto: any) {
    if (producto.cantidadSeleccionada < producto.disponibles) {
      producto.cantidadSeleccionada++;
      this.actualizarTotales();
    }
  }

  // Decrementar la cantidad seleccionada
  disminuirCantidad(producto: any) {
    if (producto.cantidadSeleccionada > 0) {
      producto.cantidadSeleccionada--;
      this.actualizarTotales();
    }
  }

  // Calcular el total de productos seleccionados y el valor total
  actualizarTotales() {
    this.totalProductosSeleccionados = this.productos.reduce((total, producto) => total + producto.cantidadSeleccionada, 0);
    this.valorTotalSeleccionado = this.productos.reduce((total, producto) => total + (producto.cantidadSeleccionada * producto.precio), 0);
  }

  async agregarVenta() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Selecciona el método de pago',
      buttons: [
        {
          text: 'Efectivo',
          handler: () => {
            this.goToRecibo('Efectivo');
          }
        },
        {
          text: 'Transferencia Bancaria',
          handler: () => {
            this.goToRecibo('Transferencia Bancaria');
          }
        },
        {
          text: 'Tarjeta',
          handler: () => {
            this.goToRecibo('Tarjeta');
          }
        },
        {
          text: 'Cuotas',
          handler: () => {
            this.presentCuotasModal();
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

  async presentCuotasModal() {
    const modal = await this.modalCtrl.create({
      component: CuotasModalPage, 
      componentProps: { 
      }
    });

    modal.onDidDismiss().then((data) => {
      if (data.data && data.data.confirmed) {
        this.goToRecibo('Cuotas', data.data); 
      }
    });

    await modal.present();
  }

  goToRecibo(metodoPago: string, cuotaData?: any) {
    this.navCtrl.navigateForward('/recibo', {
      queryParams: { metodoPago: metodoPago, ...cuotaData }
    });
  }
}
