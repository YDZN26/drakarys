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
    ingreso_id: 0,
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
    const ingresoParam = this.route.snapshot.paramMap.get('ventaId');
    console.log('Recibo cargando con ID:', ingresoParam);

    if (ingresoParam) {
      const ingresoId = Number(ingresoParam);
      this.cargarIngreso(ingresoId);
    } else {
      console.error('No se recibió ingresoId en la URL.');
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
        monto: Number(total || 0)
      }
    ];
  }

  private async cargarIngreso(ingresoId: number) {
    const ingreso = await this.supabase.obtenerVentaPorId(ingresoId);
    const detalles = await this.supabase.obtenerVentaDetalles(ingresoId);
    const detallePago = await this.supabase.obtenerIngresoPagoDetalle(ingresoId);

    if (!ingreso) {
      console.error('Ingreso no encontrado');
      return;
    }

    const fechaObj = new Date(ingreso.fecha + 'Z');
    const fechaLocal = fechaObj.toLocaleDateString('es-BO');
    const horaLocal = fechaObj.toLocaleTimeString('es-BO');

    const tipoPago = this.tiposPago[ingreso.tipo_pago_id] || '';

    let clienteStr = '';
    if (ingreso.cliente_id) {
      const cli = await this.supabase.obtenerClientePorId(ingreso.cliente_id);
      if (cli) {
        clienteStr = `${cli.nombre} ${cli.apellido}`.trim();
      }
    }

    let metodosPago = [];

    if (ingreso.es_pago_mixto && detallePago && detallePago.length > 0) {
      metodosPago = detallePago.map((detalle: any) => ({
        nombre: detalle.tipo_de_pago?.nombre || this.tiposPago[detalle.tipo_pago_id] || '',
        monto: Number(detalle.monto || 0)
      }));
    } else {
      metodosPago = this.formatearMetodoPago(ingreso.tipo_pago_id, ingreso.total);
    }

    this.recibo = {
      ingreso_id: ingreso.ingreso_id,
      fechaVenta: `${fechaLocal} ${horaLocal}`,
      totalVenta: Number(ingreso.total || 0),
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