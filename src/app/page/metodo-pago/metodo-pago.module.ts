import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { MetodoPagoPageRoutingModule } from './metodo-pago-routing.module';
import { MetodoPagoPage } from './metodo-pago.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MetodoPagoPageRoutingModule
  ],
  declarations: [MetodoPagoPage]
})
export class MetodoPagoPageModule {}