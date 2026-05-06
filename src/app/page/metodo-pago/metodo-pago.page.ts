import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertController, NavController } from '@ionic/angular';
import { SupabaseService } from 'src/app/supabase.service';
import { MensajeService } from 'src/app/mensaje.service';
import { LoadingService } from 'src/app/services/loading.service';

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

  numeroPagosSeleccionado: number = 1;

  modoEditar: boolean = false;
  ventaIdEditar: number = 0;

  stockMinimo: number = 5;

  constructor(
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private alertCtrl: AlertController,
    private supabase: SupabaseService,
    private mensajeService: MensajeService,
    private loadingService: LoadingService
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

      if (params['modo'] === 'editar') {
        this.modoEditar = true;
      }

      if (params['ventaId']) {
        this.ventaIdEditar = Number(params['ventaId']);
      }

      this.seleccionarNumeroPagos(1);
    });
  }

  seleccionarNumeroPagos(numero: number) {
    this.numeroPagosSeleccionado = numero;

    const total = Number(this.venta.totalVenta || 0);

    if (numero === 1) {
      this.montoEfectivo = this.redondearMonto(total);
      this.montoTransferencia = 0;
      this.montoTarjeta = 0;
      return;
    }

    if (numero === 2) {
      const montoDividido = this.dividirMonto(total, 2);

      this.montoEfectivo = montoDividido[0];
      this.montoTransferencia = montoDividido[1];
      this.montoTarjeta = 0;
      return;
    }

    if (numero === 3) {
      const montoDividido = this.dividirMonto(total, 3);

      this.montoEfectivo = montoDividido[0];
      this.montoTransferencia = montoDividido[1];
      this.montoTarjeta = montoDividido[2];
      return;
    }
  }

  dividirMonto(total: number, partes: number): number[] {
    const montoBase = this.redondearMonto(total / partes);
    const montos: number[] = [];
    let totalAsignado = 0;

    for (let i = 0; i < partes; i++) {
      if (i === partes - 1) {
        montos.push(this.redondearMonto(total - totalAsignado));
      } else {
        montos.push(montoBase);
        totalAsignado = this.redondearMonto(totalAsignado + montoBase);
      }
    }

    return montos;
  }

  redondearMonto(monto: number): number {
    return Number(Number(monto || 0).toFixed(2));
  }

  get totalPagado(): number {
    return this.redondearMonto(
      Number(this.montoEfectivo || 0)
      + Number(this.montoTransferencia || 0)
      + Number(this.montoTarjeta || 0)
    );
  }

  get diferencia(): number {
    return this.redondearMonto(Number(this.venta.totalVenta || 0) - this.totalPagado);
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

  private async obtenerProductosVendidosConStockBajo() {
    const productosActualizados = await this.supabase.obtenerProductos();

    const idsVendidos = this.venta.productos.map((producto: any) => {
      return Number(producto.producto_id);
    });

    return productosActualizados.filter((producto: any) => {
      const productoVendido = idsVendidos.includes(Number(producto.producto_id));
      const stockExhibicion = Number(producto.stock_exhibicion || 0);

      return productoVendido && stockExhibicion <= this.stockMinimo;
    });
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

    if (this.redondearMonto(this.totalPagado) !== this.redondearMonto(Number(this.venta.totalVenta))) {
      const alerta = await this.alertCtrl.create({
        header: 'Error',
        message: 'La suma de los montos debe ser igual al total de la venta.',
        buttons: ['OK']
      });
      await alerta.present();
      return;
    }

    let loadingCerrado = false;

    await this.loadingService.mostrarLoading(
      this.modoEditar ? 'Actualizando venta...' : 'Registrando venta...'
    );

    try {
      let res: any = null;

      if (this.modoEditar) {
        res = await this.supabase.actualizarVentaExistente(
          this.ventaIdEditar,
          this.venta.productos,
          this.venta.cliente.cliente_id,
          usuarioId,
          pagos
        );
      } else {
        res = await this.supabase.registrarVentaCompleta(
          this.venta.productos,
          0,
          this.venta.cliente.cliente_id,
          usuarioId,
          pagos
        );
      }

      if (!res || !res.venta) {
        const alerta = await this.alertCtrl.create({
          header: 'Error',
          message: this.modoEditar
            ? 'No se pudo actualizar la venta.'
            : 'No se pudo registrar la venta.',
          buttons: ['OK']
        });
        await alerta.present();
        return;
      }

      this.mensajeService.enviarMensaje('actualizar inventario');
      this.mensajeService.enviarMensaje('actualizar ingresos');

      const productosStockBajo = await this.obtenerProductosVendidosConStockBajo();

      await this.loadingService.cerrarLoading();
      loadingCerrado = true;

      this.navCtrl.navigateForward(['/recibo', res.venta.venta_id], {
        queryParams: {
          productosStockBajo: JSON.stringify(productosStockBajo)
        }
      });

    } catch (error) {
      console.error('Error al confirmar venta:', error);

      const alerta = await this.alertCtrl.create({
        header: 'Error',
        message: this.modoEditar
          ? 'Ocurrió un error al actualizar la venta.'
          : 'Ocurrió un error al registrar la venta.',
        buttons: ['OK']
      });
      await alerta.present();

    } finally {
      if (!loadingCerrado) {
        await this.loadingService.cerrarLoading();
      }
    }
  }
}
