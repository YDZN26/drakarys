import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertController, NavController } from '@ionic/angular';
import { SupabaseService } from 'src/app/supabase.service';
import { MensajeService } from 'src/app/mensaje.service';

@Component({
  selector: 'app-metodo-pago',
  templateUrl: './metodo-pago.page.html',
  styleUrls: ['./metodo-pago.page.scss'],
})
export class MetodoPagoPage implements OnInit {

  venta: any = {
    productos: [],
    totalVenta: 0,
    fechaVenta: '',
    cliente: null
  };

  montoEfectivo: number = 0;
  montoTransferencia: number = 0;
  montoTarjeta: number = 0;

  constructor(
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private alertCtrl: AlertController,
    private supabase: SupabaseService,
    private mensajeService: MensajeService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['productos']) {
        this.venta.productos = JSON.parse(params['productos']);
      }

      if (params['totalVenta']) {
        this.venta.totalVenta = Number(params['totalVenta']);
      }

      if (params['fechaVenta']) {
        this.venta.fechaVenta = params['fechaVenta'];
      }

      if (params['cliente']) {
        this.venta.cliente = JSON.parse(params['cliente']);
      }
    });
  }

  get totalPagado(): number {
    return Number(this.montoEfectivo || 0)
      + Number(this.montoTransferencia || 0)
      + Number(this.montoTarjeta || 0);
  }

  get diferencia(): number {
    return Number(this.venta.totalVenta || 0) - this.totalPagado;
  }

  private obtenerPagos() {
    const pagos = [];

    if (Number(this.montoEfectivo) > 0) {
      pagos.push({
        tipo_pago_id: 2,
        monto: Number(this.montoEfectivo)
      });
    }

    if (Number(this.montoTransferencia) > 0) {
      pagos.push({
        tipo_pago_id: 3,
        monto: Number(this.montoTransferencia)
      });
    }

    if (Number(this.montoTarjeta) > 0) {
      pagos.push({
        tipo_pago_id: 4,
        monto: Number(this.montoTarjeta)
      });
    }

    return pagos;
  }

  async confirmarVenta() {
    if (!this.venta.cliente || !this.venta.cliente.cliente_id) {
      const alerta = await this.alertCtrl.create({
        header: 'Error',
        message: 'No se encontró el cliente seleccionado.',
        buttons: ['OK']
      });
      await alerta.present();
      return;
    }

    const usuarioId = parseInt(localStorage.getItem('usuario_id') || '', 10);
    if (!usuarioId) {
      const alerta = await this.alertCtrl.create({
        header: 'Error',
        message: 'No se encontró el usuario logueado.',
        buttons: ['OK']
      });
      await alerta.present();
      return;
    }

    const pagos = this.obtenerPagos();

    if (pagos.length === 0) {
      const alerta = await this.alertCtrl.create({
        header: 'Error',
        message: 'Debes ingresar al menos un monto mayor a 0.',
        buttons: ['OK']
      });
      await alerta.present();
      return;
    }

    if (this.totalPagado !== Number(this.venta.totalVenta)) {
      const alerta = await this.alertCtrl.create({
        header: 'Error',
        message: 'La suma de los montos debe ser igual al total de la venta.',
        buttons: ['OK']
      });
      await alerta.present();
      return;
    }

    try {
      const res = await this.supabase.registrarVentaCompleta(
        this.venta.productos,
        0,
        this.venta.cliente.cliente_id,
        usuarioId,
        pagos
      );

      if (!res || !res.venta) {
        const alerta = await this.alertCtrl.create({
          header: 'Error',
          message: 'No se pudo registrar la venta.',
          buttons: ['OK']
        });
        await alerta.present();
        return;
      }

      this.mensajeService.enviarMensaje('actualizar inventario');
      this.mensajeService.enviarMensaje('actualizar ingresos');

      this.navCtrl.navigateForward(['/recibo', res.venta.venta_id]);
    } catch (error) {
      console.error('Error al confirmar venta:', error);

      const alerta = await this.alertCtrl.create({
        header: 'Error',
        message: 'Ocurrió un error al registrar la venta.',
        buttons: ['OK']
      });
      await alerta.present();
    }
  }
}