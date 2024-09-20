import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CuotasModalPage } from './cuotas-modal.page';

const routes: Routes = [
  {
    path: '',
    component: CuotasModalPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CuotasModalPageRoutingModule {}
