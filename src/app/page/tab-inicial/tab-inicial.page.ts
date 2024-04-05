import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonRouterOutlet } from '@ionic/angular';

@Component({
  selector: 'app-tab-inicial',
  templateUrl: './tab-inicial.page.html',
  styleUrls: ['./tab-inicial.page.scss'],
})
export class TabInicialPage implements OnInit {

  selectedTab: string = ''; // inicializar la propiedad selectedTab

  constructor(private routerOutlet: IonRouterOutlet, private route: ActivatedRoute) {}

  ngOnInit() {
    this.routerOutlet.swipeGesture = false;
    this.route.queryParams.subscribe(params => {
      this.selectedTab = params['tab']; // acceder a 'tab' con corchetes
    });
  }

  isTabSelected(tab: string): boolean {
    return this.selectedTab === tab;
  }
}

