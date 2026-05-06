import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertController, NavController } from '@ionic/angular';
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

  ventaEditable: boolean = false;
  mensajeVentaBloqueada: string = '';

  productosStockBajo: any[] = [];
  modalStockBajoAbierto: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private supabase: SupabaseService,
    private mensajeService: MensajeService,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    const ventaParam = this.route.snapshot.paramMap.get('ventaId');
    const productosStockBajoParam = this.route.snapshot.queryParamMap.get('productosStockBajo');

    if (productosStockBajoParam) {
      this.productosStockBajo = JSON.parse(productosStockBajoParam);

      if (this.productosStockBajo.length > 0) {
        setTimeout(() => {
          this.modalStockBajoAbierto = true;
        }, 450);
      }
    }

    if (ventaParam) {
      const ventaId = Number(ventaParam);
      this.cargarVenta(ventaId);
    } else {
      console.error('No se recibió ventaId en la URL.');
    }
  }

  private formatearMetodosPago(ingresos: any[]) {
    if (!ingresos || ingresos.length === 0) {
      return [];
    }

    return ingresos
      .filter((ingreso: any) => ingreso.estado !== false)
      .map((ingreso: any) => ({
        nombre: this.tiposPago[Number(ingreso.tipo_pago_id)] || 'Sin tipo de pago',
        monto: Number(ingreso.total || 0)
      }));
  }

  private obtenerTextoMetodoPago(metodosPago: any[]) {
    if (!metodosPago || metodosPago.length === 0) {
      return '';
    }

    if (metodosPago.length === 1) {
      return metodosPago[0].nombre;
    }

    return metodosPago.map((metodo: any) => metodo.nombre).join(' + ');
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

    const ingresos = Array.isArray(venta.ingresos) ? venta.ingresos : [];
    const metodosPago = this.formatearMetodosPago(ingresos);
    const metodoPago = this.obtenerTextoMetodoPago(metodosPago);

    let clienteStr = '';
    if (venta.cliente_id) {
      const cli = await this.supabase.obtenerClientePorId(venta.cliente_id);
      if (cli) {
        clienteStr = `${cli.nombre} ${cli.apellido}`.trim();
      }
    }

    this.recibo = {
      venta_id: venta.venta_id,
      fechaVenta: `${fechaLocal} ${horaLocal}`,
      totalVenta: Number(venta.monto || 0),
      metodoPago: metodoPago,
      metodosPago: metodosPago,
      cliente: clienteStr,
      productos: detalles || []
    };

    await this.validarSiVentaEsEditable(venta.fecha);
  }

  private async validarSiVentaEsEditable(fechaVenta: string) {
    const fechaObj = new Date(fechaVenta + 'Z');
    const hoy = new Date();

    const ventaEsDeHoy =
      fechaObj.getFullYear() === hoy.getFullYear() &&
      fechaObj.getMonth() === hoy.getMonth() &&
      fechaObj.getDate() === hoy.getDate();

    if (!ventaEsDeHoy) {
      this.ventaEditable = false;
      this.mensajeVentaBloqueada = 'Venta de día anterior';
      return;
    }

    const existeCierre = await this.supabase.existeCierreDespuesDeFecha(fechaVenta);

    if (existeCierre) {
      this.ventaEditable = false;
      this.mensajeVentaBloqueada = 'Caja ya cerrada';
      return;
    }

    this.ventaEditable = true;
    this.mensajeVentaBloqueada = '';
  }

  cerrarModalStockBajo() {
    this.modalStockBajoAbierto = false;
  }

  editarVenta() {
    if (!this.ventaEditable) {
      return;
    }

    this.navCtrl.navigateForward('/nueva-venta', {
      queryParams: {
        ventaId: this.recibo.venta_id,
        modo: 'editar'
      }
    });
  }

  async eliminarVenta() {
    if (!this.ventaEditable) {
      return;
    }

    const alerta = await this.alertCtrl.create({
      header: 'Eliminar venta',
      message: '¿Deseas eliminar esta venta? Los productos volverán a exhibición y la venta ya no contará en balance ni cierre de caja.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            const resultado = await this.supabase.eliminarVentaLogica(this.recibo.venta_id);

            if (!resultado) {
              const error = await this.alertCtrl.create({
                header: 'Error',
                message: 'No se pudo eliminar la venta.',
                buttons: ['OK']
              });

              await error.present();
              return;
            }

            this.mensajeService.enviarMensaje('actualizar inventario');
            this.mensajeService.enviarMensaje('actualizar ingresos');

            this.navCtrl.navigateBack('/tab-inicial/balance');
          }
        }
      ]
    });

    await alerta.present();
  }

  irABalance() {
    this.mensajeService.enviarMensaje('actualizar ingresos');
    this.navCtrl.navigateBack('/tab-inicial/balance');
  }
}
