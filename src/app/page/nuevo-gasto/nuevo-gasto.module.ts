import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { NuevoGastoPageRoutingModule } from './nuevo-gasto-routing.module';

import { NuevoGastoPage } from './nuevo-gasto.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    NuevoGastoPageRoutingModule
  ],
  declarations: [NuevoGastoPage]
})
export class NuevoGastoPageModule {}
