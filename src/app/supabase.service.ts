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

  async obtenerProductos() {
    const { data, error } = await this.supabase.from('producto').select('*');
    if (error) {
      console.error('Error al obtener productos:', error);
      return [];
    }
    return data;
  }

  async obtenerTiposDePago() {
    const { data, error } = await this.supabase.from('tipo_pago').select('*');
    if (error) {
      console.error('Error al obtener tipos de pago:', error);
      return [];
    }
    return data;
  }

  async agregarVenta(productos: any[], tipoPagoId: number) {
    const ventas = productos.map(producto => ({
      producto_id: producto.id,
      tipo_pago_id: tipoPagoId,
      cantidad: producto.cantidadSeleccionada,
      precio_unitario: producto.precio,
    }));
  
    const { data, error } = await this.supabase.from('venta').insert(ventas);
    if (error) {
      console.error('Error al registrar la venta:', error);
      return null;
    }
    return data;
  }

  }
  


