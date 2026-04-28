import { Component, OnInit } from '@angular/core';
import { SupabaseService } from '../../supabase.service';
import { AlertController, NavController } from '@ionic/angular';
import { MensajeService } from 'src/app/mensaje.service';

@Component({
  selector: 'app-cierre-caja',
  templateUrl: './cierre-caja.page.html',
  styleUrls: ['./cierre-caja.page.scss'],
})
export class CierreCajaPage implements OnInit {

  saldoInicial: number = 0;
  totalIngresos: number = 0;
  ingresosEfectivo: number = 0;
  ingresosTransferencia: number = 0;
  ingresosTarjeta: number = 0;

  totalEgresos: number = 0;
  egresosEfectivo: number = 0;
  egresosTransferencia: number = 0;
  egresosTarjeta: number = 0;

  balance: number = 0;
  efectivoFinal: number = 0;

  mensajeCaja: string = '';
  colorMensaje: string = 'primary';

  usuarioId: number = 0;
  cierreYaRegistrado: boolean = false;

  constructor(
    private supabaseService: SupabaseService,
    private navCtrl: NavController,
    private alertCtrl: AlertController,
    private mensajeService: MensajeService
  ) {}

  async ngOnInit() {
    this.usuarioId = this.supabaseService.obtenerUsuarioLogueadoId();
    await this.validarSiYaExisteCierreDelDia();
    await this.cargarDatosDelDia();
  }

  cancelar() {
    this.navCtrl.navigateBack('/tab-inicial/balance');
  }

  private obtenerInicioDelDia(): Date {
    const inicioDelDia = new Date();
    inicioDelDia.setHours(0, 0, 0, 0);
    return inicioDelDia;
  }

  private obtenerFinDelDia(): Date {
    const finDelDia = new Date();
    finDelDia.setHours(23, 59, 59, 999);
    return finDelDia;
  }

  private obtenerEfectivoEsperado(): number {
    return this.saldoInicial + this.ingresosEfectivo - this.egresosEfectivo;
  }

  async validarSiYaExisteCierreDelDia() {
    const inicioDelDia = this.obtenerInicioDelDia().toISOString();
    const finDelDia = this.obtenerFinDelDia().toISOString();

    const cierreDelDia = await this.supabaseService.obtenerCierreDelDia(inicioDelDia, finDelDia);
    this.cierreYaRegistrado = !!cierreDelDia;

    if (this.cierreYaRegistrado) {
      const alerta = await this.alertCtrl.create({
        header: 'Cierre ya registrado',
        message: 'Ya existe un cierre de caja para el día de hoy. No se puede registrar otro cierre.',
        buttons: [
          {
            text: 'ACEPTAR',
            handler: () => {
              this.navCtrl.navigateBack('/tab-inicial/balance');
            }
          }
        ]
      });

      await alerta.present();
    }
  }

