import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { VentaLibrePageRoutingModule } from './venta-libre-routing.module';

import { VentaLibrePage } from './venta-libre.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    VentaLibrePageRoutingModule
  ],
  declarations: [VentaLibrePage]
})
export class VentaLibrePageModule {}
