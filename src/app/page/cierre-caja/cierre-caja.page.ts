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

  mostrarModalResumen: boolean = false;
  resumenRetiro: number = 0;
  resumenSaldoFinal: number = 0;

  mostrarModalCierreRegistrado: boolean = false;
  volverBalanceDesdeResumen: boolean = false;
  volverBalanceDesdeCierreRegistrado: boolean = false;

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
      this.mostrarModalCierreRegistrado = true;
    }
  }

  async cargarDatosDelDia() {
    const inicioDelDia = this.obtenerInicioDelDia();
    const finDelDia = this.obtenerFinDelDia();

    const cierreAnterior = await this.supabaseService.obtenerUltimoCierreAntesDe(inicioDelDia.toISOString());
    this.saldoInicial = Number(cierreAnterior?.saldo_final) || 0;

    const resumen = await this.supabaseService.calcularResumenCajaPorFecha(
      inicioDelDia.toISOString(),
      finDelDia.toISOString()
    );

    this.ingresosEfectivo = resumen.ingresosEfectivo;
    this.ingresosTransferencia = resumen.ingresosTransferencia;
    this.ingresosTarjeta = resumen.ingresosTarjeta;
    this.totalIngresos = resumen.ingresosTotal;

    this.egresosEfectivo = resumen.egresosEfectivo;
    this.egresosTransferencia = resumen.egresosTransferencia;
    this.egresosTarjeta = resumen.egresosTarjeta;
    this.totalEgresos = resumen.egresosTotal;

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

    if (efectivo < 0) {
      return;
    }

    const diferencia = efectivo - this.obtenerEfectivoEsperado();

    if (diferencia !== 0) {
      await this.mostrarModalAdvertencia(diferencia);
    } else {
      await this.mostrarModalRetiro(diferencia);
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
          handler: () => this.mostrarModalRetiro(diferencia)
        }
      ]
    });

    await alerta.present();
  }

  async mostrarModalRetiro(diferencia: number) {
    const efectivo = Number(this.efectivoFinal) || 0;

    const alerta = await this.alertCtrl.create({
      header: 'Retiro de efectivo',
      message: 'Ingresa el monto que deseas retirar de caja.',
      inputs: [
        {
          name: 'retiro',
          type: 'number',
          min: 0,
          placeholder: '0'
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Continuar',
          handler: (data) => {
            const retiro = Number(data.retiro) || 0;

            if (retiro < 0 || retiro > efectivo) {
              this.mostrarMensaje('El retiro no puede ser mayor al efectivo de caja.');
              return false;
            }

            this.procesarRetiroYResumen(diferencia, retiro);
            return true;
          }
        }
      ]
    });

    await alerta.present();
  }

  async procesarRetiroYResumen(diferencia: number, retiro: number) {
    if (diferencia > 0) {
      const ajuste = await this.supabaseService.registrarAjustePositivo({
        total: diferencia,
        tipo_pago_id: 2,
        usuario_id: this.usuarioId,
        descripcion: 'Sobrante de cierre de caja'
      });

      if (!ajuste) return;
    }

    if (diferencia < 0) {
      const ajuste = await this.supabaseService.registrarAjusteNegativo({
        total: Math.abs(diferencia),
        tipo_pago_id: 2,
        usuario_id: this.usuarioId,
        descripcion: 'Faltante de cierre de caja'
      });

      if (!ajuste) return;
    }

    if (retiro > 0) {
      const retiroRegistrado = await this.supabaseService.registrarRetiroCaja({
        total: retiro,
        tipo_pago_id: 2,
        usuario_id: this.usuarioId,
        descripcion: 'Retiro de efectivo al cierre de caja'
      });

      if (!retiroRegistrado) return;
    }

    await this.cargarDatosDelDia();

    const efectivo = Number(this.efectivoFinal) || 0;
    const saldoFinal = efectivo - retiro;

    const cierre = {
      saldo_inicial: this.saldoInicial,
      ingresos_total: this.totalIngresos,
      ingresos_efectivo: this.ingresosEfectivo,
      ingresos_transferencia: this.ingresosTransferencia,
      ingresos_tarjeta: this.ingresosTarjeta,
      egresos_total: this.totalEgresos,
      egresos_efectivo: this.egresosEfectivo,
      egresos_transferencia: this.egresosTransferencia,
      egresos_tarjeta: this.egresosTarjeta,
      saldo_final: saldoFinal,
      efectivo_caja: efectivo,
      diferencia: diferencia,
      usuario_id: this.usuarioId,
      total_ingresos: this.totalIngresos,
      total_egresos: this.totalEgresos
    };

    const ok = await this.supabaseService.registrarCierre(cierre);

    if (ok) {
      this.mensajeService.enviarMensaje('actualizar cierre');
      this.mostrarResumenFinal(retiro, saldoFinal);
    }
  }

  mostrarResumenFinal(retiro: number, saldoFinal: number) {
    this.resumenRetiro = retiro;
    this.resumenSaldoFinal = saldoFinal;
    this.mostrarModalResumen = true;
  }

  cerrarModalResumen() {
    this.volverBalanceDesdeResumen = true;
    this.mostrarModalResumen = false;
  }

  alCerrarModalResumen() {
    if (this.volverBalanceDesdeResumen) {
      this.volverBalanceDesdeResumen = false;
      this.navCtrl.navigateBack('/tab-inicial/balance');
    }
  }

  cerrarModalCierreRegistrado() {
    this.volverBalanceDesdeCierreRegistrado = true;
    this.mostrarModalCierreRegistrado = false;
  }

  alCerrarModalCierreRegistrado() {
    if (this.volverBalanceDesdeCierreRegistrado) {
      this.volverBalanceDesdeCierreRegistrado = false;
      this.navCtrl.navigateBack('/tab-inicial/balance');
    }
  }

  async mostrarMensaje(mensaje: string) {
    const alerta = await this.alertCtrl.create({
      header: 'Aviso',
      message: mensaje,
      buttons: ['ACEPTAR']
    });

    await alerta.present();
  }
}