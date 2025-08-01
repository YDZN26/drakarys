import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { CierreCajaPageRoutingModule } from './cierre-caja-routing.module';

import { CierreCajaPage } from './cierre-caja.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CierreCajaPageRoutingModule
  ],
  declarations: [CierreCajaPage]
})
export class CierreCajaPageModule {}
