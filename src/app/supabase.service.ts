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

  obtenerUsuarioLogueadoId(): number {
    try {
      const usuarioGuardado =
        localStorage.getItem('usuario') ||
        localStorage.getItem('usuarioActual') ||
        localStorage.getItem('user');

      if (!usuarioGuardado) {
        return 0;
      }

      const usuario = JSON.parse(usuarioGuardado);

      return Number(usuario?.usuario_id) || 0;
    } catch (error) {
      console.error('Error al obtener usuario logueado:', error);
      return 0;
    }
  }

  obtenerUsuario() {
    try {
      const usuarioGuardado = localStorage.getItem('usuario');

      if (!usuarioGuardado) {
        return null;
      }

      return JSON.parse(usuarioGuardado);
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      return null;
    }
  }

  cerrarSesion() {
    localStorage.removeItem('usuario');
    localStorage.removeItem('usuario_id');
  }

  async agregarProducto(producto: any) {
    const { data, error } = await this.supabase
      .from('producto')
      .insert([{
        ...producto,
        estado: true
      }])
      .select('*');

    if (error) {
      console.error('SUPABASE ERROR:', error);
      throw error;
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

    const stock = await this.obtenerStockPorProducto(productoId);

    return {
      ...data,
      stock_exhibicion: stock.find(s => s.ubicacion === 'exhibicion')?.cantidad || 0,
      stock_almacen_tienda: stock.find(s => s.ubicacion === 'almacen_tienda')?.cantidad || 0,
      stock_almacen_casa: stock.find(s => s.ubicacion === 'almacen_casa')?.cantidad || 0,
      stock_danado: stock.find(s => s.ubicacion === 'danado')?.cantidad || 0,
      stock_total:
        (stock.find(s => s.ubicacion === 'exhibicion')?.cantidad || 0) +
        (stock.find(s => s.ubicacion === 'almacen_tienda')?.cantidad || 0) +
        (stock.find(s => s.ubicacion === 'almacen_casa')?.cantidad || 0)
    };
  }

  async actualizarProducto(producto: any) {
    const { data, error } = await this.supabase
      .from('producto')
      .update({
        codigo_barras: producto.codigo_barras,
        nombre: producto.nombre,
        precio: producto.precio,
        costo: producto.costo,
        descripcion: producto.descripcion,
        stock: producto.stock,
        categoria_id: producto.categoria_id,
        imagen: producto.imagen
      })
      .eq('producto_id', producto.producto_id)
      .select('*')
      .single();

    if (error) {
      console.error('Error al actualizar producto:', error);
      return null;
    }

    return data;
  }

  async eliminarProductoLogico(productoId: number) {
    const { data, error } = await this.supabase
      .from('producto')
      .update({ estado: false })
      .eq('producto_id', productoId)
      .select('*')
      .single();

    if (error) {
      console.error('Error al eliminar lógicamente el producto:', error);
      return null;
    }

    return data;
  }

  async actualizarStockProducto(productoId: number, nuevoStock: number) {
    const { data, error } = await this.supabase
      .from('producto')
      .update({ stock: nuevoStock })
      .eq('producto_id', productoId)
      .select('*')
      .single();

    if (error) {
      console.error('Error al actualizar stock del producto:', error);
      return null;
    }

    return data;
  }

  async descontarStockProductos(productos: any[]) {
    for (const producto of productos) {
      const productoActual = await this.obtenerProductoPorId(producto.producto_id);

      if (!productoActual) {
        console.error('No se encontró el producto:', producto.producto_id);
        return null;
      }

      const stockActual = Number(productoActual.stock || 0);
      const cantidadVendida = Number(producto.cantidadSeleccionada || 0);
      const nuevoStock = stockActual - cantidadVendida;

      if (cantidadVendida <= 0) {
        console.error('Cantidad vendida inválida para el producto:', producto.nombre);
        return null;
      }

      if (nuevoStock < 0) {
        console.error('Stock insuficiente para el producto:', producto.nombre);
        return null;
      }

      const actualizado = await this.actualizarStockProducto(producto.producto_id, nuevoStock);

      if (!actualizado) {
        console.error('No se pudo actualizar el stock del producto:', producto.nombre);
        return null;
      }
    }

    return true;
  }

  async obtenerStockPorProducto(productoId: number) {
    const { data, error } = await this.supabase
      .from('producto_stock')
      .select('*')
      .eq('producto_id', productoId);

    if (error) {
      console.error('Error al obtener stock por producto:', error);
      return [];
    }

    return data || [];
  }

  async actualizarStockPorUbicacion(
    productoId: number,
    ubicacion: 'exhibicion' | 'almacen_tienda' | 'almacen_casa' | 'danado',
    cantidad: number
  ) {
    const { data, error } = await this.supabase
      .from('producto_stock')
      .update({ cantidad })
      .eq('producto_id', productoId)
      .eq('ubicacion', ubicacion)
      .select('*')
      .single();

    if (error) {
      console.error(`Error al actualizar stock en ${ubicacion}:`, error);
      return null;
    }

    return data;
  }

  async guardarStockInicialProducto(productoId: number, stock: {
    exhibicion: number;
    almacen_tienda: number;
    almacen_casa: number;
    danado: number;
  }) {
    const dataInsert = [
      {
        producto_id: productoId,
        ubicacion: 'exhibicion',
        cantidad: Number(stock.exhibicion || 0)
      },
      {
        producto_id: productoId,
        ubicacion: 'almacen_tienda',
        cantidad: Number(stock.almacen_tienda || 0)
      },
      {
        producto_id: productoId,
        ubicacion: 'almacen_casa',
        cantidad: Number(stock.almacen_casa || 0)
      },
      {
        producto_id: productoId,
        ubicacion: 'danado',
        cantidad: Number(stock.danado || 0)
      }
    ];

    const { data, error } = await this.supabase
      .from('producto_stock')
      .insert(dataInsert)
      .select('*');

    if (error) {
      console.error('Error al guardar stock inicial del producto:', error);
      return null;
    }

    return data;
  }

  async guardarStockCompletoProducto(productoId: number, stock: {
    exhibicion: number;
    almacen_tienda: number;
    almacen_casa: number;
    danado: number;
  }) {
    const ubicaciones: Array<{
      ubicacion: 'exhibicion' | 'almacen_tienda' | 'almacen_casa' | 'danado';
      cantidad: number;
    }> = [
      { ubicacion: 'exhibicion', cantidad: Number(stock.exhibicion || 0) },
      { ubicacion: 'almacen_tienda', cantidad: Number(stock.almacen_tienda || 0) },
      { ubicacion: 'almacen_casa', cantidad: Number(stock.almacen_casa || 0) },
      { ubicacion: 'danado', cantidad: Number(stock.danado || 0) }
    ];

    for (const item of ubicaciones) {
      const { data: existe, error: errorConsulta } = await this.supabase
        .from('producto_stock')
        .select('*')
        .eq('producto_id', productoId)
        .eq('ubicacion', item.ubicacion)
        .maybeSingle();

      if (errorConsulta) {
        console.error(`Error al consultar stock de ${item.ubicacion}:`, errorConsulta);
        return null;
      }

      if (existe) {
        const { error: errorUpdate } = await this.supabase
          .from('producto_stock')
          .update({ cantidad: item.cantidad })
          .eq('producto_id', productoId)
          .eq('ubicacion', item.ubicacion);

        if (errorUpdate) {
          console.error(`Error al actualizar stock de ${item.ubicacion}:`, errorUpdate);
          return null;
        }
      } else {
        const { error: errorInsert } = await this.supabase
          .from('producto_stock')
          .insert([{
            producto_id: productoId,
            ubicacion: item.ubicacion,
            cantidad: item.cantidad
          }]);

        if (errorInsert) {
          console.error(`Error al insertar stock de ${item.ubicacion}:`, errorInsert);
          return null;
        }
      }
    }

    return true;
  }

  async registrarMovimientoInventario(payload: {
    producto_id: number;
    tipo_movimiento:
      | 'ingreso'
      | 'venta'
      | 'traslado'
      | 'danado'
      | 'salida_proveedor'
      | 'ingreso_cambio_proveedor'
      | 'ajuste_positivo'
      | 'ajuste_negativo';
    ubicacion_origen?: 'exhibicion' | 'almacen_tienda' | 'almacen_casa' | 'danado' | 'proveedor' | null;
    ubicacion_destino?: 'exhibicion' | 'almacen_tienda' | 'almacen_casa' | 'danado' | 'proveedor' | null;
    cantidad: number;
    motivo?: string | null;
    usuario_id?: number | null;
  }) {
    const dataInsert = {
      producto_id: payload.producto_id,
      tipo_movimiento: payload.tipo_movimiento,
      ubicacion_origen: payload.ubicacion_origen ?? null,
      ubicacion_destino: payload.ubicacion_destino ?? null,
      cantidad: payload.cantidad,
      motivo: payload.motivo ?? null,
      usuario_id: payload.usuario_id ?? null,
      fecha: new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from('movimiento_inventario')
      .insert([dataInsert])
      .select('*')
      .single();

    if (error) {
      console.error('Error al registrar movimiento de inventario:', error);
      return null;
    }

    return data;
  }

  async descontarStockExhibicion(productos: any[]) {
    for (const producto of productos) {
      const { data: stockData, error } = await this.supabase
        .from('producto_stock')
        .select('*')
        .eq('producto_id', producto.producto_id)
        .eq('ubicacion', 'exhibicion')
        .single();

      if (error || !stockData) {
        console.error('No se encontró stock en exhibición para el producto:', producto.nombre);
        return null;
      }

      const stockActual = Number(stockData.cantidad || 0);
      const cantidadVendida = Number(producto.cantidadSeleccionada || 0);
      const nuevoStock = stockActual - cantidadVendida;

      if (cantidadVendida <= 0) {
        console.error('Cantidad vendida inválida para el producto:', producto.nombre);
        return null;
      }

      if (nuevoStock < 0) {
        console.error('Stock insuficiente en exhibición para el producto:', producto.nombre);
        return null;
      }

      const actualizado = await this.actualizarStockPorUbicacion(
        producto.producto_id,
        'exhibicion',
        nuevoStock
      );

      if (!actualizado) {
        console.error('No se pudo actualizar el stock en exhibición del producto:', producto.nombre);
        return null;
      }

      await this.registrarMovimientoInventario({
        producto_id: producto.producto_id,
        tipo_movimiento: 'venta',
        ubicacion_origen: 'exhibicion',
        ubicacion_destino: null,
        cantidad: cantidadVendida,
        motivo: 'Venta de producto',
        usuario_id: this.obtenerUsuarioLogueadoId()
      });
    }

    return true;
  }

  async moverStockEntreUbicaciones(
    productoId: number,
    origen: 'almacen_casa' | 'almacen_tienda',
    destino: 'almacen_tienda' | 'exhibicion',
    cantidad: number
  ) {
    if (!productoId || cantidad <= 0) {
      console.error('Datos inválidos para mover stock');
      return null;
    }

    const movimientoValido =
      (origen === 'almacen_casa' && destino === 'almacen_tienda') ||
      (origen === 'almacen_tienda' && destino === 'exhibicion');

    if (!movimientoValido) {
      console.error('Movimiento no permitido');
      return null;
    }

    const { data: stockOrigen, error: errorOrigen } = await this.supabase
      .from('producto_stock')
      .select('*')
      .eq('producto_id', productoId)
      .eq('ubicacion', origen)
      .single();

    if (errorOrigen || !stockOrigen) {
      console.error('No se encontró el stock de origen:', errorOrigen);
      return null;
    }

    const { data: stockDestino, error: errorDestino } = await this.supabase
      .from('producto_stock')
      .select('*')
      .eq('producto_id', productoId)
      .eq('ubicacion', destino)
      .single();

    if (errorDestino || !stockDestino) {
      console.error('No se encontró el stock de destino:', errorDestino);
      return null;
    }

    const cantidadOrigenActual = Number(stockOrigen.cantidad || 0);
    const cantidadDestinoActual = Number(stockDestino.cantidad || 0);

    if (cantidadOrigenActual < cantidad) {
      console.error('No hay suficiente stock en la ubicación de origen');
      return null;
    }

    const nuevoStockOrigen = cantidadOrigenActual - cantidad;
    const nuevoStockDestino = cantidadDestinoActual + cantidad;

    const actualizadoOrigen = await this.actualizarStockPorUbicacion(
      productoId,
      origen,
      nuevoStockOrigen
    );

    if (!actualizadoOrigen) {
      console.error('No se pudo actualizar el stock de origen');
      return null;
    }

    const actualizadoDestino = await this.actualizarStockPorUbicacion(
      productoId,
      destino,
      nuevoStockDestino
    );

    if (!actualizadoDestino) {
      console.error('No se pudo actualizar el stock de destino');
      return null;
    }

    await this.registrarMovimientoInventario({
      producto_id: productoId,
      tipo_movimiento: 'traslado',
      ubicacion_origen: origen,
      ubicacion_destino: destino,
      cantidad: cantidad,
      motivo: 'Movimiento interno de stock',
      usuario_id: this.obtenerUsuarioLogueadoId()
    });

    return true;
  }

  async moverStockADanado(
    productoId: number,
    origen: 'exhibicion' | 'almacen_tienda' | 'almacen_casa',
    cantidad: number
  ) {
    if (!productoId || cantidad <= 0) {
      console.error('Datos inválidos para registrar dañado');
      return null;
    }

    const { data: stockOrigen, error: errorOrigen } = await this.supabase
      .from('producto_stock')
      .select('*')
      .eq('producto_id', productoId)
      .eq('ubicacion', origen)
      .single();

    if (errorOrigen || !stockOrigen) {
      console.error('No se encontró el stock de origen:', errorOrigen);
      return null;
    }

    const { data: stockDanado, error: errorDanado } = await this.supabase
      .from('producto_stock')
      .select('*')
      .eq('producto_id', productoId)
      .eq('ubicacion', 'danado')
      .single();

    if (errorDanado || !stockDanado) {
      console.error('No se encontró el stock dañado:', errorDanado);
      return null;
    }

    const cantidadOrigenActual = Number(stockOrigen.cantidad || 0);
    const cantidadDanadoActual = Number(stockDanado.cantidad || 0);

    if (cantidadOrigenActual < cantidad) {
      console.error('No hay suficiente stock en la ubicación de origen');
      return null;
    }

    const nuevoStockOrigen = cantidadOrigenActual - cantidad;
    const nuevoStockDanado = cantidadDanadoActual + cantidad;

    const actualizadoOrigen = await this.actualizarStockPorUbicacion(
      productoId,
      origen,
      nuevoStockOrigen
    );

    if (!actualizadoOrigen) {
      console.error('No se pudo actualizar el stock de origen');
      return null;
    }

    const actualizadoDanado = await this.actualizarStockPorUbicacion(
      productoId,
      'danado',
      nuevoStockDanado
    );

    if (!actualizadoDanado) {
      console.error('No se pudo actualizar el stock dañado');
      return null;
    }

    await this.registrarMovimientoInventario({
      producto_id: productoId,
      tipo_movimiento: 'danado',
      ubicacion_origen: origen,
      ubicacion_destino: 'danado',
      cantidad: cantidad,
      motivo: 'Producto marcado como dañado',
      usuario_id: this.obtenerUsuarioLogueadoId()
    });

    return true;
  }

  async enviarDanadoAProveedor(productoId: number, cantidad: number) {
    if (!productoId || cantidad <= 0) {
      console.error('Datos inválidos para enviar a proveedor');
      return null;
    }

    const { data: stockDanado, error: errorDanado } = await this.supabase
      .from('producto_stock')
      .select('*')
      .eq('producto_id', productoId)
      .eq('ubicacion', 'danado')
      .single();

    if (errorDanado || !stockDanado) {
      console.error('No se encontró el stock dañado:', errorDanado);
      return null;
    }

    const cantidadDanadoActual = Number(stockDanado.cantidad || 0);

    if (cantidadDanadoActual < cantidad) {
      console.error('No hay suficiente stock dañado para enviar al proveedor');
      return null;
    }

    const nuevoStockDanado = cantidadDanadoActual - cantidad;

    const actualizadoDanado = await this.actualizarStockPorUbicacion(
      productoId,
      'danado',
      nuevoStockDanado
    );

    if (!actualizadoDanado) {
      console.error('No se pudo actualizar el stock dañado');
      return null;
    }

    await this.registrarMovimientoInventario({
      producto_id: productoId,
      tipo_movimiento: 'salida_proveedor',
      ubicacion_origen: 'danado',
      ubicacion_destino: 'proveedor',
      cantidad: cantidad,
      motivo: 'Producto dañado enviado al proveedor',
      usuario_id: this.obtenerUsuarioLogueadoId()
    });

    return true;
  }

  async recibirCambioProveedor(
    productoId: number,
    destino: 'exhibicion' | 'almacen_tienda' | 'almacen_casa',
    cantidad: number
  ) {
    if (!productoId || cantidad <= 0) {
      console.error('Datos inválidos para recibir cambio del proveedor');
      return null;
    }

    const { data: stockDestino, error: errorDestino } = await this.supabase
      .from('producto_stock')
      .select('*')
      .eq('producto_id', productoId)
      .eq('ubicacion', destino)
      .single();

    if (errorDestino || !stockDestino) {
      console.error('No se encontró el stock de destino:', errorDestino);
      return null;
    }

    const cantidadDestinoActual = Number(stockDestino.cantidad || 0);
    const nuevoStockDestino = cantidadDestinoActual + cantidad;

    const actualizadoDestino = await this.actualizarStockPorUbicacion(
      productoId,
      destino,
      nuevoStockDestino
    );

    if (!actualizadoDestino) {
      console.error('No se pudo actualizar el stock de destino');
      return null;
    }

    await this.registrarMovimientoInventario({
      producto_id: productoId,
      tipo_movimiento: 'ingreso_cambio_proveedor',
      ubicacion_origen: 'proveedor',
      ubicacion_destino: destino,
      cantidad: cantidad,
      motivo: 'Producto nuevo recibido por cambio de proveedor',
      usuario_id: this.obtenerUsuarioLogueadoId()
    });

    return true;
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
    const { data: productos, error } = await this.supabase
      .from('producto')
      .select('*')
      .eq('estado', true);

    if (error) {
      console.error('Error al obtener productos:', error);
      return [];
    }

    if (!productos || productos.length === 0) {
      return [];
    }

    const idsProductos = productos.map(producto => producto.producto_id);

    const { data: stocks, error: errorStocks } = await this.supabase
      .from('producto_stock')
      .select('*')
      .in('producto_id', idsProductos);

    if (errorStocks) {
      console.error('Error al obtener stock de productos:', errorStocks);
      return [];
    }

    for (const producto of productos) {
      const stockProducto = (stocks || []).filter(
        stock => stock.producto_id === producto.producto_id
      );

      producto.stock_exhibicion =
        stockProducto.find(s => s.ubicacion === 'exhibicion')?.cantidad || 0;

      producto.stock_almacen_tienda =
        stockProducto.find(s => s.ubicacion === 'almacen_tienda')?.cantidad || 0;

      producto.stock_almacen_casa =
        stockProducto.find(s => s.ubicacion === 'almacen_casa')?.cantidad || 0;

      producto.stock_danado =
        stockProducto.find(s => s.ubicacion === 'danado')?.cantidad || 0;

      producto.stock_total =
        Number(producto.stock_exhibicion) +
        Number(producto.stock_almacen_tienda) +
        Number(producto.stock_almacen_casa);
    }

    return productos;
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
    total: number;
    tipo_ingreso: TipoIngreso;
    descripcion?: string;
    fecha?: string;
    id_deuda?: number | null;
    venta_id?: number | null;
  }) {
    const payload = {
      tipo_pago_id: ingreso.tipo_pago_id,
      usuario_id: ingreso.usuario_id,
      total: ingreso.total,
      tipo_ingreso: ingreso.tipo_ingreso,
      descripcion: ingreso.descripcion ?? null,
      fecha: ingreso.fecha ?? new Date().toISOString(),
      id_deuda: ingreso.id_deuda ?? null,
      venta_id: ingreso.venta_id ?? null
    };

    const { data, error } = await this.supabase
      .from('ingreso')
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      console.error('Error al crear ingreso:', error);
      return null;
    }
    return data;
  }

  async crearVenta(venta: {
    usuario_id: number;
    cliente_id: number;
    monto: number;
    fecha?: string;
  }) {
    const payload = {
      usuario_id: venta.usuario_id,
      cliente_id: venta.cliente_id,
      monto: venta.monto,
      fecha: venta.fecha ?? new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from('venta')
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      console.error('Error al crear venta:', error);
      return null;
    }

    return data;
  }

  async registrarVentaDetallesPorVenta(ventaId: number, productos: any[]) {
    const detalles = productos.map(p => ({
      venta_id: ventaId,
      producto_id: p.producto_id,
      cantidad: p.cantidadSeleccionada,
      precio_unitario: p.precio,
      subtotal: p.precio * p.cantidadSeleccionada,
      estado: true
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

  async registrarIngresosDeVenta(
    ventaId: number,
    usuarioId: number,
    pagos: { tipo_pago_id: number; monto: number }[],
    descripcion?: string
  ) {
    const ingresos = pagos.map(pago => ({
      tipo_pago_id: pago.tipo_pago_id,
      usuario_id: usuarioId,
      total: pago.monto,
      tipo_ingreso: 'venta' as TipoIngreso,
      descripcion: descripcion ?? 'Venta con productos',
      venta_id: ventaId,
      fecha: new Date().toISOString(),
      id_deuda: null
    }));

    const { data, error } = await this.supabase
      .from('ingreso')
      .insert(ingresos)
      .select('*');

    if (error) {
      console.error('Error al registrar los ingresos de la venta:', error);
      return null;
    }

    return data;
  }

  async registrarVentaCompleta(
    productos: any[],
    tipoPagoId: number,
    clienteId: number,
    usuarioId?: number,
    pagos?: { tipo_pago_id: number; monto: number }[]
  ) {
    const total = productos.reduce((sum, p) => sum + (p.precio * p.cantidadSeleccionada), 0);
    const userId = usuarioId ?? 0;

    const venta = await this.crearVenta({
      usuario_id: userId,
      cliente_id: clienteId,
      monto: total
    });

    if (!venta) return null;

    const detalles = await this.registrarVentaDetallesPorVenta(venta.venta_id, productos);
    if (!detalles) return null;

    let pagosFinales: { tipo_pago_id: number; monto: number }[] = [];

    if (pagos && pagos.length > 0) {
      pagosFinales = pagos.filter(p => Number(p.monto) > 0 && Number(p.tipo_pago_id) > 0);
    } else {
      pagosFinales = [{
        tipo_pago_id: tipoPagoId,
        monto: total
      }];
    }

    const totalPagos = pagosFinales.reduce((sum, p) => sum + Number(p.monto || 0), 0);

    if (Number(totalPagos) !== Number(total)) {
      console.error('La suma de los pagos no coincide con el total de la venta');
      return null;
    }

    const ingresos = await this.registrarIngresosDeVenta(
      venta.venta_id,
      userId,
      pagosFinales,
      'Venta con productos'
    );

    if (!ingresos) return null;

    const stockActualizado = await this.descontarStockExhibicion(productos);
    if (!stockActualizado) return null;

    return { venta, detalles, ingresos };
  }

  async obtenerVentaPorId(ventaId: number) {
  const { data, error } = await this.supabase
    .from('venta')
    .select(`
      *,
      ingresos:ingreso(
        ingreso_id,
        tipo_pago_id,
        total,
        estado
      )
    `)
    .eq('venta_id', ventaId)
    .eq('estado', true)
    .single();

  if (error) {
    console.error('Error al obtener venta por ID:', error);
    return null;
  }

  return data;
}

  async obtenerVentaDetalles(ventaId: number) {
    const { data, error } = await this.supabase
      .from('venta_detallada')
      .select(`
        *,
        producto(nombre)
      `)
      .eq('venta_id', ventaId)
      .eq('estado', true);

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
        estado,
        producto:producto_id(nombre),
        venta:venta_id!inner(
          venta_id,
          fecha,
          monto,
          estado,
          cliente:cliente_id(nombre,apellido),
          ingresos:ingreso(
            ingreso_id,
            tipo_pago_id,
            total,
            estado,
            tipo_de_pago:tipo_pago_id(nombre)
          )
        )
      `)
      .eq('estado', true)
      .eq('venta.estado', true)
      .gte('venta.fecha', fechaInicio)
      .lte('venta.fecha', fechaFin)
      .order('venta_id', { ascending: false });

    if (error) {
      console.error('Error al obtener detalles de ventas por fecha:', error);
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

  async obtenerOtrosEgresos(fechaInicio?: string, fechaFin?: string) {
    let query = this.supabase
      .from('egreso')
      .select(`
        egreso_id,
        total,
        descripcion,
        fecha,
        tipo_egreso,
        tipo_pago_id,
        tipo_de_pago:tipo_pago_id(nombre)
      `)
      .in('tipo_egreso', ['ajuste_negativo', 'retiro_caja'])
      .order('fecha', { ascending: false });

    if (fechaInicio && fechaFin) {
      query = query.gte('fecha', fechaInicio).lte('fecha', fechaFin);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error al obtener otros egresos:', error);
      return [];
    }
    return data;
  }

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

  async obtenerCierreDelDia(fechaInicio: string, fechaFin: string) {
    const { data, error } = await this.supabase
      .from('cierre')
      .select('cierre_id, fecha, saldo_final')
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin)
      .order('fecha', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error al obtener cierre del día:', error);
      return null;
    }

    return data;
  }

  async calcularResumenCajaPorFecha(fechaInicio: string, fechaFin: string) {
  const { data: ingresos } = await this.supabase
    .from('ingreso')
    .select('total, tipo_pago_id, tipo_ingreso, estado')
    .in('tipo_ingreso', ['venta', 'venta_libre', 'ingresos_varios', 'pago_deuda', 'ajuste_positivo'])
    .eq('estado', true)
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin);

  const { data: gastos } = await this.supabase
    .from('gasto')
    .select('monto, tipo_pago_id')
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin);

  const { data: otrosEgresos } = await this.supabase
    .from('egreso')
    .select('total, tipo_pago_id, tipo_egreso')
    .in('tipo_egreso', ['ajuste_negativo', 'retiro_caja'])
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin);

  let ingresosEfectivo = 0;
  let ingresosTransferencia = 0;
  let ingresosTarjeta = 0;
  let ingresosTotal = 0;

  ingresos?.forEach(i => {
    const total = Number(i.total) || 0;

    if (i.tipo_pago_id === 2) ingresosEfectivo += total;
    else if (i.tipo_pago_id === 3) ingresosTransferencia += total;
    else if (i.tipo_pago_id === 4) ingresosTarjeta += total;

    ingresosTotal += total;
  });

  let egresosEfectivo = 0;
  let egresosTransferencia = 0;
  let egresosTarjeta = 0;
  let egresosTotal = 0;

  gastos?.forEach(g => {
    const monto = Number(g.monto) || 0;

    if (g.tipo_pago_id === 2) egresosEfectivo += monto;
    else if (g.tipo_pago_id === 3) egresosTransferencia += monto;
    else if (g.tipo_pago_id === 4) egresosTarjeta += monto;

    egresosTotal += monto;
  });

  otrosEgresos?.forEach(e => {
    const monto = Number(e.total) || 0;

    if (e.tipo_pago_id === 2) egresosEfectivo += monto;
    else if (e.tipo_pago_id === 3) egresosTransferencia += monto;
    else if (e.tipo_pago_id === 4) egresosTarjeta += monto;

    egresosTotal += monto;
  });

  return {
    ingresosTotal,
    ingresosEfectivo,
    ingresosTransferencia,
    ingresosTarjeta,
    egresosTotal,
    egresosEfectivo,
    egresosTransferencia,
    egresosTarjeta
  };
}

async registrarRetiroCaja(payload: {
  total: number;
  tipo_pago_id: number;
  usuario_id: number;
  descripcion?: string;
}) {
  const dataInsert = {
    tipo_pago_id: payload.tipo_pago_id,
    usuario_id: payload.usuario_id,
    total: payload.total,
    fecha: new Date().toISOString(),
    tipo_egreso: 'retiro_caja',
    descripcion: payload.descripcion ?? 'Retiro de efectivo de caja'
  };

  const { data, error } = await this.supabase
    .from('egreso')
    .insert([dataInsert])
    .select('*')
    .single();

  if (error) {
    console.error('Error al registrar retiro de caja:', error);
    return null;
  }

  return data;
}

async obtenerPrimeraFechaMovimientoCaja() {
  const fechas: string[] = [];

  const { data: ingreso } = await this.supabase
    .from('ingreso')
    .select('fecha')
    .order('fecha', { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: gasto } = await this.supabase
    .from('gasto')
    .select('fecha')
    .order('fecha', { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: egreso } = await this.supabase
    .from('egreso')
    .select('fecha')
    .order('fecha', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (ingreso?.fecha) fechas.push(ingreso.fecha);
  if (gasto?.fecha) fechas.push(gasto.fecha);
  if (egreso?.fecha) fechas.push(egreso.fecha);

  if (fechas.length === 0) return null;

  fechas.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  return fechas[0];
}

async verificarYCerrarDiasPendientes() {
  const usuarioId = this.obtenerUsuarioLogueadoId();

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  let fechaInicio: Date;
  let saldoInicial = 0;

  const ultimoCierre = await this.obtenerUltimoCierreAntesDe(hoy.toISOString());

  if (ultimoCierre) {
    fechaInicio = new Date(ultimoCierre.fecha);
    fechaInicio.setDate(fechaInicio.getDate() + 1);
    fechaInicio.setHours(0, 0, 0, 0);
    saldoInicial = Number(ultimoCierre.saldo_final) || 0;
  } else {
    const primeraFecha = await this.obtenerPrimeraFechaMovimientoCaja();

    if (!primeraFecha) {
      return true;
    }

    fechaInicio = new Date(primeraFecha);
    fechaInicio.setHours(0, 0, 0, 0);
  }

  const fechaLimite = new Date(hoy);
  fechaLimite.setDate(fechaLimite.getDate() - 1);
  fechaLimite.setHours(0, 0, 0, 0);

  while (fechaInicio <= fechaLimite) {
    const inicioDia = new Date(fechaInicio);
    inicioDia.setHours(0, 0, 0, 0);

    const finDia = new Date(fechaInicio);
    finDia.setHours(23, 59, 59, 999);

    const cierreExistente = await this.obtenerCierreDelDia(
      inicioDia.toISOString(),
      finDia.toISOString()
    );

    if (cierreExistente) {
      saldoInicial = Number(cierreExistente.saldo_final) || 0;
      fechaInicio.setDate(fechaInicio.getDate() + 1);
      continue;
    }

    const resumen = await this.calcularResumenCajaPorFecha(
      inicioDia.toISOString(),
      finDia.toISOString()
    );

    const saldoFinal = saldoInicial + resumen.ingresosEfectivo - resumen.egresosEfectivo;

    const cierre = {
      fecha: finDia.toISOString(),
      saldo_inicial: saldoInicial,
      ingresos_total: resumen.ingresosTotal,
      ingresos_efectivo: resumen.ingresosEfectivo,
      ingresos_transferencia: resumen.ingresosTransferencia,
      ingresos_tarjeta: resumen.ingresosTarjeta,
      egresos_total: resumen.egresosTotal,
      egresos_efectivo: resumen.egresosEfectivo,
      egresos_transferencia: resumen.egresosTransferencia,
      egresos_tarjeta: resumen.egresosTarjeta,
      saldo_final: saldoFinal,
      efectivo_caja: saldoFinal,
      usuario_id: usuarioId,
      total_ingresos: resumen.ingresosTotal,
      total_egresos: resumen.egresosTotal,
      diferencia: 0
    };

    const cierreGuardado = await this.registrarCierre(cierre);

    if (!cierreGuardado) {
      return false;
    }

    saldoInicial = saldoFinal;
    fechaInicio.setDate(fechaInicio.getDate() + 1);
  }

  return true;
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
      descripcion: venta.descripcion,
      venta_id: null
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
      total: payload.monto,
      tipo_ingreso: 'pago_deuda',
      descripcion: payload.descripcion ?? 'Pago de deuda',
      id_deuda: deuda.deuda_id,
      venta_id: null
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

  async registrarAjustePositivo(payload: {
    total: number;
    tipo_pago_id: number;
    usuario_id: number;
    descripcion?: string;
  }) {
    const ingreso = await this.crearIngreso({
      tipo_pago_id: payload.tipo_pago_id,
      usuario_id: payload.usuario_id,
      total: payload.total,
      tipo_ingreso: 'ajuste_positivo',
      descripcion: payload.descripcion ?? 'Ajuste positivo de caja',
      venta_id: null
    });

    if (!ingreso) {
      console.error('Error al registrar ajuste positivo');
      return null;
    }

    return ingreso;
  }

  async registrarAjusteNegativo(payload: {
    total: number;
    tipo_pago_id: number;
    usuario_id: number;
    descripcion?: string;
  }) {
    const dataInsert = {
      tipo_pago_id: payload.tipo_pago_id,
      usuario_id: payload.usuario_id,
      total: payload.total,
      fecha: new Date().toISOString(),
      tipo_egreso: 'ajuste_negativo',
      descripcion: payload.descripcion ?? 'Ajuste negativo de caja'
    };

    const { data, error } = await this.supabase
      .from('egreso')
      .insert([dataInsert])
      .select('*')
      .single();

    if (error) {
      console.error('Error al registrar ajuste negativo:', error);
      return null;
    }

    return data;
  }

  private dataUrlABlob(dataUrl: string): Blob {
    const partes = dataUrl.split(',');
    const mime = partes[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bytes = atob(partes[1]);
    const array = new Uint8Array(bytes.length);

    for (let i = 0; i < bytes.length; i++) {
      array[i] = bytes.charCodeAt(i);
    }

    return new Blob([array], { type: mime });
  }

  async subirImagenProducto(dataUrl: string, nombreProducto: string): Promise<string | null> {
    try {
      const blob = this.dataUrlABlob(dataUrl);
      const extension = blob.type.split('/')[1] || 'jpg';
      const nombreLimpio = (nombreProducto || 'producto')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-');

      const nombreArchivo = `${Date.now()}-${nombreLimpio}.${extension}`;
      const rutaArchivo = `productos/${nombreArchivo}`;

      const { error } = await this.supabase.storage
        .from('productos')
        .upload(rutaArchivo, blob, {
          contentType: blob.type,
          upsert: true
        });

      if (error) {
        console.error('Error al subir imagen a storage:', error);
        return null;
      }

      const { data } = this.supabase.storage
        .from('productos')
        .getPublicUrl(rutaArchivo);

      return data.publicUrl;
    } catch (error) {
      console.error('Error al procesar la imagen:', error);
      return null;
    }
  }

  async devolverStockAExhibicion(productoId: number, cantidad: number) {
    if (!productoId || cantidad <= 0) {
      console.error('Datos inválidos para devolver stock a exhibición');
      return null;
    }

    const { data: stockData, error } = await this.supabase
      .from('producto_stock')
      .select('*')
      .eq('producto_id', productoId)
      .eq('ubicacion', 'exhibicion')
      .single();

    if (error || !stockData) {
      console.error('No se encontró stock en exhibición:', error);
      return null;
    }

    const stockActual = Number(stockData.cantidad || 0);
    const nuevoStock = stockActual + cantidad;

    const actualizado = await this.actualizarStockPorUbicacion(
      productoId,
      'exhibicion',
      nuevoStock
    );

    if (!actualizado) {
      return null;
    }

    await this.registrarMovimientoInventario({
      producto_id: productoId,
      tipo_movimiento: 'ajuste_positivo',
      ubicacion_origen: null,
      ubicacion_destino: 'exhibicion',
      cantidad: cantidad,
      motivo: 'Devolución por edición o eliminación de venta',
      usuario_id: this.obtenerUsuarioLogueadoId()
    });

    return actualizado;
  }

  async recalcularTotalVenta(ventaId: number) {
    const { data: detalles, error } = await this.supabase
      .from('venta_detallada')
      .select('subtotal')
      .eq('venta_id', ventaId)
      .eq('estado', true);

    if (error) {
      console.error('Error al obtener detalles para recalcular venta:', error);
      return null;
    }

    const nuevoTotal = (detalles || []).reduce((sum, item: any) => {
      return sum + Number(item.subtotal || 0);
    }, 0);

    const { data: ventaActual, error: errorVentaActual } = await this.supabase
      .from('venta')
      .select('monto')
      .eq('venta_id', ventaId)
      .single();

    if (errorVentaActual || !ventaActual) {
      console.error('Error al obtener monto actual de venta:', errorVentaActual);
      return null;
    }

    const montoAnterior = Number(ventaActual.monto || 0);

    const { data: ventaActualizada, error: errorVenta } = await this.supabase
      .from('venta')
      .update({
        monto: nuevoTotal,
        estado: nuevoTotal > 0
      })
      .eq('venta_id', ventaId)
      .select('*')
      .single();

    if (errorVenta) {
      console.error('Error al actualizar total de venta:', errorVenta);
      return null;
    }

    const { data: ingresos, error: errorIngresos } = await this.supabase
      .from('ingreso')
      .select('*')
      .eq('venta_id', ventaId)
      .eq('estado', true);

    if (errorIngresos) {
      console.error('Error al obtener ingresos de la venta:', errorIngresos);
      return null;
    }

    if (!ingresos || ingresos.length === 0) {
      return ventaActualizada;
    }

    if (nuevoTotal <= 0) {
      const { error: errorEliminarIngresos } = await this.supabase
        .from('ingreso')
        .update({ estado: false, total: 0 })
        .eq('venta_id', ventaId);

      if (errorEliminarIngresos) {
        console.error('Error al eliminar ingresos lógicamente:', errorEliminarIngresos);
        return null;
      }

      return ventaActualizada;
    }

    if (ingresos.length === 1 || montoAnterior <= 0) {
      const { error: errorUnicoIngreso } = await this.supabase
        .from('ingreso')
        .update({ total: nuevoTotal })
        .eq('ingreso_id', ingresos[0].ingreso_id);

      if (errorUnicoIngreso) {
        console.error('Error al actualizar ingreso único:', errorUnicoIngreso);
        return null;
      }

      return ventaActualizada;
    }

    let totalAsignado = 0;

    for (let i = 0; i < ingresos.length; i++) {
      const ingreso = ingresos[i];

      let nuevoMontoIngreso = 0;

      if (i === ingresos.length - 1) {
        nuevoMontoIngreso = Number((nuevoTotal - totalAsignado).toFixed(2));
      } else {
        const porcentaje = Number(ingreso.total || 0) / montoAnterior;
        nuevoMontoIngreso = Number((nuevoTotal * porcentaje).toFixed(2));
        totalAsignado += nuevoMontoIngreso;
      }

      const { error: errorActualizarIngreso } = await this.supabase
        .from('ingreso')
        .update({ total: nuevoMontoIngreso })
        .eq('ingreso_id', ingreso.ingreso_id);

      if (errorActualizarIngreso) {
        console.error('Error al actualizar ingreso proporcional:', errorActualizarIngreso);
        return null;
      }
    }

    return ventaActualizada;
  }

  async editarProductoDeVenta(ventaDetalladaId: number, nuevaCantidad: number) {
    if (!ventaDetalladaId || nuevaCantidad <= 0) {
      console.error('Datos inválidos para editar producto de venta');
      return null;
    }

    const { data: detalle, error } = await this.supabase
      .from('venta_detallada')
      .select('*')
      .eq('venta_detallada_id', ventaDetalladaId)
      .eq('estado', true)
      .single();

    if (error || !detalle) {
      console.error('No se encontró el detalle de venta:', error);
      return null;
    }

    const cantidadActual = Number(detalle.cantidad || 0);
    const productoId = Number(detalle.producto_id);
    const diferencia = nuevaCantidad - cantidadActual;

    if (diferencia > 0) {
      const { data: stockData, error: errorStock } = await this.supabase
        .from('producto_stock')
        .select('*')
        .eq('producto_id', productoId)
        .eq('ubicacion', 'exhibicion')
        .single();

      if (errorStock || !stockData) {
        console.error('No se encontró stock en exhibición:', errorStock);
        return null;
      }

      const stockActual = Number(stockData.cantidad || 0);

      if (stockActual < diferencia) {
        console.error('Stock insuficiente para aumentar la cantidad');
        return null;
      }

      const actualizado = await this.actualizarStockPorUbicacion(
        productoId,
        'exhibicion',
        stockActual - diferencia
      );

      if (!actualizado) {
        return null;
      }

      await this.registrarMovimientoInventario({
        producto_id: productoId,
        tipo_movimiento: 'venta',
        ubicacion_origen: 'exhibicion',
        ubicacion_destino: null,
        cantidad: diferencia,
        motivo: 'Aumento de cantidad en venta editada',
        usuario_id: this.obtenerUsuarioLogueadoId()
      });
    }

    if (diferencia < 0) {
      const cantidadDevuelta = Math.abs(diferencia);
      const devuelto = await this.devolverStockAExhibicion(productoId, cantidadDevuelta);

      if (!devuelto) {
        return null;
      }
    }

    const precioUnitario = Number(detalle.precio_unitario || 0);
    const nuevoSubtotal = precioUnitario * nuevaCantidad;

    const { data: detalleActualizado, error: errorUpdate } = await this.supabase
      .from('venta_detallada')
      .update({
        cantidad: nuevaCantidad,
        subtotal: nuevoSubtotal
      })
      .eq('venta_detallada_id', ventaDetalladaId)
      .select('*')
      .single();

    if (errorUpdate) {
      console.error('Error al actualizar producto de venta:', errorUpdate);
      return null;
    }

    const ventaActualizada = await this.recalcularTotalVenta(Number(detalle.venta_id));

    if (!ventaActualizada) {
      return null;
    }

    return detalleActualizado;
  }

  async eliminarProductoDeVenta(ventaDetalladaId: number) {
    if (!ventaDetalladaId) {
      console.error('Detalle de venta inválido');
      return null;
    }

    const { data: detalle, error } = await this.supabase
      .from('venta_detallada')
      .select('*')
      .eq('venta_detallada_id', ventaDetalladaId)
      .eq('estado', true)
      .single();

    if (error || !detalle) {
      console.error('No se encontró el detalle de venta:', error);
      return null;
    }

    const devuelto = await this.devolverStockAExhibicion(
      Number(detalle.producto_id),
      Number(detalle.cantidad || 0)
    );

    if (!devuelto) {
      return null;
    }

    const { data, error: errorEliminar } = await this.supabase
      .from('venta_detallada')
      .update({ estado: false })
      .eq('venta_detallada_id', ventaDetalladaId)
      .select('*')
      .single();

    if (errorEliminar) {
      console.error('Error al eliminar producto de venta:', errorEliminar);
      return null;
    }

    const ventaActualizada = await this.recalcularTotalVenta(Number(detalle.venta_id));

    if (!ventaActualizada) {
      return null;
    }

    return data;
  }

  async eliminarVentaLogica(ventaId: number) {
    if (!ventaId) {
      console.error('Venta inválida');
      return null;
    }

    const { data: detalles, error } = await this.supabase
      .from('venta_detallada')
      .select('*')
      .eq('venta_id', ventaId)
      .eq('estado', true);

    if (error) {
      console.error('Error al obtener detalles de venta:', error);
      return null;
    }

    for (const detalle of detalles || []) {
      const devuelto = await this.devolverStockAExhibicion(
        Number(detalle.producto_id),
        Number(detalle.cantidad || 0)
      );

      if (!devuelto) {
        return null;
      }
    }

    const { error: errorDetalles } = await this.supabase
      .from('venta_detallada')
      .update({ estado: false })
      .eq('venta_id', ventaId)
      .eq('estado', true);

    if (errorDetalles) {
      console.error('Error al eliminar detalles de venta:', errorDetalles);
      return null;
    }

    const { error: errorIngresos } = await this.supabase
      .from('ingreso')
      .update({ estado: false })
      .eq('venta_id', ventaId)
      .eq('tipo_ingreso', 'venta');

    if (errorIngresos) {
      console.error('Error al eliminar ingresos de venta:', errorIngresos);
      return null;
    }

    const { data, error: errorVenta } = await this.supabase
      .from('venta')
      .update({ estado: false })
      .eq('venta_id', ventaId)
      .select('*')
      .single();

    if (errorVenta) {
      console.error('Error al eliminar venta:', errorVenta);
      return null;
    }

    return data;
  }

  async obtenerStockExhibicionProducto(productoId: number) {
    const { data, error } = await this.supabase
      .from('producto_stock')
      .select('*')
      .eq('producto_id', productoId)
      .eq('ubicacion', 'exhibicion')
      .single();

    if (error || !data) {
      console.error('No se encontró stock en exhibición:', error);
      return null;
    }

    return data;
  }

  async actualizarIngresosDeVentaEditada(
    ventaId: number,
    usuarioId: number,
    pagos: { tipo_pago_id: number; monto: number }[]
  ) {
    const { error: errorEliminarIngresos } = await this.supabase
      .from('ingreso')
      .update({
        estado: false
      })
      .eq('venta_id', ventaId)
      .eq('tipo_ingreso', 'venta');

    if (errorEliminarIngresos) {
      console.error('Error al desactivar ingresos anteriores:', errorEliminarIngresos);
      return null;
    }

    const ingresos = pagos.map(pago => ({
      tipo_pago_id: pago.tipo_pago_id,
      usuario_id: usuarioId,
      total: pago.monto,
      tipo_ingreso: 'venta' as TipoIngreso,
      descripcion: 'Venta editada',
      venta_id: ventaId,
      fecha: new Date().toISOString(),
      id_deuda: null,
      estado: true
    }));

    const { data, error } = await this.supabase
      .from('ingreso')
      .insert(ingresos)
      .select('*');

    if (error) {
      console.error('Error al registrar nuevos ingresos de la venta editada:', error);
      return null;
    }

    return data;
  }

  async actualizarVentaExistente(
    ventaId: number,
    productos: any[],
    clienteId: number,
    usuarioId: number,
    pagos: { tipo_pago_id: number; monto: number }[]
  ) {
    if (!ventaId) {
      console.error('No se recibió ventaId para editar.');
      return null;
    }

    const total = productos.reduce((sum, p) => {
      return sum + (Number(p.precio || 0) * Number(p.cantidadSeleccionada || 0));
    }, 0);

    const totalPagos = pagos.reduce((sum, p) => {
      return sum + Number(p.monto || 0);
    }, 0);

    if (Number(totalPagos) !== Number(total)) {
      console.error('La suma de los pagos no coincide con el total de la venta editada.');
      return null;
    }

    const { data: detallesAnteriores, error: errorDetalles } = await this.supabase
      .from('venta_detallada')
      .select('*')
      .eq('venta_id', ventaId)
      .eq('estado', true);

    if (errorDetalles) {
      console.error('Error al obtener detalles anteriores:', errorDetalles);
      return null;
    }

    for (const producto of productos) {
      const productoId = Number(producto.producto_id);
      const nuevaCantidad = Number(producto.cantidadSeleccionada || 0);

      const cantidadAnterior = (detallesAnteriores || [])
        .filter((detalle: any) => Number(detalle.producto_id) === productoId)
        .reduce((sum: number, detalle: any) => {
          return sum + Number(detalle.cantidad || 0);
        }, 0);

      const stockExhibicion = await this.obtenerStockExhibicionProducto(productoId);

      if (!stockExhibicion) {
        return null;
      }

      const stockActual = Number(stockExhibicion.cantidad || 0);
      const stockDisponibleParaEditar = stockActual + cantidadAnterior;

      if (nuevaCantidad > stockDisponibleParaEditar) {
        console.error('Stock insuficiente para editar el producto:', producto.nombre);
        return null;
      }
    }

    const productosProcesados: number[] = [];

    for (const producto of productos) {
      const productoId = Number(producto.producto_id);
      const nuevaCantidad = Number(producto.cantidadSeleccionada || 0);

      const cantidadAnterior = (detallesAnteriores || [])
        .filter((detalle: any) => Number(detalle.producto_id) === productoId)
        .reduce((sum: number, detalle: any) => {
          return sum + Number(detalle.cantidad || 0);
        }, 0);

      const stockExhibicion = await this.obtenerStockExhibicionProducto(productoId);

      if (!stockExhibicion) {
        return null;
      }

      const stockActual = Number(stockExhibicion.cantidad || 0);
      const nuevoStock = stockActual + cantidadAnterior - nuevaCantidad;

      const actualizado = await this.actualizarStockPorUbicacion(
        productoId,
        'exhibicion',
        nuevoStock
      );

      if (!actualizado) {
        return null;
      }

      const diferencia = nuevaCantidad - cantidadAnterior;

      if (diferencia > 0) {
        await this.registrarMovimientoInventario({
          producto_id: productoId,
          tipo_movimiento: 'venta',
          ubicacion_origen: 'exhibicion',
          ubicacion_destino: null,
          cantidad: diferencia,
          motivo: 'Aumento de cantidad por edición de venta',
          usuario_id: usuarioId
        });
      }

      if (diferencia < 0) {
        await this.registrarMovimientoInventario({
          producto_id: productoId,
          tipo_movimiento: 'ajuste_positivo',
          ubicacion_origen: null,
          ubicacion_destino: 'exhibicion',
          cantidad: Math.abs(diferencia),
          motivo: 'Devolución por edición de venta',
          usuario_id: usuarioId
        });
      }

      productosProcesados.push(productoId);
    }

    for (const detalle of detallesAnteriores || []) {
      const productoIdAnterior = Number(detalle.producto_id);

      if (!productosProcesados.includes(productoIdAnterior)) {
        const stockExhibicion = await this.obtenerStockExhibicionProducto(productoIdAnterior);

        if (!stockExhibicion) {
          return null;
        }

        const stockActual = Number(stockExhibicion.cantidad || 0);
        const cantidadDevuelta = Number(detalle.cantidad || 0);

        const actualizado = await this.actualizarStockPorUbicacion(
          productoIdAnterior,
          'exhibicion',
          stockActual + cantidadDevuelta
        );

        if (!actualizado) {
          return null;
        }

        await this.registrarMovimientoInventario({
          producto_id: productoIdAnterior,
          tipo_movimiento: 'ajuste_positivo',
          ubicacion_origen: null,
          ubicacion_destino: 'exhibicion',
          cantidad: cantidadDevuelta,
          motivo: 'Producto eliminado de la venta editada',
          usuario_id: usuarioId
        });
      }
    }

    const { error: errorEliminarDetalles } = await this.supabase
      .from('venta_detallada')
      .update({ estado: false })
      .eq('venta_id', ventaId)
      .eq('estado', true);

    if (errorEliminarDetalles) {
      console.error('Error al eliminar detalles anteriores:', errorEliminarDetalles);
      return null;
    }

    const detallesNuevos = await this.registrarVentaDetallesPorVenta(ventaId, productos);

    if (!detallesNuevos) {
      return null;
    }

    const { data: ventaActualizada, error: errorVenta } = await this.supabase
      .from('venta')
      .update({
        cliente_id: clienteId,
        usuario_id: usuarioId,
        monto: total,
        estado: true
      })
      .eq('venta_id', ventaId)
      .select('*')
      .single();

    if (errorVenta) {
      console.error('Error al actualizar la venta:', errorVenta);
      return null;
    }

    const ingresos = await this.actualizarIngresosDeVentaEditada(
      ventaId,
      usuarioId,
      pagos
    );

    if (!ingresos) {
      return null;
    }

    return {
      venta: ventaActualizada,
      detalles: detallesNuevos,
      ingresos: ingresos
    };
  }

  getSupabase() {
    return this.supabase;
  }
}
