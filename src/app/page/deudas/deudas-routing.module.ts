import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DeudasPage } from './deudas.page';

const routes: Routes = [
  {
    path: '',
    component: DeudasPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DeudasPageRoutingModule {}
