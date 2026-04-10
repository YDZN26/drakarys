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
              this.navCtrl.navigateBack('tab-inicial/balance');
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
      .select('total, tipo_pago_id, tipo_ingreso')
      .in('tipo_ingreso', ['venta', 'venta_libre', 'ingresos_varios', 'pago_deuda', 'ajuste_positivo'])
      .gte('fecha', inicioDelDia.toISOString())
      .lte('fecha', finDelDia.toISOString());

    let efectivoIngreso = 0;
    let transferenciaIngreso = 0;
    let tarjetaIngreso = 0;
    let totalIngreso = 0;

    ingresos?.forEach(i => {
      const total = Number(i.total) || 0;

      if (i.tipo_pago_id === 2) {
        efectivoIngreso += total;
      } else if (i.tipo_pago_id === 3) {
        transferenciaIngreso += total;
      } else if (i.tipo_pago_id === 4) {
        tarjetaIngreso += total;
      }

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

      if (g.tipo_pago_id === 2) {
        efectivoEgreso += monto;
      } else if (g.tipo_pago_id === 3) {
        transferenciaEgreso += monto;
      } else if (g.tipo_pago_id === 4) {
        tarjetaEgreso += monto;
      }

      totalEgreso += monto;
    });

    otrosEgresos?.forEach(e => {
      const monto = Number(e.total) || 0;

      if (e.tipo_pago_id === 2) {
        efectivoEgreso += monto;
      } else if (e.tipo_pago_id === 3) {
        transferenciaEgreso += monto;
      } else if (e.tipo_pago_id === 4) {
        tarjetaEgreso += monto;
      }

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
    const efectivoEsperado = this.obtenerEfectivoEsperado();
    const efectivoIngresado = Number(this.efectivoFinal) || 0;
    const diferencia = efectivoIngresado - efectivoEsperado;

    if (efectivoIngresado <= 0) {
      this.mensajeCaja = '';
      this.colorMensaje = 'success';
      return;
    }

    if (diferencia === 0) {
      this.mensajeCaja = `El efectivo coincide correctamente. Esperado: ${efectivoEsperado} Bs.`;
      this.colorMensaje = 'success';
    } else if (diferencia > 0) {
      this.mensajeCaja = `Sobran ${diferencia} Bs. (Saldo inicial ${this.saldoInicial} + ingresos en efectivo ${this.ingresosEfectivo} - egresos en efectivo ${this.egresosEfectivo} = esperado ${efectivoEsperado} Bs.)`;
      this.colorMensaje = '#082FF2';
    } else {
      this.mensajeCaja = `Faltan ${Math.abs(diferencia)} Bs. (Saldo inicial ${this.saldoInicial} + ingresos en efectivo ${this.ingresosEfectivo} - egresos en efectivo ${this.egresosEfectivo} = esperado ${efectivoEsperado} Bs.)`;
      this.colorMensaje = '#FF0000';
    }
  }

  async confirmarCierre() {
    if (this.cierreYaRegistrado) {
      const alerta = await this.alertCtrl.create({
        header: 'Cierre ya registrado',
        message: 'Ya existe un cierre de caja para el día de hoy.',
        buttons: ['ACEPTAR']
      });
      await alerta.present();
      return;
    }

    const inicioDelDia = this.obtenerInicioDelDia().toISOString();
    const finDelDia = this.obtenerFinDelDia().toISOString();
    const cierreDelDia = await this.supabaseService.obtenerCierreDelDia(inicioDelDia, finDelDia);

    if (cierreDelDia) {
      this.cierreYaRegistrado = true;
      const alerta = await this.alertCtrl.create({
        header: 'Cierre ya registrado',
        message: 'Ya existe un cierre de caja para el día de hoy. No se puede registrar otro cierre.',
        buttons: ['ACEPTAR']
      });
      await alerta.present();
      return;
    }

    const efectivoIngresado = Number(this.efectivoFinal) || 0;

    if (efectivoIngresado <= 0) {
      const alerta = await this.alertCtrl.create({
        header: 'Dato requerido',
        message: 'Debes ingresar el efectivo final de tu caja.',
        buttons: ['ACEPTAR']
      });
      await alerta.present();
      return;
    }

    if (!this.usuarioId || this.usuarioId <= 0) {
      const alerta = await this.alertCtrl.create({
        header: 'Usuario no encontrado',
        message: 'No se encontró el usuario logueado. Vuelve a iniciar sesión.',
        buttons: ['ACEPTAR']
      });
      await alerta.present();
      return;
    }

    const efectivoEsperado = this.obtenerEfectivoEsperado();
    const diferencia = efectivoIngresado - efectivoEsperado;

    if (diferencia !== 0) {
      await this.mostrarModalAdvertencia(diferencia);
    } else {
      await this.procesarRetiroYResumen(0);
    }
  }

  async mostrarModalAdvertencia(diferencia: number) {
    const alerta = await this.alertCtrl.create({
      header: 'Montos no coinciden',
      message: `¿Deseas continuar?\n\nEl sistema detectó una diferencia de ${diferencia} Bs.`,
      buttons: [
        { text: 'CANCELAR', role: 'cancel' },
        {
          text: 'SÍ, CONTINUAR',
          handler: () => {
            this.mostrarModalAjuste(diferencia);
          }
        }
      ]
    });

    await alerta.present();
  }

  async mostrarModalAjuste(diferencia: number) {
    const mensaje = diferencia > 0
      ? `Se añadirá ${diferencia} Bs. como ingreso por ajuste positivo.`
      : `Se registrará ${Math.abs(diferencia)} Bs. como egreso por ajuste negativo.`;

    const alerta = await this.alertCtrl.create({
      header: 'Ajuste de caja',
      message: mensaje,
      buttons: [
        { text: 'CANCELAR', role: 'cancel' },
        {
          text: 'ACEPTAR',
          handler: () => {
            this.procesarRetiroYResumen(diferencia);
          }
        }
      ]
    });

    await alerta.present();
  }

  async procesarRetiroYResumen(diferencia: number) {
    const alertaRetiro = await this.alertCtrl.create({
      header: '¿Deseas retirar efectivo?',
      inputs: [
        {
          name: 'retiro',
          type: 'number',
          placeholder: 'Monto a retirar (opcional)',
        }
      ],
      buttons: [
        { text: 'CANCELAR', role: 'cancel' },
        {
          text: 'ACEPTAR',
          handler: async (data) => {
            const montoRetiro = parseFloat(data.retiro) || 0;
            const efectivoIngresado = Number(this.efectivoFinal) || 0;
            const saldoFinalReal = efectivoIngresado - montoRetiro;

            if (montoRetiro < 0) {
              const alertaError = await this.alertCtrl.create({
                header: 'Monto inválido',
                message: 'El retiro no puede ser menor a 0.',
                buttons: ['ACEPTAR']
              });
              await alertaError.present();
              return false;
            }

            if (saldoFinalReal < 0) {
              const alertaError = await this.alertCtrl.create({
                header: 'Monto inválido',
                message: 'El retiro no puede ser mayor al efectivo ingresado en caja.',
                buttons: ['ACEPTAR']
              });
              await alertaError.present();
              return false;
            }

            let ajustePositivo = 0;
            let ajusteNegativo = 0;

            if (diferencia > 0) {
              const ajusteOk = await this.supabaseService.registrarAjustePositivo({
                total: diferencia,
                tipo_pago_id: 2,
                usuario_id: this.usuarioId,
                descripcion: 'Ajuste positivo por cierre de caja'
              });

              if (!ajusteOk) {
                const alertaError = await this.alertCtrl.create({
                  header: 'Error',
                  message: 'No se pudo registrar el ajuste positivo.',
                  buttons: ['ACEPTAR']
                });
                await alertaError.present();
                return false;
              }

              ajustePositivo = diferencia;
            }

            if (diferencia < 0) {
              const ajusteOk = await this.supabaseService.registrarAjusteNegativo({
                total: Math.abs(diferencia),
                tipo_pago_id: 2,
                usuario_id: this.usuarioId,
                descripcion: 'Ajuste negativo por cierre de caja'
              });

              if (!ajusteOk) {
                const alertaError = await this.alertCtrl.create({
                  header: 'Error',
                  message: 'No se pudo registrar el ajuste negativo.',
                  buttons: ['ACEPTAR']
                });
                await alertaError.present();
                return false;
              }

              ajusteNegativo = Math.abs(diferencia);
            }

            if (montoRetiro > 0) {
              const retiroOk = await this.supabaseService.registrarRetiroCaja({
                total: montoRetiro,
                tipo_pago_id: 2,
                usuario_id: this.usuarioId,
                descripcion: 'Retiro de efectivo realizado en cierre de caja'
              });

              if (!retiroOk) {
                const alertaError = await this.alertCtrl.create({
                  header: 'Error',
                  message: 'No se pudo registrar el retiro de caja.',
                  buttons: ['ACEPTAR']
                });
                await alertaError.present();
                return false;
              }
            }

            const totalIngresosFinal = this.totalIngresos + ajustePositivo;
            const totalEgresosFinal = this.totalEgresos + ajusteNegativo + montoRetiro;
            const ingresosEfectivoFinal = this.ingresosEfectivo + ajustePositivo;
            const egresosEfectivoFinal = this.egresosEfectivo + ajusteNegativo + montoRetiro;

            const cierre = {
              saldo_inicial: this.saldoInicial,
              ingresos_total: totalIngresosFinal,
              ingresos_efectivo: ingresosEfectivoFinal,
              ingresos_transferencia: this.ingresosTransferencia,
              ingresos_tarjeta: this.ingresosTarjeta,
              egresos_total: totalEgresosFinal,
              egresos_efectivo: egresosEfectivoFinal,
              egresos_transferencia: this.egresosTransferencia,
              egresos_tarjeta: this.egresosTarjeta,
              saldo_final: saldoFinalReal,
              efectivo_caja: efectivoIngresado,
              diferencia: diferencia,
              total_ingresos: totalIngresosFinal,
              total_egresos: totalEgresosFinal,
              usuario_id: this.usuarioId
            };

            const resultado = await this.supabaseService.registrarCierre(cierre);

            if (resultado) {
              this.cierreYaRegistrado = true;

              const alertaResumen = await this.alertCtrl.create({
                header: 'Resumen del Cierre',
                message:
`Ingresos: ${totalIngresosFinal} Bs.
Egresos: ${totalEgresosFinal} Bs.
Diferencia: ${diferencia > 0 ? '+' : ''}${diferencia} Bs.
Retiro: ${montoRetiro} Bs.
Saldo Final en Caja: ${saldoFinalReal} Bs.`,
                buttons: [
                  {
                    text: 'ACEPTAR',
                    handler: () => {
                      this.mensajeService.enviarMensaje('actualizar cierre');
                      this.navCtrl.navigateBack('tab-inicial/balance');
                    }
                  }
                ]
              });

              await alertaResumen.present();
            } else {
              const alertaError = await this.alertCtrl.create({
                header: 'Error',
                message: 'No se pudo registrar el cierre de caja.',
                buttons: ['ACEPTAR']
              });
              await alertaError.present();
            }

            return true;
          }
        }
      ]
    });

    await alertaRetiro.present();
  }
}