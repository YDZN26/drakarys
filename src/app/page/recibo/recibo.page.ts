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
    cliente: '',   // ahora guardamos un string
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

  private async cargarVenta(ventaId: number) {
    const venta = await this.supabase.obtenerVentaPorId(ventaId);
    const detalles = await this.supabase.obtenerVentaDetalles(ventaId);
    if (!venta) return console.error('Venta no encontrada');

    // Formatear fecha
    const fechaObj = new Date(venta.fecha + 'Z');
    const fechaLocal = fechaObj.toLocaleDateString('es-BO');
    const horaLocal  = fechaObj.toLocaleTimeString('es-BO');

    // Obtener nombre legible del tipo de pago
    const tipoPago = this.tiposPago[venta.tipo_pago_id] || '';

    // Traer cliente de Supabase
    let clienteStr = '';
    if (venta.cliente_id) {
      const cli = await this.supabase.obtenerClientePorId(venta.cliente_id);
      if (cli) clienteStr = `${cli.nombre} ${cli.apellido}`.trim();
    }

    this.recibo = {
      venta_id: venta.venta_id,
      fechaVenta: `${fechaLocal} ${horaLocal}`,
      totalVenta: venta.total,
      metodoPago: tipoPago,
      cliente: clienteStr,
      productos: detalles || []
    };
  }

  irABalance() {
    this.mensajeService.enviarMensaje('actualizar ingresos');
    this.navCtrl.navigateBack('/tab-inicial/balance');
  }
}
