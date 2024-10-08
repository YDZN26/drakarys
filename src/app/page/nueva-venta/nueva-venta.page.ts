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
    { codigo: 'P001', nombre: 'Producto 1', disponibles: 10, precio: 8, imagen: 'assets/Images/producto1.png', cantidadSeleccionada: 0 },
    { codigo: 'P002', nombre: 'Producto 2', disponibles: 5, precio: 10, imagen: 'assets/Images/producto2.png', cantidadSeleccionada: 0 },
    { codigo: 'P003', nombre: 'Producto 3', disponibles: 3, precio: 15, imagen: 'assets/Images/producto3.png', cantidadSeleccionada: 0 },
    { codigo: 'P004', nombre: 'Producto 4', disponibles: 7, precio: 12, imagen: 'assets/Images/producto4.png', cantidadSeleccionada: 0 }
  ];

  productosFiltrados = [...this.productos]; // Inicialmente muestra todos los productos
  totalProductosSeleccionados: number = 0;
  valorTotalSeleccionado: number = 0;

  constructor(private actionSheetCtrl: ActionSheetController, private navCtrl: NavController, private modalCtrl: ModalController) {}

  // Buscar productos por nombre o código
  buscarProductos(event: any) {
    const textoBusqueda = event.target.value.toLowerCase(); // Obtiene el texto en minúsculas
    if (textoBusqueda.trim() !== '') {
      this.productosFiltrados = this.productos.filter(producto => 
        producto.nombre.toLowerCase().includes(textoBusqueda) || producto.codigo.toLowerCase().includes(textoBusqueda)
      );
    } else {
      this.productosFiltrados = [...this.productos]; // Si no hay búsqueda, muestra todos los productos
    }
  }

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
    const productosSeleccionados = this.productos.filter(producto => producto.cantidadSeleccionada > 0); // Filtrar productos seleccionados
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Selecciona el método de pago',
      buttons: [
        {
          text: 'Efectivo',
          handler: () => {
            this.goToRecibo('Efectivo', productosSeleccionados);
          }
        },
        {
          text: 'Transferencia Bancaria',
          handler: () => {
            this.goToRecibo('Transferencia Bancaria', productosSeleccionados);
          }
        },
        {
          text: 'Tarjeta',
          handler: () => {
            this.goToRecibo('Tarjeta', productosSeleccionados);
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
        const productosSeleccionados = this.productos.filter(producto => producto.cantidadSeleccionada > 0); // Filtrar productos seleccionados
        this.goToRecibo('Cuotas', productosSeleccionados, data.data); 
      }
    });

    await modal.present();
  }

  // Enviar los productos seleccionados y el método de pago a la página de recibo
  goToRecibo(metodoPago: string, productosSeleccionados: any[], cuotaData?: any) {
    this.navCtrl.navigateForward('/recibo', {
      queryParams: { 
        metodoPago: metodoPago,
        productos: JSON.stringify(productosSeleccionados), // Enviar productos seleccionados como JSON
        totalVenta: this.valorTotalSeleccionado,  // Enviar el total de la venta
        ...cuotaData // Enviar datos de cuotas si existen
      }
    });
  }
}
