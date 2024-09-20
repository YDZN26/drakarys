import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { CuotasModalPageRoutingModule } from './cuotas-modal-routing.module';

import { CuotasModalPage } from './cuotas-modal.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CuotasModalPageRoutingModule
  ],
  declarations: [CuotasModalPage]
})
export class CuotasModalPageModule {}
