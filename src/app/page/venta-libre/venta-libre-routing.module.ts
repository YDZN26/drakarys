import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { VentaLibrePage } from './venta-libre.page';

const routes: Routes = [
  {
    path: '',
    component: VentaLibrePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class VentaLibrePageRoutingModule {}
