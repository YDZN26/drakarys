import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { createClient } from '@supabase/supabase-js';
import { environment } from 'src/environments/environment';

const supabase = createClient(environment.supabaseUrl, environment.supabaseKey);

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss']
})
export class LoginPage {
  usuario: string = '';
  contrasena: string = '';

  constructor(private router: Router) {}

  async login() {
    const username = this.usuario.trim();
    const password = this.contrasena.trim();

    const { data, error } = await supabase
      .from('usuario')
      .select('*')
      .eq('username', username)
      .eq('passwrd', password)
      .maybeSingle();

    if (error) {
      window.alert('Ocurrió un error al autenticar');
      return;
    }

    if (!data) {
      window.alert('Usuario o contraseña incorrectos');
      return;
    }
    
    // Guardar el usuario
    localStorage.setItem('usuario_id', data.usuario_id.toString());
    localStorage.setItem('usuario', data.username);

    this.router.navigate(['tab-inicial/balance']);
  }
}
