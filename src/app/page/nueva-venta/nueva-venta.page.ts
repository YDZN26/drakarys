import { Component, OnInit } from '@angular/core';

interface Producto {
  nombre: string;
  disponibles: number;
  precio: number;
  imagen: string;
}

@Component({
  selector: 'app-nueva-venta',
  templateUrl: './nueva-venta.page.html',
  styleUrls: ['./nueva-venta.page.scss'],
})
export class NuevaVentaPage implements OnInit {
  productos: Producto[] = [
    {
      nombre: 'Producto 1',
      disponibles: 10,
      precio: 8,
      imagen: 'assets/Images/producto1.png'
    },
    {
      nombre: 'Producto 2',
      disponibles: 10,
      precio: 8,
      imagen: 'assets/Images/producto2.png'
    },
    {
      nombre: 'Producto 3',
      disponibles: 10,
      precio: 8,
      imagen: 'assets/Images/producto3.png'
    },
    {
      nombre: 'Producto 4',
      disponibles: 10,
      precio: 8,
      imagen: 'assets/Images/producto4.png'
    }
  ];

  constructor() { }

  ngOnInit() {
  }

  agregarProducto(producto: Producto) {
    console.log('Producto agregado:', producto);
  }

  agregarVenta() {
    console.log('Venta agregada');
  }
}
