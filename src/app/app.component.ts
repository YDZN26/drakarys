import { Component, OnInit } from '@angular/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { AlertController, Platform } from '@ionic/angular';
import { SwUpdate } from '@angular/service-worker';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {

  alertaActualizacionAbierta = false;

  constructor(
    private swUpdate: SwUpdate,
    private alertController: AlertController,
    private platform: Platform
  ) {}

  ngOnInit() {
    this.configurarBarraSuperior();
    this.verificarActualizacionApp();
    this.verificarActualizacionAlVolverApp();
  }

  async configurarBarraSuperior() {
    if (Capacitor.isNativePlatform()) {
      await StatusBar.setOverlaysWebView({
        overlay: false
      });

      await StatusBar.setBackgroundColor({
        color: '#4b0082'
      });

      await StatusBar.setStyle({
        style: Style.Light
      });
    }
  }

  verificarActualizacionApp() {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates.subscribe((event) => {
        if (event.type === 'VERSION_READY') {
          this.mostrarAlertaNuevaVersion();
        }
      });

      this.swUpdate.checkForUpdate();
    }
  }

  async mostrarAlertaNuevaVersion() {
    if (this.alertaActualizacionAbierta) {
      return;
    }

    this.alertaActualizacionAbierta = true;

    const alert = await this.alertController.create({
      header: 'Nueva versión disponible',
      message: 'Se detectó una nueva actualización de la app. Actualiza para usar la última versión.',
      backdropDismiss: false,
      buttons: [
        {
          text: 'Actualizar',
          handler: async () => {
            await this.swUpdate.activateUpdate();
            window.location.reload();
          }
        }
      ]
    });

    await alert.present();

    await alert.onDidDismiss();
    this.alertaActualizacionAbierta = false;
  }

  verificarActualizacionAlVolverApp() {
    this.platform.resume.subscribe(() => {
      if (this.swUpdate.isEnabled) {
        this.swUpdate.checkForUpdate();
      }
    });
  }
}
