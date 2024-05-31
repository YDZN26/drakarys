import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { InventarioPageRoutingModule } from './inventario-routing.module';
import { InventarioPage } from './inventario.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    InventarioPageRoutingModule
  ],
  declarations: [InventarioPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA] // Añade CUSTOM_ELEMENTS_SCHEMA aquí
})
export class InventarioPageModule {}
