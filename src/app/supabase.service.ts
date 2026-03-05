import { Injectable } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../environments/environment';

type TipoIngreso =
  | 'venta'
  | 'venta_libre'
  | 'pago_deuda'
  | 'ingresos_varios'
  | 'ajuste_positivo';

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

  async obtenerProductos() {
    const { data, error } = await this.supabase.from('producto').select('*');
    if (error) {
      console.error('Error al obtener productos:', error);
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

  async crearIngreso(ingreso: {
    tipo_pago_id: number;
    usuario_id: number;
    cliente_id?: number | null;
    total: number;
    tipo_ingreso: TipoIngreso;
    descripcion?: string;
    fecha?: string;
    id_deuda?: number | null;
  }) {
    const payload = {
      tipo_pago_id: ingreso.tipo_pago_id,
      usuario_id: ingreso.usuario_id,
      cliente_id: ingreso.cliente_id ?? null,
      total: ingreso.total,
      tipo_ingreso: ingreso.tipo_ingreso,
      descripcion: ingreso.descripcion ?? null,
      fecha: ingreso.fecha ?? new Date().toISOString(),
      id_deuda: ingreso.id_deuda ?? null
    };

    const { data, error } = await this.supabase
      .from('ingreso')
      .insert([payload])
      .select('ingreso_id')
      .single();

    if (error) {
      console.error('Error al crear ingreso:', error);
      return null;
    }
    return data; // { ingreso_id }
  }

  async registrarVentaDetallesPorIngreso(ingresoId: number, productos: any[]) {
    const detalles = productos.map(p => ({
      ingreso_id: ingresoId,
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
    const userId = usuarioId ?? 0;

    // 1) Crear ingreso tipo "venta"
    const ingreso = await this.crearIngreso({
      tipo_pago_id: tipoPagoId,
      usuario_id: userId,
      cliente_id: clienteId,
      total,
      tipo_ingreso: 'venta',
      descripcion: 'Venta con productos'
    });

    if (!ingreso) return null;

    // 2) Crear detalles ligados al ingreso
    const detalles = await this.registrarVentaDetallesPorIngreso(ingreso.ingreso_id, productos);
    if (!detalles) return null;

    return { ingreso, detalles };
  }


  async obtenerVentaPorId(ingresoId: number) {
    const { data, error } = await this.supabase
      .from('ingreso')
      .select('*')
      .eq('ingreso_id', ingresoId)
      .single();

    if (error) {
      console.error('Error al obtener el ingreso:', error);
      return null;
    }
    return data;
  }

  async obtenerVentaDetalles(ingresoId: number) {
    const { data, error } = await this.supabase
      .from('venta_detallada')
      .select(`*, producto(nombre)`)
      .eq('ingreso_id', ingresoId);

    if (error) {
      console.error('Error al obtener los detalles por ingreso:', error);
      return [];
    }
    return data;
  }

  async obtenerDetallesVentasPorFecha(fechaInicio: string, fechaFin: string) {
    const { data, error } = await this.supabase
      .from('venta_detallada')
      .select(`
        ingreso_id,
        cantidad,
        precio_unitario,
        subtotal,
        producto:producto_id(nombre),
        ingreso:ingreso_id!inner(
          ingreso_id,
          fecha,
          total,
          tipo_de_pago:tipo_pago_id(nombre),
          cliente:cliente_id(nombre,apellido)
        )
      `)
      .gte('ingreso.fecha', fechaInicio)
      .lte('ingreso.fecha', fechaFin)
      .order('ingreso_id', { ascending: false });

    if (error) {
      console.error(error);
      return [];
    }
    return data;
  }

  async obtenerGastos(fechaInicio?: string, fechaFin?: string) {
    let query = this.supabase
      .from('gasto')
      .select(`
        gasto_id,
        monto,
        descripcion,
        fecha,
        tipo_pago_id,
        tipo_de_pago:tipo_pago_id(nombre)
      `)
      .order('fecha', { ascending: false });

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

  // Registrar gasto (para préstamos que afectan caja)
  async registrarGasto(payload: {
    monto: number;
    descripcion: string;
    tipo_pago_id: number;
    fecha?: string;
  }) {
    const dataInsert = {
      monto: payload.monto,
      descripcion: payload.descripcion,
      fecha: payload.fecha ?? new Date().toISOString(),
      tipo_pago_id: payload.tipo_pago_id
    };

    const { data, error } = await this.supabase
      .from('gasto')
      .insert([dataInsert])
      .select('*')
      .single();

    if (error) {
      console.error('Error al registrar gasto:', error);
      return null;
    }
    return data;
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

  async obtenerUltimoCierreAntesDe(fechaISO: string) {
    const { data, error } = await this.supabase
      .from('cierre')
      .select('cierre_id, fecha, saldo_final')
      .lt('fecha', fechaISO)
      .order('fecha', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error al obtener cierre anterior:', error);
      return null;
    }
    return data;
  }

  async obtenerIngresosLibres(fechaInicio: string, fechaFin: string) {
  const { data, error } = await this.supabase
    .from('ingreso')
    .select(`
      ingreso_id,
      total,
      descripcion,
      fecha,
      tipo_de_pago:tipo_pago_id(nombre),
      tipo_ingreso,
      cliente:cliente_id(nombre,apellido),
      deuda:id_deuda(descripcion)
    `)
    .in('tipo_ingreso', ['venta_libre', 'ingresos_varios', 'pago_deuda'])
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin)
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error al obtener ingresos libres:', error);
    return [];
  }
  return data;
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
      .from('ingreso')
      .select('*')
      .eq('ingreso_id', ingreso.ingreso_id)
      .single();

    if (error) {
      console.error('Error al obtener ingreso recién creado:', error);
      return null;
    }
    return data;
  }

  async registrarPagoDeuda(payload: {
    deuda_id: number;
    monto: number;
    tipo_pago_id: number;
    usuario_id: number;
    descripcion?: string;
  }) {
    const { data: deuda, error: eDeuda } = await this.supabase
      .from('deuda')
      .select('deuda_id, cliente_id, monto_total, total_pagado, saldo, estado')
      .eq('deuda_id', payload.deuda_id)
      .single();

    if (eDeuda || !deuda) {
      console.error('No se pudo obtener la deuda:', eDeuda);
      return null;
    }

    if (payload.monto <= 0) {
      console.error('Monto inválido');
      return null;
    }

    if (Number(deuda.saldo) < payload.monto) {
      console.error('El monto excede el saldo de la deuda');
      return null;
    }

    const ingreso = await this.crearIngreso({
      tipo_pago_id: payload.tipo_pago_id,
      usuario_id: payload.usuario_id,
      cliente_id: deuda.cliente_id,
      total: payload.monto,
      tipo_ingreso: 'pago_deuda',
      descripcion: payload.descripcion ?? 'Pago de deuda',
      id_deuda: deuda.deuda_id
    });

    if (!ingreso) return null;

    const nuevoTotalPagado = Number(deuda.total_pagado || 0) + payload.monto;
    const nuevoSaldo = Number(deuda.saldo || 0) - payload.monto;
    const nuevoEstado = nuevoSaldo <= 0 ? 'pagada' : 'pendiente';

    const { data: deudaActualizada, error: eUpd } = await this.supabase
      .from('deuda')
      .update({
        total_pagado: nuevoTotalPagado,
        saldo: nuevoSaldo,
        estado: nuevoEstado
      })
      .eq('deuda_id', deuda.deuda_id)
      .select('*')
      .single();

    if (eUpd) {
      console.error('Error al actualizar deuda:', eUpd);
      return null;
    }

    return { ingreso_id: ingreso.ingreso_id, deuda: deudaActualizada };
  }

   async crearDeuda(payload: {
    cliente_id: number;
    usuario_id: number;
    monto_total: number;
    descripcion?: string | null;
  }) {
    const dataInsert = {
      cliente_id: payload.cliente_id,
      usuario_id: payload.usuario_id,
      monto_total: payload.monto_total,
      saldo: payload.monto_total,     
      total_pagado: 0,                 
      fecha: new Date().toISOString(),   
      descripcion: payload.descripcion ?? null,
      estado: 'pendiente'
    };

    const { data, error } = await this.supabase
      .from('deuda')
      .insert([dataInsert])
      .select('*')
      .single();

    if (error) {
      console.error('Error al crear deuda:', error);
      return null;
    }
    return data;
  }

  async obtenerDeudas() {
    const { data, error } = await this.supabase
      .from('deuda')
      .select(`
        deuda_id,
        cliente_id,
        usuario_id,
        monto_total,
        saldo,
        total_pagado,
        fecha,
        descripcion,
        estado,
        cliente:cliente_id(nombre, apellido)
      `)
      .order('fecha', { ascending: false });

    if (error) {
      console.error('Error al obtener deudas:', error);
      return [];
    }
    return data;
  }

  getSupabase() {
    return this.supabase;
  }
}
