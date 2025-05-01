import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
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

  constructor(private router: Router,
    private supabaseService: SupabaseService,
  ) {}

  async login() {
    this.errorMsg = '';
    const username = this.usuario.trim();
    const password = this.contrasena.trim();

  const { data, error } = await this.supabaseService.obtenerLogin(username, password);
      
    if (error) {
      this.errorMsg = 'Ocurrió un error al autenticar';
      return;
    }

    if (!data) {
      this.errorMsg ='Usuario o contraseña incorrectos';
      return;
    }
    
    // Guardar el usuario
    localStorage.setItem('usuario_id', data.usuario_id.toString());
    localStorage.setItem('usuario', data.username);

    this.router.navigate(['tab-inicial/balance']);
  }
}
