import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { NuevoGastoPage } from './nuevo-gasto.page';

const routes: Routes = [
  {
    path: '',
    component: NuevoGastoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class NuevoGastoPageRoutingModule {}
