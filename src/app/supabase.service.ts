import { Injectable } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase = createClient(
    environment.supabaseUrl,
    environment.supabaseKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    }
  );

  constructor() {}

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

  async obtenerCategorias() {
    const { data, error } = await this.supabase.from('categoria').select('*');
    if (error) {
      console.error('Error al obtener categorías:', error);
      return [];
    }
    return data;
  }

  async obtenerLogin(username: string, password: string) {
    const { data, error } = await this.supabase
      .from('usuario')
      .select('*')
      .eq('username', username)
      .eq('passwrd', password)
      .maybeSingle();

    if (error) {
      console.error('Error al autenticar:', error);
      return { data: null, error };
    }
    if (!data) {
      return { data: null, error: new Error('Usuario o contraseña incorrectos') };
    }
    return { data, error: null };
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
      total,
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
    return data;
  }

  async registrarVentaDetalles(ventaId: number, productos: any[]) {
    const detalles = productos.map(p => ({
      venta_id: ventaId,
      producto_id: p.producto_id,
      cantidad: p.cantidadSeleccionada,
      precio_unitario: p.precio,
      subtotal: p.precio * p.cantidadSeleccionada
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

  async registrarVentaCompleta(productos: any[], tipoPagoId: number, clienteId: number, usuarioId?: number) {
    const total = productos.reduce((sum, p) => sum + (p.precio * p.cantidadSeleccionada), 0);
    const venta = await this.registrarVenta(total, tipoPagoId, clienteId, usuarioId);
    if (!venta) return null;
    const detalles = await this.registrarVentaDetalles(venta.venta_id, productos);
    if (!detalles) return null;
    return { venta, detalles };
  }

  async obtenerVentaPorId(ventaId: number) {
    const { data, error } = await this.supabase
      .from('venta')
      .select('*')
      .eq('venta_id', ventaId)
      .single();
    if (error) {
      console.error('Error al obtener la venta:', error);
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
      console.error('Error al obtener los detalles de la venta:', error);
      return [];
    }
    return data;
  }

  async obtenerDetallesVentasPorFecha(fechaInicio: string, fechaFin: string) {
    const { data, error } = await this.supabase
      .from('venta_detallada')
      .select(`
        venta_id,
        cantidad,
        precio_unitario,
        subtotal,
        producto:producto_id(nombre),
        venta:venta_id!inner(
          venta_id,
          fecha,
          tipo_de_pago:tipo_pago_id(nombre),
          cliente:cliente_id(nombre,apellido)
        )
      `)
      .gte('venta.fecha', fechaInicio)
      .lte('venta.fecha', fechaFin)
      .order('venta_id', { ascending: false });
    if (error) {
      console.error(error);
      return [];
    }
    return data;
  }

  async obtenerGastos(fechaInicio?: string, fechaFin?: string) {
    let query = this.supabase.from('gasto').select('*').order('fecha', { ascending: false });
    if (fechaInicio && fechaFin) {
      query = query.gte('fecha', fechaInicio).lte('fecha', fechaFin);
    }
    const { data, error } = await query;
    if (error) {
      console.error('Error al obtener gastos:', error);
      return [];
    }
    return data;
  }

  async agregarCliente(cliente: { nombre: string; apellido: string; telefono: string }) {
    const { data, error } = await this.supabase
      .from('cliente')
      .insert([cliente])
      .select('*')
      .single();
    if (error) {
      console.error('Error al agregar cliente:', error);
      return null;
    }
    return data;
  }

  async obtenerClientePorId(clienteId: number) {
    const { data, error } = await this.supabase
      .from('cliente')
      .select('nombre, apellido')
      .eq('cliente_id', clienteId)
      .single();
    if (error) {
      console.error('Error al obtener cliente:', error);
      return null;
    }
    return data;
  }

  getSupabase() {
    return this.supabase;
  }

  async registrarCierre(cierre: any) {
    const { data, error } = await this.supabase
      .from('cierre')
      .insert([cierre])
      .select('*')
      .single();
    if (error) {
      console.error('Error al registrar cierre:', error);
      return null;
    }
    return data;
  }

  async obtenerIngresosPorTipoPago(fechaInicio: string, fechaFin: string) {
    const { data, error } = await this.supabase
      .from('venta')
      .select(`
        tipo_pago_id,
        total,
        tipo_de_pago ( nombre )
      `)
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin);
    if (error) {
      console.error('Error al obtener ingresos por tipo de pago:', error.message);
      return [];
    }
    return data;
  }

  async obtenerEgresosPorTipoPago(fechaInicio: string, fechaFin: string) {
    const { data, error } = await this.supabase
      .from('gasto')
      .select(`
        tipo_pago_id,
        monto,
        tipo_de_pago ( nombre )
      `)
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin);
    if (error) {
      console.error('Error al obtener egresos por tipo de pago:', error.message);
      return [];
    }
    return data;
  }

  async registrarVentaLibre(venta: {
  monto: number;
  descripcion: string;
  tipo_pago_id: number;
  usuario_id: number;
}) {
  const { data, error } = await this.supabase
    .from('venta_libre') // corregido
    .insert([venta])
    .select('*')
    .single();
  if (error) {
    console.error('Error al registrar venta libre:', error);
    return null;
  }
  return data;
}

async obtenerVentasLibresDelDia(fecha: string) {
  try {
    const { data, error } = await this.supabase
      .from('venta')
      .select('total, fecha')
      .eq('cliente_id', null)
      .gte('fecha', `${fecha} 00:00:00`)
      .lte('fecha', `${fecha} 23:59:59`);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error al obtener ventas libres del día:', error);
    return [];
  }
}

// AUMENTADO: obtener ingresos de venta libre por fecha
async obtenerIngresosLibres(fechaInicio: string, fechaFin: string) {
  const { data, error } = await this.supabase
    .from('venta_libre') // corregido
    .select('monto, descripcion, fecha, tipo_de_pago(nombre)')
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin)
    .order('fecha', { ascending: false });
  if (error) {
    console.error('Error al obtener ingresos libres:', error);
    return [];
  }
  return data;
}

async crearIngreso(ingreso: {
    tipo_pago_id: number;
    usuario_id: number;
    cliente_id?: number | null;
    total: number;
    tipo_ingreso: 'venta' | 'venta_libre' | 'ajuste_positivo';
    descripcion?: string;
  }) {
    const { data, error } = await this.supabase
      .from('ingreso')
      .insert([{
        ...ingreso,
        fecha: new Date().toISOString()
      }])
      .select('ingreso_id')
      .single();
    
    if (error) {
      console.error('Error al crear ingreso:', error);
      return null;
    }
    return data;
  }

  async obtenerTotalIngresosDia(fecha: string) {
    const { data, error } = await this.supabase
      .rpc('obtener_total_ingresos_dia', { fecha_dia: fecha });
    
    if (error) {
      console.error('Error al obtener total de ingresos:', error);
      return 0;
    }
    return data || 0;
  }

  async obtenerTotalEgresosDia(fecha: string) {
    const { data, error } = await this.supabase
      .rpc('obtener_total_egresos_dia', { fecha_dia: fecha });
    
    if (error) {
      console.error('Error al obtener total de egresos:', error);
      return 0;
    }
    return data || 0;
  }

  async obtenerBalanceDia(fecha: string) {
    const fechaAnterior = new Date(fecha);
    fechaAnterior.setDate(fechaAnterior.getDate() - 1);
    
    const { data: cierreAnterior } = await this.supabase
      .from('cierre')
      .select('saldo_final')
      .lte('fecha', fechaAnterior.toISOString())
      .order('fecha', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    const saldoInicial = cierreAnterior?.saldo_final || 0;
    const totalIngresos = await this.obtenerTotalIngresosDia(fecha);
    const totalEgresos = await this.obtenerTotalEgresosDia(fecha);
    const saldoFinal = saldoInicial + totalIngresos - totalEgresos;
    
    return {
      saldo_inicial: saldoInicial,
      total_ingresos: totalIngresos,
      total_egresos: totalEgresos,
      saldo_final: saldoFinal
    };
  }

  async registrarVentaLibreConIngreso(venta: {
    monto: number;
    descripcion: string;
    tipo_pago_id: number;
    usuario_id: number;
  }) {
    const ingreso = await this.crearIngreso({
      tipo_pago_id: venta.tipo_pago_id,
      usuario_id: venta.usuario_id,
      total: venta.monto,
      tipo_ingreso: 'venta_libre',
      descripcion: venta.descripcion
    });
    
    if (!ingreso) return null;
    
    const { data, error } = await this.supabase
      .from('venta_libre')
      .insert([{
        ...venta,
        ingreso_id: ingreso.ingreso_id,
        fecha: new Date().toISOString()
      }])
      .select('*')
      .single();
    
    if (error) {
      console.error('Error al registrar venta libre:', error);
      return null;
    }
    return data;
  }

}
