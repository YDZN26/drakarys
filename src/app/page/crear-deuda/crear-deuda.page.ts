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

  clientes: any[] = [];

  constructor(
    private router: Router,
    private supabase: SupabaseService,
    private mensajeService: MensajeService // ✅ (AUMENTADO)
  ) {}

  async ngOnInit() {
    this.clientes = await this.supabase.obtenerClientes();
  }

  async guardarDeuda() {
    const total = Number(this.totalDeuda);

    if (!this.clienteId || !total || total <= 0) {
      console.log('Completar campos antes de guardar');
      return;
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

    // ✅ (AUMENTADO) avisar que se actualicen deudas
    this.mensajeService.enviarMensaje('actualizar deudas');

    // ✅ volver a la lista
    this.router.navigateByUrl('/tab-inicial/deudas');
  }

  cancelar() {
    this.router.navigateByUrl('/tab-inicial/deudas');
  }
}