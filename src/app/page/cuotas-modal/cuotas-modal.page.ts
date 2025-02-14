import { Component, OnInit } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';

@Component({
  selector: 'app-cuotas-modal',
  templateUrl: './cuotas-modal.page.html',
  styleUrls: ['./cuotas-modal.page.scss'],
})
export class CuotasModalPage implements OnInit {
  comprador: string = ''; // Inicializar como cadena vacía
  montoPagado: number = 0; // Inicializar como 0
  montoFaltante: number = 0; // Inicializar como 0
  telefono: string = ''; // Inicializar como cadena vacía
  producto: any;

  constructor(private modalController: ModalController, private navParams: NavParams) {}

  ngOnInit() {
    this.producto = this.navParams.get('producto');
  }

  confirmarCuotas() {
    const data = {
      comprador: this.comprador,
      montoPagado: this.montoPagado,
      montoFaltante: this.montoFaltante,
      telefono: this.telefono,
      producto: this.producto
    };
    this.modalController.dismiss(data);
  }

  cancelar() {
    this.modalController.dismiss();
  }
}
