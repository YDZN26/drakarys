import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-tab-inicial',
  templateUrl: './tab-inicial.page.html',
  styleUrls: ['./tab-inicial.page.scss'],
})
export class TabInicialPage {
  rutaActual: string = '';

  constructor(private router: Router) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.rutaActual = event.urlAfterRedirects;
      });

    this.rutaActual = this.router.url;
  }

  isTabSelected(tab: string): boolean {
    return this.rutaActual.includes('/tab-inicial/' + tab);
  }
}