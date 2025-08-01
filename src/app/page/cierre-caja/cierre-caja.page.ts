import { Component, OnInit } from '@angular/core';
import { SupabaseService } from '../../supabase.service';
import { AlertController, NavController } from '@ionic/angular';

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

  constructor(
    private supabaseService: SupabaseService,
    private navCtrl: NavController,
    private alertCtrl: AlertController
  ) {}

  async ngOnInit() {
    await this.cargarDatosDelDia();
  }

  async cargarDatosDelDia() {
    const { data: cierreData } = await this.supabaseService.getSupabase()
      .from('cierre')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(1)
      .single();

    this.saldoInicial = cierreData?.saldo_final || 0;

    const inicioDelDia = new Date();
    inicioDelDia.setHours(0, 0, 0, 0);
    const finDelDia = new Date();
    finDelDia.setHours(23, 59, 59, 999);

    const { data: ingresos } = await this.supabaseService.getSupabase()
      .from('venta')
      .select(`total, tipo_pago_id`)
      .gte('fecha', inicioDelDia.toISOString())
      .lte('fecha', finDelDia.toISOString());

    let efectivoIngreso = 0;
    let transferenciaIngreso = 0;
    let tarjetaIngreso = 0;
    let totalIngreso = 0;

    ingresos?.forEach(i => {
      if (i.tipo_pago_id === 2) efectivoIngreso += i.total;
      else if (i.tipo_pago_id === 3) transferenciaIngreso += i.total;
      else if (i.tipo_pago_id === 4) tarjetaIngreso += i.total;
      totalIngreso += i.total;
    });

    this.ingresosEfectivo = efectivoIngreso;
    this.ingresosTransferencia = transferenciaIngreso;
    this.ingresosTarjeta = tarjetaIngreso;
    this.totalIngresos = totalIngreso;

    const { data: egresos } = await this.supabaseService.getSupabase()
      .from('gasto')
      .select(`monto, tipo_pago_id`)
      .gte('fecha', inicioDelDia.toISOString())
      .lte('fecha', finDelDia.toISOString());

    let efectivoEgreso = 0;
    let transferenciaEgreso = 0;
    let tarjetaEgreso = 0;
    let totalEgreso = 0;

    egresos?.forEach(e => {
      if (e.tipo_pago_id === 2) efectivoEgreso += e.monto;
      else if (e.tipo_pago_id === 3) transferenciaEgreso += e.monto;
      else if (e.tipo_pago_id === 4) tarjetaEgreso += e.monto;
      totalEgreso += e.monto;
    });

    this.egresosEfectivo = efectivoEgreso;
    this.egresosTransferencia = transferenciaEgreso;
    this.egresosTarjeta = tarjetaEgreso;
    this.totalEgresos = totalEgreso;

    this.balance = this.saldoInicial + this.totalIngresos - this.totalEgresos;
  }

  calcularDiferenciaEfectivo() {
    const efectivoEsperado = this.ingresosEfectivo - this.egresosEfectivo;
    const diferencia = this.efectivoFinal - efectivoEsperado;

    if (diferencia === 0) {
      this.mensajeCaja = '';
      this.colorMensaje = 'success';
    } else if (diferencia > 0) {
      this.mensajeCaja = `Sobran: ${diferencia} Bs. (Ingresos ${this.ingresosEfectivo} Bs. - ${this.egresosEfectivo} Bs. = ${this.efectivoFinal} Bs.)`;
      this.colorMensaje = '#082FF2';
    } else {
      this.mensajeCaja = `Faltan: ${Math.abs(diferencia)} Bs. (Ingresos ${this.ingresosEfectivo} Bs. - ${this.egresosEfectivo} Bs. = ${this.efectivoFinal} Bs.)`;
      this.colorMensaje = '#FF0000';
    }
  }

  async confirmarCierre() {
    const efectivoEsperado = this.ingresosEfectivo - this.egresosEfectivo;
    const diferencia = this.efectivoFinal - efectivoEsperado;

    if (diferencia !== 0) {
      this.mostrarModalAdvertencia(diferencia);
    } else {
      this.procesarRetiroYResumen(0);
    }
  }

  async mostrarModalAdvertencia(diferencia: number) {
    const alerta = await this.alertCtrl.create({
      header: 'Montos no coinciden',
      message: `¿Deseas continuar?\n\nEl sistema detectó una diferencia de ${diferencia} Bs.`,
      buttons: [
        {
          text: 'CANCELAR',
          role: 'cancel'
        },
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
      ? `Se añadirá ${diferencia} Bs. como ingreso adicional.`
      : `Se registrará ${Math.abs(diferencia)} Bs. como gasto por faltante.`;

    const alerta = await this.alertCtrl.create({
      header: 'Ajuste de caja',
      message: mensaje,
      buttons: [
        {
          text: 'CANCELAR',
          role: 'cancel'
        },
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
        {
          text: 'CANCELAR',
          role: 'cancel'
        },
        {
          text: 'ACEPTAR',
          handler: async (data) => {
            const montoRetiro = parseFloat(data.retiro) || 0;
            const saldoFinalReal = this.balance + diferencia - montoRetiro;

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
              saldo_final: saldoFinalReal,
              efectivo_caja: this.efectivoFinal,
              retiro: montoRetiro,
              ajuste: diferencia,
              usuario_id: 1
            };

            const resultado = await this.supabaseService.registrarCierre(cierre);

            if (resultado) {
              await this.alertCtrl.create({
                header: 'Resumen del Cierre',
                message:
`Ingresos: ${this.totalIngresos} Bs.
Egresos: ${this.totalEgresos} Bs.
Diferencia: ${diferencia > 0 ? '+' : ''}${diferencia} Bs.
Retiro: ${montoRetiro} Bs.
Saldo Final: ${saldoFinalReal} Bs.`,
                buttons: [{
                  text: 'ACEPTAR',
                  handler: () => {
                    this.navCtrl.navigateBack('/balance');
                  }
                }]
              }).then(alerta => alerta.present());
            } else {
              console.error('Error al registrar el cierre');
            }
          }
        }
      ]
    });

    await alertaRetiro.present();
  }
}
