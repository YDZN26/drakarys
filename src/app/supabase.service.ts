import { Injectable } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase = createClient(environment.supabaseUrl, environment.supabaseKey);

  constructor() {}

  // Método para agregar un producto
  async agregarProducto(producto: any) {
    const { data, error } = await this.supabase.from('producto').insert([producto]);
    if (error) {
      console.error('Error al agregar producto:', error);
      return null;
    }
    return data;
  }

  // Método para obtener categorías
  async obtenerCategorias() {
    const { data, error } = await this.supabase.from('categoria').select('*');
    if (error) {
      console.error('Error al obtener categorías:', error);
      return [];
    }
    return data;
  }
}
