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

  async obtenerProductoPorId(productoId: number) {
    const { data, error } = await this.supabase
      .from('producto')
      .select('*')
      .eq('producto_id', productoId)
      .single();
    if (error) {
      console.error('Error al obtener producto:', error);
      return null;
    }
    return data;
  }
  
  async actualizarProducto(producto: any) {
    const { data, error } = await this.supabase
      .from('producto')
      .update(producto)
      .eq('producto_id', producto.producto_id);
    if (error) {
      console.error('Error al actualizar producto:', error);
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
    const { data, error } = await this.supabase.from('tipo_de_pago').select('*');
    if (error) {
      console.error('Error al obtener tipos de pago:', error);
      return [];
    }
    return data;
  }

  async obtenerClientes() {
    const { data, error } = await this.supabase.from('cliente').select('*');
    if (error) {
      console.error('Error al obtener clientes:', error);
      return [];
    }
    return data;
  }

  async registrarVenta(total: number, tipoPagoId: number, clienteId: number, usuarioId?: number) {
    const ventaData = {
      total: total,
      tipo_pago_id: tipoPagoId,
      cliente_id: clienteId,
      usuario_id: usuarioId || null,
    };

    const { data, error } = await this.supabase
      .from('venta')
      .insert([ventaData])
      .select('*')
      .single();

    if (error) {
      console.error('Error al registrar la cabecera de la venta:', error);
      return null;
    }
    return data; // Data contendrá la venta insertada, incluyendo venta_id
  }

  // Registra los detalles de la venta (tabla "venta_detallada")
  async registrarVentaDetalles(ventaId: number, productos: any[]) {
    const detalles = productos.map(producto => ({
      venta_id: ventaId,
      producto_id: producto.producto_id,
      cantidad: producto.cantidadSeleccionada,
      precio_unitario: producto.precio,
      subtotal: producto.precio * producto.cantidadSeleccionada
    }));
    
    const { data, error } = await this.supabase
      .from('venta_detallada')
      .insert(detalles)
      .select('*');
    if (error) {
      console.error('Error al registrar los detalles de la venta:', error);
      return null;
    }
    return data;
  }


  async registrarVentaCompleta(productos: any[], tipoPagoId: number, clienteId:number, usuarioId?: number) {

    const total = productos.reduce((sum, producto) => {
      return sum + (producto.precio * producto.cantidadSeleccionada);
    }, 0);

    const venta = await this.registrarVenta(total, tipoPagoId, clienteId, usuarioId);
    if (!venta) {
      return null;
    }

    
    // Registrar los detalles de la venta
    const detalles = await this.registrarVentaDetalles(venta.venta_id, productos);
    
    if (!detalles) {
      return null;
    }
    
    return { venta, detalles };
  }

async obtenerVentaPorId(ventaId: number) {
  const { data, error } = await this.supabase
    .from('venta')
    .select('*')
    .eq('venta_id', ventaId)
    .single();
  if (error) {
    console.error("Error al obtener la venta:", error);
    return null;
  }
  return data;
}

async obtenerVentaDetalles(ventaId: number) {
  const { data, error } = await this.supabase
    .from('venta_detallada')
    .select(`*, producto(nombre)`)
    .eq('venta_id', ventaId);
  if (error) {
    console.error("Error al obtener los detalles de la venta:", error);
    return [];
  }
  return data;
}

}


