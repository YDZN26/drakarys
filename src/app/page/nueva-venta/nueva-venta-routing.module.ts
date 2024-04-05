import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { NuevaVentaPage } from './nueva-venta.page';

const routes: Routes = [
  {
    path: '',
    component: NuevaVentaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class NuevaVentaPageRoutingModule {}
