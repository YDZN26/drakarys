import { Component, OnInit } from '@angular/core';
import { SupabaseService } from 'src/app/supabase.service';
import { NavController, ToastController } from '@ionic/angular';
import { MensajeService } from 'src/app/mensaje.service';

@Component({
  selector: 'app-venta-libre',
  templateUrl: './venta-libre.page.html',
  styleUrls: ['./venta-libre.page.scss'],
})
export class VentaLibrePage implements OnInit {

  montoTotal: number = 0;
  descripcion: string = '';
  tipoPagoId: number = 0; // ← corregido aquí
  tiposDePago: any[] = [];

  constructor(
    private supabaseService: SupabaseService,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private mensajeService: MensajeService
  ) {}

  async ngOnInit() {
    try {
      this.tiposDePago = await this.supabaseService.obtenerTiposDePago();
    } catch (error) {
      console.error('Error cargando tipos de pago:', error);
    }
  }

  async registrarVentaLibre() {
    const usuario_id = localStorage.getItem('usuario_id');

    if (!this.montoTotal || !this.tipoPagoId || !this.descripcion || !usuario_id) {
      this.mostrarToast('Completa todos los campos');
      return;
    }

    const venta = await this.supabaseService.registrarVentaLibreConIngreso({
      monto: this.montoTotal,
      descripcion: this.descripcion,
      tipo_pago_id: this.tipoPagoId,
      usuario_id: parseInt(usuario_id)
    });

    if (!venta) {
      this.mostrarToast('Error al registrar la venta');
    } else {
      this.mostrarToast('Venta registrada correctamente');
      this.mensajeService.enviarMensaje('actualizar ingresos');
      this.navCtrl.navigateBack('/balance');
    }
  }

  async mostrarToast(mensaje: string) {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 2000,
      color: 'dark'
    });
    await toast.present();
  }
}
