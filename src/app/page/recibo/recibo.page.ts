import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-recibo',
  templateUrl: './recibo.page.html',
  styleUrls: ['./recibo.page.scss'],
})
export class ReciboPage implements OnInit {
  recibo = {
    nombreProducto: 'Producto 1',
    cantidad: 2,
    precio: 100,
    descuento: 10,
    hora: new Date().toLocaleTimeString(),
    totalVenta: 190, 
    metodoPago: 'Efectivo' 
  };

  constructor(private route: ActivatedRoute, private navCtrl: NavController) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['metodoPago']) {
        this.recibo.metodoPago = params['metodoPago'];
      }
    });
  }

  irABalance() {
    this.navCtrl.navigateBack('/tab-inicial/balance');
  }
}
