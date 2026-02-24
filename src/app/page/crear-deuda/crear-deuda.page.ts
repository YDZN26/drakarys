import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-crear-deuda',
  templateUrl: './crear-deuda.page.html',
  styleUrls: ['./crear-deuda.page.scss'],
})
export class CrearDeudaPage implements OnInit {

  cliente: string = '';
  descripcion: string = '';
  totalDeuda: number = 0;

  constructor(private navCtrl: NavController) {}

  ngOnInit() {}

  guardarDeuda() {
    if (!this.cliente || !this.descripcion || !this.totalDeuda || this.totalDeuda <= 0) {
      console.log('Completar campos antes de guardar');
      return;
    }

    console.log('Deuda a guardar:', {
      cliente: this.cliente,
      descripcion: this.descripcion,
      totalDeuda: this.totalDeuda
    });

    // por ahora vuelve a la lista
    this.navCtrl.navigateBack('/deudas');
  }

  cancelar() {
    this.navCtrl.navigateBack('/deudas');
  }
}
