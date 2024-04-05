import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-balance',
  templateUrl: './balance.page.html',
  styleUrls: ['./balance.page.scss'],
})
export class BalancePage {

  constructor(private navCtrl: NavController) {}

  goToNuevaVentaPage() {
    this.navCtrl.navigateForward('/nueva-venta');
  }
}

