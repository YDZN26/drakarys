import { Injectable } from '@angular/core';
import { LoadingController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {

  private loading: HTMLIonLoadingElement | null = null;

  constructor(private loadingCtrl: LoadingController) { }

  async mostrarLoading(mensaje: string = 'Cargando...') {
    this.loading = await this.loadingCtrl.create({
      message: mensaje,
      spinner: 'crescent',
      backdropDismiss: false
    });

    await this.loading.present();
  }

  async cerrarLoading() {
    if (this.loading) {
      await this.loading.dismiss();
      this.loading = null;
    }
  }
}