  async cargarDatosDelDia() {
    const inicioDelDia = this.obtenerInicioDelDia();
    const finDelDia = this.obtenerFinDelDia();

    const cierreAnterior = await this.supabaseService.obtenerUltimoCierreAntesDe(inicioDelDia.toISOString());
    this.saldoInicial = Number(cierreAnterior?.saldo_final) || 0;

    const { data: ingresos } = await this.supabaseService.getSupabase()
      .from('ingreso')
      .select('total, tipo_pago_id, tipo_ingreso, estado')
      .in('tipo_ingreso', ['venta', 'venta_libre', 'ingresos_varios', 'pago_deuda', 'ajuste_positivo'])
      .eq('estado', true)
      .gte('fecha', inicioDelDia.toISOString())
      .lte('fecha', finDelDia.toISOString());

    let efectivoIngreso = 0;
    let transferenciaIngreso = 0;
    let tarjetaIngreso = 0;
    let totalIngreso = 0;

    ingresos?.forEach(i => {
      const total = Number(i.total) || 0;

      if (i.tipo_pago_id === 2) efectivoIngreso += total;
      else if (i.tipo_pago_id === 3) transferenciaIngreso += total;
      else if (i.tipo_pago_id === 4) tarjetaIngreso += total;

      totalIngreso += total;
    });

    this.ingresosEfectivo = efectivoIngreso;
    this.ingresosTransferencia = transferenciaIngreso;
    this.ingresosTarjeta = tarjetaIngreso;
    this.totalIngresos = totalIngreso;

    const { data: gastos } = await this.supabaseService.getSupabase()
      .from('gasto')
      .select('monto, tipo_pago_id')
      .gte('fecha', inicioDelDia.toISOString())
      .lte('fecha', finDelDia.toISOString());

    const { data: otrosEgresos } = await this.supabaseService.getSupabase()
      .from('egreso')
      .select('total, tipo_pago_id, tipo_egreso')
      .in('tipo_egreso', ['ajuste_negativo', 'retiro_caja'])
      .gte('fecha', inicioDelDia.toISOString())
      .lte('fecha', finDelDia.toISOString());

    let efectivoEgreso = 0;
    let transferenciaEgreso = 0;
    let tarjetaEgreso = 0;
    let totalEgreso = 0;

    gastos?.forEach(g => {
      const monto = Number(g.monto) || 0;

      if (g.tipo_pago_id === 2) efectivoEgreso += monto;
      else if (g.tipo_pago_id === 3) transferenciaEgreso += monto;
      else if (g.tipo_pago_id === 4) tarjetaEgreso += monto;

      totalEgreso += monto;
    });

    otrosEgresos?.forEach(e => {
      const monto = Number(e.total) || 0;

      if (e.tipo_pago_id === 2) efectivoEgreso += monto;
      else if (e.tipo_pago_id === 3) transferenciaEgreso += monto;
      else if (e.tipo_pago_id === 4) tarjetaEgreso += monto;

      totalEgreso += monto;
    });

    this.egresosEfectivo = efectivoEgreso;
    this.egresosTransferencia = transferenciaEgreso;
    this.egresosTarjeta = tarjetaEgreso;
    this.totalEgresos = totalEgreso;

    this.balance = this.saldoInicial + this.totalIngresos - this.totalEgresos;

    this.calcularDiferenciaEfectivo();
  }

  calcularDiferenciaEfectivo() {
    const esperado = this.obtenerEfectivoEsperado();
    const ingresado = Number(this.efectivoFinal) || 0;
    const diferencia = ingresado - esperado;

    if (ingresado <= 0) {
      this.mensajeCaja = '';
      return;
    }

    if (diferencia === 0) {
      this.mensajeCaja = `El efectivo coincide correctamente.`;
      this.colorMensaje = 'success';
    } else if (diferencia > 0) {
      this.mensajeCaja = `Sobran ${diferencia} Bs.`;
      this.colorMensaje = '#082FF2';
    } else {
      this.mensajeCaja = `Faltan ${Math.abs(diferencia)} Bs.`;
      this.colorMensaje = '#FF0000';
    }
  }

  async confirmarCierre() {
    if (this.cierreYaRegistrado) return;

    const efectivo = Number(this.efectivoFinal) || 0;
    if (efectivo <= 0) return;

    const diferencia = efectivo - this.obtenerEfectivoEsperado();

    if (diferencia !== 0) {
      await this.mostrarModalAdvertencia(diferencia);
    } else {
      await this.procesarRetiroYResumen(0);
    }
  }

  async mostrarModalAdvertencia(diferencia: number) {
    const alerta = await this.alertCtrl.create({
      header: 'Montos no coinciden',
      message: `Diferencia: ${diferencia} Bs.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Continuar',
          handler: () => this.mostrarModalAjuste(diferencia)
        }
      ]
    });

    await alerta.present();
  }

  async mostrarModalAjuste(diferencia: number) {
    const alerta = await this.alertCtrl.create({
      header: 'Ajuste de caja',
      message: diferencia > 0 ? 'Se añadirá como ingreso.' : 'Se registrará como egreso.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Aceptar',
          handler: () => this.procesarRetiroYResumen(diferencia)
        }
      ]
    });

    await alerta.present();
  }

  async procesarRetiroYResumen(diferencia: number) {
    const retiro = 0;
    const efectivo = Number(this.efectivoFinal) || 0;
    const saldoFinal = efectivo - retiro;

    const cierre = {
      saldo_inicial: this.saldoInicial,
      ingresos_total: this.totalIngresos,
      egresos_total: this.totalEgresos,
      saldo_final: saldoFinal,
      efectivo_caja: efectivo,
      diferencia: diferencia,
      usuario_id: this.usuarioId
    };

    const ok = await this.supabaseService.registrarCierre(cierre);

    if (ok) {
      this.mensajeService.enviarMensaje('actualizar cierre');
      this.navCtrl.navigateBack('/tab-inicial/balance');
    }
  }
}
