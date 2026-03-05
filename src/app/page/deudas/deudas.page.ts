import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from 'src/app/supabase.service';
import { MensajeService } from 'src/app/mensaje.service';
import { Subscription } from 'rxjs';

interface ClienteDeudaView {
  id: number;               // deuda_id
  clienteId: number;        // cliente_id
  total: number;            // monto_total
  montoPagado: number;      // total_pagado
  montoFaltante: number;    // saldo
  nombreCliente: string;    // nombre + apellido
  estado: string;           // pendiente / pagada
  descripcion: string;      // descripcion de la deuda
}

@Component({
  selector: 'app-deudas',
  templateUrl: './deudas.page.html',
  styleUrls: ['./deudas.page.scss'],
})
export class DeudasPage implements OnInit, OnDestroy {

  selectedCliente: number | null = null;
  pago: any = 0;

  tipoPagoId: number = 0;
  tiposDePago: any[] = [];

  clientes: ClienteDeudaView[] = [];

  private mensajeSub!: Subscription;

  constructor(
    private router: Router,
    private supabase: SupabaseService,
    private mensajeService: MensajeService
  ) {}

  async ngOnInit() {
    this.tiposDePago = await this.supabase.obtenerTiposDePago();

    this.mensajeSub = this.mensajeService.mensaje$.subscribe(async (mensaje: string) => {
      if (mensaje === 'actualizar deudas') {
        await this.cargarDeudas();
      }
    });
  }

  ngOnDestroy() {
    if (this.mensajeSub) this.mensajeSub.unsubscribe();
  }

  async ionViewWillEnter() {
    await this.cargarDeudas();
  }

  async cargarDeudas() {
    const data = await this.supabase.obtenerDeudas();

    this.clientes = (data || []).map((d: any) => {
      const nombre = d.cliente ? `${d.cliente.nombre} ${d.cliente.apellido}`.trim() : '';
      const total = Number(d.monto_total || 0);
      const pagado = Number(d.total_pagado || 0);
      const saldo = Number(d.saldo || 0);
      const estado = String(d.estado || 'pendiente');

      const descripcion = String(d.descripcion || '');

      return {
        id: d.deuda_id,
        clienteId: d.cliente_id,
        total,
        montoPagado: pagado,
        montoFaltante: saldo,
        nombreCliente: nombre,
        estado,
        descripcion
      };
    });
  }

  toggleMenu(clienteId: number) {
    this.selectedCliente = this.selectedCliente === clienteId ? null : clienteId;
  }

  // convertir a número para usar en el HTML sin Number()
  toNumber(valor: any): number {
    const n = parseFloat(valor);
    return isNaN(n) ? 0 : n;
  }

  async pagar(deuda: ClienteDeudaView) {
    const monto = Number(this.pago);

    if (!deuda || !deuda.id) return;

    if (deuda.montoFaltante <= 0 || deuda.estado === 'pagada') {
      console.log('Esta deuda ya está pagada');
      return;
    }

    if (!monto || monto <= 0) {
      console.log('Monto inválido');
      return;
    }

    // no permitir pagar más que el saldo
    if (monto > deuda.montoFaltante) {
      console.log('El monto ingresado supera el saldo de la deuda');
      return;
    }

    if (!this.tipoPagoId || this.tipoPagoId <= 0) {
      console.log('Seleccionar tipo de pago');
      return;
    }

    const usuarioIdStr = localStorage.getItem('usuario_id');
    const usuarioId = usuarioIdStr ? Number(usuarioIdStr) : 0;

    if (!usuarioId || usuarioId <= 0) {
      console.error('No se encontró usuario_id en localStorage');
      return;
    }

    const result = await this.supabase.registrarPagoDeuda({
      deuda_id: deuda.id,
      monto: monto,
      tipo_pago_id: this.tipoPagoId,
      usuario_id: usuarioId,
      descripcion: 'Pago de deuda'
    });

    if (!result) return;

    this.pago = 0;
    this.tipoPagoId = 0;
    this.selectedCliente = null;

    await this.cargarDeudas();
  }

  get totalPorCobrar(): number {
    return this.clientes
      .filter(c => c.montoFaltante > 0)
      .reduce((sum, c) => sum + c.montoFaltante, 0);
  }

  get cantidadClientesConDeuda(): number {
    return this.clientes
      .filter(c => c.montoFaltante > 0)
      .length;
  }

  crearDeuda() {
    console.log('Botón Crear Deuda presionado');
    this.router.navigate(['/crear-deuda']);
  }
}