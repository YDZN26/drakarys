import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TabInicialPage } from './tab-inicial.page';

const routes: Routes = [
  {
    path: '',
    component: TabInicialPage,
    children: [
      {
        path: 'balance',
        loadChildren: () => import('./../../page/balance/balance.module').then( m => m.BalancePageModule)
      },
      {
        path: 'deudas',
        loadChildren: () => import('./../../page/deudas/deudas.module').then( m => m.DeudasPageModule)
      },
      {
        path: 'inventario',
        loadChildren: () => import('./../../page/inventario/inventario.module').then( m => m.InventarioPageModule)
      },
      {
        path: 'opciones',
        loadChildren: () => import('./../../page/opciones/opciones.module').then( m => m.OpcionesPageModule)
      },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TabInicialPageRoutingModule {}
