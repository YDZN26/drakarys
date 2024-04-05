import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { NuevaVentaPageRoutingModule } from './nueva-venta-routing.module';

import { NuevaVentaPage } from './nueva-venta.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    NuevaVentaPageRoutingModule
  ],
  declarations: [NuevaVentaPage]
})
export class NuevaVentaPageModule {}
