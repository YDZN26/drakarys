import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CierreCajaPage } from './cierre-caja.page';

const routes: Routes = [
  {
    path: '',
    component: CierreCajaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CierreCajaPageRoutingModule {}
