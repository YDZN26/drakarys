import { Component, OnInit } from '@angular/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {

  constructor() {}

  ngOnInit() {
    this.configurarBarraSuperior();
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
}