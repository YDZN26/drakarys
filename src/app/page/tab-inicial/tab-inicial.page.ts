import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { IonRouterOutlet } from '@ionic/angular';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-tab-inicial',
  templateUrl: './tab-inicial.page.html',
  styleUrls: ['./tab-inicial.page.scss'],
})
export class TabInicialPage implements OnInit {

  selectedTab: string = ''; // Inicializar la propiedad selectedTab

  constructor(private routerOutlet: IonRouterOutlet, private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.routerOutlet.swipeGesture = false;
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        const currentRoute = this.route.root.firstChild;
        if (currentRoute && currentRoute.snapshot) {
          const tab = currentRoute.snapshot.firstChild?.routeConfig?.path ?? ''; // Asegúrate de que siempre sea una cadena
          this.selectedTab = tab;
        }
      });
  }

  isTabSelected(tab: string): boolean {
    return this.selectedTab === tab;
  }
}
