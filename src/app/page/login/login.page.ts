import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from 'src/app/supabase.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss']
})
export class LoginPage {
  usuario: string = '';
  contrasena: string = '';
  errorMsg: string = '';

  mostrarContrasena: boolean = false;

  constructor(
    private router: Router,
    private supabaseService: SupabaseService,
  ) {}

  togglePassword() {
    this.mostrarContrasena = !this.mostrarContrasena;
  }

  async login() {
    this.errorMsg = '';

    const { data, error } = await this.supabaseService.obtenerLogin(
      this.usuario.trim(),
      this.contrasena.trim()
    );

    if (error) {
      this.errorMsg = error.message || 'Ocurrió un error al autenticar';
      return;
    }

    localStorage.setItem('usuario_id', data.usuario_id.toString());
    localStorage.setItem('usuario', JSON.stringify(data));

    this.router.navigate(['tab-inicial/balance']);
  }
}
