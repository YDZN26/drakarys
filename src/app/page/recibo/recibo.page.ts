import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';
import { SupabaseService } from '../../supabase.service';
import { MensajeService } from 'src/app/mensaje.service';

@Component({
  selector: 'app-recibo',
  templateUrl: './recibo.page.html',
  styleUrls: ['./recibo.page.scss'],
})
export class ReciboPage implements OnInit {
  recibo: any = {
    venta_id: 0,
    fechaVenta: '',
    productos: [],
    totalVenta: 0,
    metodoPago: '',
    metodosPago: [],
    cliente: '',
  };

  tiposPago: { [key: number]: string } = {
    1: 'Cuota',
    2: 'Efectivo',
    3: 'Transferencia Bancaria',
    4: 'Tarjeta'
  };

  constructor(
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private supabase: SupabaseService,
    private mensajeService: MensajeService
  ) {}

  ngOnInit() {
    const ventaParam = this.route.snapshot.paramMap.get('ventaId');
    console.log('Recibo cargando con ID:', ventaParam);

    if (ventaParam) {
      const ventaId = Number(ventaParam);
      this.cargarVenta(ventaId);
    } else {
      console.error('No se recibió ventaId en la URL.');
    }
  }

  private formatearMetodoPago(tipoPagoId: number, total: number) {
    const nombreMetodo = this.tiposPago[tipoPagoId] || '';

    if (!nombreMetodo) {
      return [];
    }

    return [
      {
        nombre: nombreMetodo,
        monto: total
      }
    ];
  }

  private async cargarVenta(ventaId: number) {
    const venta = await this.supabase.obtenerVentaPorId(ventaId);
    const detalles = await this.supabase.obtenerVentaDetalles(ventaId);

    if (!venta) {
      console.error('Venta no encontrada');
      return;
    }

    const fechaObj = new Date(venta.fecha + 'Z');
    const fechaLocal = fechaObj.toLocaleDateString('es-BO');
    const horaLocal = fechaObj.toLocaleTimeString('es-BO');

    const ingreso = Array.isArray(venta.ingreso) ? venta.ingreso[0] : venta.ingreso;
    const tipoPagoId = Number(ingreso?.tipo_pago_id || 0);
    const tipoPago = this.tiposPago[tipoPagoId] || '';

    let clienteStr = '';
    if (venta.cliente_id) {
      const cli = await this.supabase.obtenerClientePorId(venta.cliente_id);
      if (cli) {
        clienteStr = `${cli.nombre} ${cli.apellido}`.trim();
      }
    }

    const metodosPago = this.formatearMetodoPago(tipoPagoId, Number(venta.monto || 0));

    this.recibo = {
      venta_id: venta.venta_id,
      fechaVenta: `${fechaLocal} ${horaLocal}`,
      totalVenta: Number(venta.monto || 0),
      metodoPago: tipoPago,
      metodosPago: metodosPago,
      cliente: clienteStr,
      productos: detalles || []
    };
  }

  irABalance() {
    this.mensajeService.enviarMensaje('actualizar ingresos');
    this.navCtrl.navigateBack('/tab-inicial/balance');
  }
}