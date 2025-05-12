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
    const { data, error } = await this.supabaseService.obtenerLogin(this.usuario.trim(), this.contrasena.trim());
  
    if (error) {
      // Aquí engloba tanto fallo en conexión como credenciales inválidas
      this.errorMsg = error.message || 'Ocurrió un error al autenticar';
      return;
    }
  
    // data ahora es el objeto usuario real
    localStorage.setItem('usuario_id', data.usuario_id.toString());
    localStorage.setItem('usuario', data.username);
    this.router.navigate(['tab-inicial/balance']);
  }
}
