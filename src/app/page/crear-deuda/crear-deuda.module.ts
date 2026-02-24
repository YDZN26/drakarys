import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { CrearDeudaPageRoutingModule } from './crear-deuda-routing.module';
import { CrearDeudaPage } from './crear-deuda.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CrearDeudaPageRoutingModule
  ],
  declarations: [CrearDeudaPage]
})
export class CrearDeudaPageModule {}
