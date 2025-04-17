import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';
import { createClient } from '@supabase/supabase-js';
import { environment } from 'src/environments/environment';

const supabase = createClient(environment.supabaseUrl, environment.supabaseKey);

@Component({
  selector: 'app-nuevo-gasto',
  templateUrl: './nuevo-gasto.page.html',
  styleUrls: ['./nuevo-gasto.page.scss'],
})
export class NuevoGastoPage {
  monto: number = 0;
  descripcion: string = '';
  tipoPago: number | null = null;

  constructor(private navCtrl: NavController) {}

  async agregarGasto() {
    const usuarioGuardado = localStorage.getItem('usuario_id');
    const usuario_id = usuarioGuardado ? parseInt(usuarioGuardado) : null;

    if (
      this.monto === null || this.monto <= 0 ||
      !this.descripcion.trim() ||
      this.tipoPago === null ||
      usuario_id === null
    ) {
      alert('Por favor completa todos los campos');
      return;
    }
    

    const { error } = await supabase.from('gasto').insert([
      {
        monto: this.monto,
        descripcion: this.descripcion,
        tipo_pago_id: this.tipoPago,
        usuario_id,
        por_pagar: false,
        fecha: new Date().toISOString(),
      }
    ]);

    if (error) {
      console.error('Error al guardar el gasto:', error);
      alert('No se pudo guardar el gasto.');
    } else {
      alert('Gasto guardado correctamente');
      this.navCtrl.navigateBack('/tab-inicial/balance');
    }
  }
  esFormularioValido(): boolean {
    return (
      this.monto > 0 &&
      this.descripcion.trim().length > 0 &&
      this.tipoPago !== null
    );
  }
  
}

