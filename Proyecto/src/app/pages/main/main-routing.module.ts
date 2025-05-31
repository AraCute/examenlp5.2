import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MainPage } from './main.page';

const routes: Routes = [
  {
    path: '',
    component: MainPage,
    children: [  // Agregamos children para que las rutas sean accesibles dentro de 'main'
      {
        path: 'home',
        loadChildren: () => import('./home/home.module').then(m => m.HomePageModule)
      },
      {
        path: 'login', 
        loadChildren: () => import('../auth/auth.module').then(m => m.AuthPageModule)
      },
      {
        path: '',
        redirectTo: 'home', // Evita que la ruta vacía no cargue nada
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MainPageRoutingModule {}
