import { Component, OnInit } from '@angular/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { Platform } from '@ionic/angular';
import { SwUpdate } from '@angular/service-worker';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {

  alertaActualizacionAbierta = false;
  modalActualizacionAbierto = false;

  constructor(
    private swUpdate: SwUpdate,
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
        color: '#001E87'
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

  mostrarAlertaNuevaVersion() {
    if (this.alertaActualizacionAbierta) {
      return;
    }

    this.alertaActualizacionAbierta = true;
    this.modalActualizacionAbierto = true;
  }

  async actualizarApp() {
    await this.swUpdate.activateUpdate();
    window.location.reload();
  }

  alCerrarModalActualizacion() {
    this.modalActualizacionAbierto = false;
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
