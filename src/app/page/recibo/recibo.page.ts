import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';
import { SupabaseService } from '../../supabase.service';

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

  constructor( private route: ActivatedRoute,
    private navCtrl: NavController,
    private supabaseService: SupabaseService
  ) {}

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

  async irABalance() {
    const tipoPagoId = this.obtenerTipoPagoId(this.recibo.metodoPago);

    try {
      // Enviar los productos seleccionados a Supabase
      const resultado = await this.supabaseService.agregarVenta(
        this.recibo.productos,
        tipoPagoId
      );

      if (resultado) {
        console.log('Venta registrada exitosamente:', resultado);
      }

      // Navegar a la página de Balance
      this.navCtrl.navigateBack('/tab-inicial/balance');
    } catch (error) {
      console.error('Error al procesar la venta:', error);
    }
  }

  obtenerTipoPagoId(metodoPago: string): number {
    const tiposPago = {
      'Efectivo': 1,
      'Transferencia Bancaria': 2,
      'Tarjeta': 3,
      'Cuotas': 4
    };
  
    return tiposPago[metodoPago as keyof typeof tiposPago] || 0; // Devuelve 0 si no encuentra el tipo de pago
  }
}