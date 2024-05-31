import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-inventario',
  templateUrl: './inventario.page.html',
  styleUrls: ['./inventario.page.scss'],
})
export class InventarioPage {
  slideOpts = {
    slidesPerView: 'auto',
    spaceBetween: 10,
  };

  productos = [
    {
      nombre: 'Producto 1',
      disponibles: 10,
      precio: 8,
      imagen: 'assets/Images/14003061-icy-mint.webp' // Ajusta el nombre de archivo según sea necesario
    },
    {
      nombre: 'Producto 2',
      disponibles: 10,
      precio: 8,
      imagen: 'assets/Images/vaporesso-xros-mini-grape-purple_1.jpg' // Ajusta el nombre de archivo según sea necesario
    },
    {
      nombre: 'Producto 3',
      disponibles: 10,
      precio: 8,
      imagen: 'assets/Images/6975364632300_700x700.webp' // Ajusta el nombre de archivo según sea necesario
    },
    {
      nombre: 'Producto 4',
      disponibles: 10,
      precio: 8,
      imagen: 'assets/Images/smok-nord-2-kit-tablites-347988_1200x1200.webp' // Ajusta el nombre de archivo según sea necesario
    },
    {
      nombre: 'Producto 5',
      disponibles: 10,
      precio: 8,
      imagen: 'assets/Images/imagen5.png' // Ajusta el nombre de archivo según sea necesario
    },
    {
      nombre: 'Producto 6',
      disponibles: 10,
      precio: 8,
      imagen: 'assets/Images/imagen6.png' // Ajusta el nombre de archivo según sea necesario
    }
  ];

  constructor(private navCtrl: NavController) { }

  agregarNuevoProducto() {
    this.navCtrl.navigateForward('/agregar-producto');
  }

  verDetalleProducto(producto: any) {
    console.log('Detalle del producto:', producto);
    // Aquí puedes navegar a una página de detalles del producto si tienes una
    // this.navCtrl.navigateForward(`/detalle-producto/${producto.id}`);
  }
}

