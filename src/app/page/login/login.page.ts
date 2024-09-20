import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  username: string = '';
  password: string = '';

  constructor(private navCtrl: NavController) {}

  ngOnInit() {}

  onLogin() {
    this.navCtrl.navigateRoot('/tab-inicial/balance');
  }

  onRegister() {
    console.log('Registro no implementado aún.');
  }
}

