import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-recibo',
  templateUrl: './recibo.page.html',
  styleUrls: ['./recibo.page.scss'],
})
export class ReciboPage implements OnInit {
  recibo: any = {
    productos: [],
    metodoPago: '',
    totalVenta: 0
  };

  constructor(private route: ActivatedRoute, private navCtrl: NavController) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['metodoPago']) {
        this.recibo.metodoPago = params['metodoPago'];
      }
      if (params['productos']) {
        this.recibo.productos = JSON.parse(params['productos']);
      }
      if (params['totalVenta']) {
        this.recibo.totalVenta = params['totalVenta'];
      }
    });
  }

  irABalance() {
    this.navCtrl.navigateBack('/tab-inicial/balance');
  }
}
