import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-opciones',
  templateUrl: './opciones.page.html',
  styleUrls: ['./opciones.page.scss'],
})
export class OpcionesPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

  cerrarSesion() {
    console.log('Cerrar sesión');
    // Añadir la lógica para cerrar sesión
  }

}
