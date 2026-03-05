import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from 'src/app/supabase.service';
import { MensajeService } from 'src/app/mensaje.service'; // ✅ (AUMENTADO)

@Component({
  selector: 'app-crear-deuda',
  templateUrl: './crear-deuda.page.html',
  styleUrls: ['./crear-deuda.page.scss'],
})
export class CrearDeudaPage implements OnInit {

  clienteId: number | null = null;
  descripcion: string = '';
  totalDeuda: any = 0;

  // tipo de operación
  tipoOperacion: 'deuda' | 'prestamo' = 'deuda';

  // tipo de pago SOLO si es préstamo
  tipoPagoId: number | null = null;
  tiposDePago: any[] = [];

  clientes: any[] = [];

  constructor(
    private router: Router,
    private supabase: SupabaseService,
    private mensajeService: MensajeService 
  ) {}

  async ngOnInit() {
    this.clientes = await this.supabase.obtenerClientes();

    // cargar tipos de pago
    this.tiposDePago = await this.supabase.obtenerTiposDePago();
  }

  async guardarDeuda() {
    const total = Number(this.totalDeuda);

    if (!this.clienteId || !total || total <= 0) {
      console.log('Completar campos antes de guardar');
      return;
    }

    // validar tipo de pago SOLO si es préstamo
    if (this.tipoOperacion === 'prestamo') {
      if (!this.tipoPagoId || this.tipoPagoId <= 0) {
        console.log('Seleccionar tipo de pago para préstamo');
        return;
      }
    } else {
      // si es deuda normal, limpiar tipoPagoId para no arrastrar valores
      this.tipoPagoId = null;
    }

    const usuarioIdStr = localStorage.getItem('usuario_id');
    const usuarioId = usuarioIdStr ? Number(usuarioIdStr) : 0;

    if (!usuarioId || usuarioId <= 0) {
      console.error('No se encontró usuario_id en localStorage');
      return;
    }

    const deudaCreada = await this.supabase.crearDeuda({
      cliente_id: this.clienteId,
      usuario_id: usuarioId,
      monto_total: total,
      descripcion: this.descripcion
    });

    if (!deudaCreada) return;

    //si es préstamo, registrar gasto para descontar caja
    if (this.tipoOperacion === 'prestamo') {
      const clienteSel = this.clientes.find(c => c.cliente_id === this.clienteId);
      const nombreCliente = clienteSel ? `${clienteSel.nombre} ${clienteSel.apellido}`.trim() : 'Cliente';

      const descBase = (this.descripcion || '').trim();
      const descFinal = descBase.length > 0
        ? `Préstamo a ${nombreCliente}: ${descBase}`
        : `Préstamo a ${nombreCliente}`;

      const gastoCreado = await this.supabase.registrarGasto({
        monto: total,
        descripcion: descFinal,
        tipo_pago_id: this.tipoPagoId as number
      });

      if (!gastoCreado) return;

//avisar que se actualicen gastos en balance
this.mensajeService.enviarMensaje('actualizar gastos');
    }

    //avisar que se actualicen deudas
    this.mensajeService.enviarMensaje('actualizar deudas');

    this.router.navigateByUrl('/tab-inicial/deudas');
  }

  cancelar() {
    this.router.navigateByUrl('/tab-inicial/deudas');
  }
}