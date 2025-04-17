import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  
  {
    path: 'tab-inicial',
    loadChildren: () => import('./page/tab-inicial/tab-inicial.module').then( m => m.TabInicialPageModule)
  },
  {
    path: 'nueva-venta',
    loadChildren: () => import('./page/nueva-venta/nueva-venta.module').then( m => m.NuevaVentaPageModule)
  },
  {
    path: 'agregar-producto',
    loadChildren: () => import('./page/agregar-producto/agregar-producto.module').then( m => m.AgregarProductoPageModule)
  },
  {
    path: 'nuevo-gasto',
    loadChildren: () => import('./page/nuevo-gasto/nuevo-gasto.module').then( m => m.NuevoGastoPageModule)
  },
  {
    path: 'login',
    loadChildren: () => import('./page/login/login.module').then( m => m.LoginPageModule)
  },

  {
    path: 'balance',
    loadChildren: () => import('./page/balance/balance.module').then( m => m.BalancePageModule)
  },
  {
    path: 'recibo/:ventaId',
    loadChildren: () => import('./page/recibo/recibo.module').then( m => m.ReciboPageModule)
  },

  {
    path: 'recibo',
    loadChildren: () => import('./page/recibo/recibo.module').then(m => m.ReciboPageModule)
  },
  
  {
    path: 'cuotas-modal',
    loadChildren: () => import('./page/cuotas-modal/cuotas-modal.module').then( m => m.CuotasModalPageModule)
  },
  {
    path: 'preview',
    loadChildren: () => import('./page/preview/preview.module').then( m => m.PreviewPageModule)
  },

  
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }