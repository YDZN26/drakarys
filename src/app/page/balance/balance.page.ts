import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { SupabaseService } from '../../supabase.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MensajeService } from 'src/app/mensaje.service';

@Component({
  selector: 'app-balance',
  templateUrl: './balance.page.html',
  styleUrls: ['./balance.page.scss'],
})
export class BalancePage implements OnInit {

  nombreUsuario: string = 'Usuario';
  days: string[] = [];
  selectedDay: string = '';
  fechaActualISO = new Date().toISOString();

  tipoPeriodo: string = 'diario';
  periodoOpciones: any[] = [];
  mostrarModalPeriodo: boolean = false;

  fechaMaximaISO: string = new Date().toISOString();
  fechaInicioPersonalizada: string = new Date().toISOString();
  fechaFinPersonalizada: string = new Date().toISOString();

  ingresos: any[] = [];
  egresos: any[] = [];
  filteredItems: any[] = [];

  private mensajeSub!: Subscription;
  mensaje: string = '';

  saldoInicial: number = 0;

  mostrarCampoBusqueda = false;
  textoBusqueda: string = '';

  vistaActual: 'ingresos' | 'egresos' = 'ingresos';

  mostrarModalNuevaVenta: boolean = false;
  rutaVentaSeleccionada: string = '';

  mostrarModalCerrarSesion: boolean = false;
  cerrarSesionConfirmado: boolean = false;

  tiposPago: { [key: number]: string } = {
    1: 'Cuota',
    2: 'Efectivo',
    3: 'Transferencia Bancaria',
    4: 'Tarjeta'
  };

  constructor(
    private navCtrl: NavController,
    private supabaseService: SupabaseService,
    private router: Router,
    private mensajeService: MensajeService
  ) {}

  async ngOnInit() {
    const usuarioGuardado = localStorage.getItem('usuario');

    if (usuarioGuardado) {
      try {
        const usuarioObj = JSON.parse(usuarioGuardado);
        this.nombreUsuario = this.capitalize(usuarioObj.username);
      } catch (error) {
        this.nombreUsuario = 'Usuario';
      }
    }

    this.generarDiasHistoricos(365);
    this.seleccionarUltimaOpcionDisponible();

    await this.supabaseService.verificarYCerrarDiasPendientes();
    await this.onDaySelected(this.selectedDay);

    this.mensajeSub = this.mensajeService.mensaje$.subscribe((mensaje: string) => {
      if (mensaje) {
        this.mensaje = mensaje;
        if (
          mensaje === 'actualizar ingresos' ||
          mensaje === 'actualizar gastos' ||
          mensaje === 'actualizar cierre'
        ) {
          this.onDaySelected(this.selectedDay);
        }
      }
    });
  }

  async ionViewWillEnter() {
    await this.supabaseService.verificarYCerrarDiasPendientes();
    await this.onDaySelected(this.selectedDay);
    this.centrarPeriodoSeleccionado();
  }

  capitalize(nombre: string): string {
    return nombre.charAt(0).toUpperCase() + nombre.slice(1);
  }

  abrirModalCerrarSesion() {
    this.mostrarModalCerrarSesion = true;
  }

  cerrarModalCerrarSesion() {
    this.mostrarModalCerrarSesion = false;
  }

  confirmarCerrarSesion() {
    this.cerrarSesionConfirmado = true;
    this.mostrarModalCerrarSesion = false;
  }

  alCerrarModalCerrarSesion() {
    if (this.cerrarSesionConfirmado) {
      this.cerrarSesionConfirmado = false;
      localStorage.clear();
      this.router.navigate(['/login']);
    }
  }

  abrirModalNuevaVenta() {
    this.rutaVentaSeleccionada = '';
    this.mostrarModalNuevaVenta = true;
  }

  cerrarModalNuevaVenta() {
    this.rutaVentaSeleccionada = '';
    this.mostrarModalNuevaVenta = false;
  }

  alCerrarModalNuevaVenta() {
    this.mostrarModalNuevaVenta = false;

    if (this.rutaVentaSeleccionada) {
      const ruta = this.rutaVentaSeleccionada;
      this.rutaVentaSeleccionada = '';
      this.router.navigate([ruta]);
    }
  }

  abrirModalPeriodo() {
    this.mostrarModalPeriodo = true;
  }

  cerrarModalPeriodo() {
    this.mostrarModalPeriodo = false;
  }

  seleccionarUltimaOpcionDisponible() {
    if (this.days.length > 0) {
      this.selectedDay = this.days[this.days.length - 1];
      this.centrarPeriodoSeleccionado();
    }
  }

  centrarPeriodoSeleccionado() {
    setTimeout(() => {
      const seleccionado = document.querySelector('.fecha-toolbar ion-segment-button.selected-date') as HTMLElement;

      if (seleccionado) {
        seleccionado.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest'
        });
      }
    }, 100);
  }

  formatearFechaCorta(fecha: Date): string {
    const dia = fecha.getDate();
    const mes = fecha.toLocaleString('es-BO', { month: 'long' });
    return `${dia} de ${mes}`;
  }

  formatearMes(fecha: Date): string {
    const mes = fecha.toLocaleString('es-BO', { month: 'long' });
    const anio = fecha.getFullYear();
    return `${mes} ${anio}`;
  }

  generarDiasHistoricos(cantidadDias: number = 365) {
    const opciones: any[] = [];
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);

    for (let i = cantidadDias - 1; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);

      const inicio = new Date(fecha);
      inicio.setHours(0, 0, 0, 0);

      const fin = new Date(fecha);
      fin.setHours(23, 59, 59, 999);

      if (inicio.getTime() <= hoy.getTime()) {
        opciones.push({
          label: this.formatearFechaCorta(fecha),
          inicio: inicio.toISOString(),
          fin: fin.toISOString()
        });
      }
    }

    this.periodoOpciones = opciones;
    this.days = opciones.map((opcion: any) => opcion.label);
  }

  generarSemanasHistoricas(cantidadSemanas: number = 52) {
    const opciones: any[] = [];
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);

    const inicioSemanaActual = new Date();
    const diaSemana = inicioSemanaActual.getDay();
    const resta = diaSemana === 0 ? 6 : diaSemana - 1;
    inicioSemanaActual.setDate(inicioSemanaActual.getDate() - resta);
    inicioSemanaActual.setHours(0, 0, 0, 0);

    for (let i = cantidadSemanas - 1; i >= 0; i--) {
      const inicio = new Date(inicioSemanaActual);
      inicio.setDate(inicio.getDate() - (i * 7));
      inicio.setHours(0, 0, 0, 0);

      let fin = new Date(inicio);
      fin.setDate(fin.getDate() + 6);
      fin.setHours(23, 59, 59, 999);

      if (fin.getTime() > hoy.getTime()) {
        fin = new Date(hoy);
      }

      opciones.push({
        label: `${this.formatearFechaCorta(inicio)} - ${this.formatearFechaCorta(fin)}`,
        inicio: inicio.toISOString(),
        fin: fin.toISOString()
      });
    }

    this.periodoOpciones = opciones;
    this.days = opciones.map((opcion: any) => opcion.label);
  }

  generarMesesHistoricos(cantidadMeses: number = 24) {
    const opciones: any[] = [];
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);

    for (let i = cantidadMeses - 1; i >= 0; i--) {
      const fechaBase = new Date();
      fechaBase.setMonth(fechaBase.getMonth() - i);

      const inicio = new Date(fechaBase.getFullYear(), fechaBase.getMonth(), 1);
      inicio.setHours(0, 0, 0, 0);

      let fin = new Date(fechaBase.getFullYear(), fechaBase.getMonth() + 1, 0);
      fin.setHours(23, 59, 59, 999);

      if (fin.getTime() > hoy.getTime()) {
        fin = new Date(hoy);
      }

      opciones.push({
        label: this.formatearMes(inicio),
        inicio: inicio.toISOString(),
        fin: fin.toISOString()
      });
    }

    this.periodoOpciones = opciones;
    this.days = opciones.map((opcion: any) => opcion.label);
  }

  generarAniosHistoricos(cantidadAnios: number = 5) {
    const opciones: any[] = [];
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);

    const anioActual = hoy.getFullYear();

    for (let i = cantidadAnios - 1; i >= 0; i--) {
      const anio = anioActual - i;

      const inicio = new Date(anio, 0, 1);
      inicio.setHours(0, 0, 0, 0);

      let fin = new Date(anio, 11, 31);
      fin.setHours(23, 59, 59, 999);

      if (fin.getTime() > hoy.getTime()) {
        fin = new Date(hoy);
      }

      opciones.push({
        label: `${anio}`,
        inicio: inicio.toISOString(),
        fin: fin.toISOString()
      });
    }

    this.periodoOpciones = opciones;
    this.days = opciones.map((opcion: any) => opcion.label);
  }

  async seleccionarTipoPeriodo(tipo: string) {
    this.tipoPeriodo = tipo;

    if (tipo === 'diario') {
      this.generarDiasHistoricos(365);
      this.seleccionarUltimaOpcionDisponible();
      this.mostrarModalPeriodo = false;
      await this.onDaySelected(this.selectedDay);
      this.centrarPeriodoSeleccionado();
    }

    if (tipo === 'semanal') {
      this.generarSemanasHistoricas(52);
      this.seleccionarUltimaOpcionDisponible();
      this.mostrarModalPeriodo = false;
      await this.onDaySelected(this.selectedDay);
      this.centrarPeriodoSeleccionado();
    }

    if (tipo === 'mensual') {
      this.generarMesesHistoricos(24);
      this.seleccionarUltimaOpcionDisponible();
      this.mostrarModalPeriodo = false;
      await this.onDaySelected(this.selectedDay);
      this.centrarPeriodoSeleccionado();
    }

    if (tipo === 'anual') {
      this.generarAniosHistoricos(5);
      this.seleccionarUltimaOpcionDisponible();
      this.mostrarModalPeriodo = false;
      await this.onDaySelected(this.selectedDay);
      this.centrarPeriodoSeleccionado();
    }
  }

  activarRangoPersonalizado() {
    this.tipoPeriodo = 'personalizado';

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    this.fechaInicioPersonalizada = hoy.toISOString();
    this.fechaFinPersonalizada = hoy.toISOString();
  }

  cambiarFechaInicioPersonalizada(event: any) {
    this.fechaInicioPersonalizada = event.detail.value;
  }

  cambiarFechaFinPersonalizada(event: any) {
    this.fechaFinPersonalizada = event.detail.value;
  }

  async aplicarRangoPersonalizado() {
    const inicio = new Date(this.fechaInicioPersonalizada);
    const fin = new Date(this.fechaFinPersonalizada);
    const hoy = new Date();

    inicio.setHours(0, 0, 0, 0);
    fin.setHours(23, 59, 59, 999);
    hoy.setHours(23, 59, 59, 999);

    if (fin.getTime() > hoy.getTime()) {
      fin.setTime(hoy.getTime());
    }

    if (inicio.getTime() > fin.getTime()) {
      return;
    }

    const label = `${this.formatearFechaCorta(inicio)} - ${this.formatearFechaCorta(fin)}`;

    this.periodoOpciones = [
      {
        label: label,
        inicio: inicio.toISOString(),
        fin: fin.toISOString()
      }
    ];

    this.days = [label];
    this.selectedDay = label;
    this.mostrarModalPeriodo = false;

    await this.cargarBalance(inicio.toISOString(), fin.toISOString());
    this.centrarPeriodoSeleccionado();
  }

  async onDaySelected(dayString: string | null) {
    if (!dayString) return;

    this.selectedDay = dayString;

    const opcion = this.periodoOpciones.find((item: any) => item.label === dayString);

    if (!opcion) return;

    await this.cargarBalance(opcion.inicio, opcion.fin);
    this.centrarPeriodoSeleccionado();
  }

  async cargarSaldoInicial(fechaInicioDelDiaISO: string) {
    const ultimo = await this.supabaseService.obtenerUltimoCierreAntesDe(fechaInicioDelDiaISO);

    if (!ultimo) {
      this.saldoInicial = 0;
      return;
    }

    const si = Number((ultimo as any).saldo_final ?? 0);
    this.saldoInicial = isNaN(si) ? 0 : si;
  }

  obtenerTextoMetodosPago(ingresos: any[]): string {
    if (!ingresos || ingresos.length === 0) {
      return '-';
    }

    const nombresUnicos = ingresos.map((ingreso: any) => {
      return ingreso?.tipo_de_pago?.nombre || this.tiposPago[Number(ingreso?.tipo_pago_id)] || '-';
    });

    return [...new Set(nombresUnicos)].join(' + ');
  }

  obtenerNombreTipoEgreso(tipoEgreso: string): string {
    if (tipoEgreso === 'retiro_caja') {
      return 'Retiro de caja';
    }

    if (tipoEgreso === 'ajuste_negativo') {
      return 'Ajuste negativo';
    }

    return 'Egreso';
  }

  async cargarBalance(fechaInicio: string, fechaFin: string) {
    await this.cargarSaldoInicial(fechaInicio);

    const detalles = await this.supabaseService.obtenerDetallesVentasPorFecha(fechaInicio, fechaFin);

    const agrupadas: { [key: number]: any[] } = {};
    for (const d of detalles) {
      if (!d.venta) continue;

      const ventaId = d.venta_id;
      if (!agrupadas[ventaId]) {
        agrupadas[ventaId] = [];
      }
      agrupadas[ventaId].push(d);
    }

    const agrupadasArray = Object.values(agrupadas);
    agrupadasArray.sort((a, b) => {
      const tA = new Date(a[0].venta.fecha + 'Z').getTime();
      const tB = new Date(b[0].venta.fecha + 'Z').getTime();
      return tB - tA;
    });

    this.ingresos = agrupadasArray.map((items: any[]) => {
      const venta = items[0].venta;

      const clienteObj = venta.cliente;
      const clienteStr = clienteObj ? `${clienteObj.nombre} ${clienteObj.apellido}` : '-';

      const ingresosVenta = Array.isArray(venta.ingresos)
        ? venta.ingresos.filter((ingreso: any) => ingreso.estado !== false)
        : [];

      const tipoPago = this.obtenerTextoMetodosPago(ingresosVenta);

      const fechaObj = venta?.fecha ? new Date(venta.fecha + 'Z') : new Date();
      const hora = fechaObj.toLocaleTimeString('es-BO', { timeZone: 'America/La_Paz' });
      const fechaLocal = fechaObj.toLocaleDateString('es-BO', { timeZone: 'America/La_Paz' });

      const productos = items.map(i => `${i.cantidad} ${i.producto?.nombre}`);
      const total = Number(venta.monto || 0);

      return {
        venta_id: venta.venta_id,
        nombre: productos.length > 1
          ? productos.slice(0, 1).join(', ') + ', ...'
          : productos.join(', '),
        cliente: clienteStr,
        descripcion: `${tipoPago} - ${hora}`,
        precio: total,
        fechaCompleta: fechaObj.toISOString(),
        fechaTexto: `${fechaLocal} ${hora}`,
        productosOriginales: items.map(i => ({
          descripcion: i.producto?.nombre,
          cantidad: i.cantidad
        })),
        textoBusqueda: `${productos.join(', ')} ${clienteStr} ${tipoPago}`.trim()
      };
    });

    const ingresosLibres = await this.supabaseService.obtenerIngresosLibres(fechaInicio, fechaFin);

    const ingresosLibresFormateados = ingresosLibres.map((v: any) => {
      const fechaObj = new Date(v.fecha + 'Z');
      const hora = fechaObj.toLocaleTimeString('es-BO', { timeZone: 'America/La_Paz' });
      const fechaLocal = fechaObj.toLocaleDateString('es-BO', { timeZone: 'America/La_Paz' });

      const tipoPago = v.tipo_de_pago?.nombre ?? '-';

      const titulo =
        v.tipo_ingreso === 'pago_deuda'
          ? `${(v.deuda?.descripcion ?? 'Deuda')} - Pago de deuda`
          : (v.descripcion ?? '-');

      const clienteLabel =
        v.tipo_ingreso === 'ingresos_varios'
          ? 'Ingreso Libre'
          : v.tipo_ingreso === 'venta_libre'
            ? 'Venta Libre'
            : '-';

      return {
        ingreso_id: v.ingreso_id ?? null,
        nombre: titulo,
        cliente: clienteLabel,
        descripcion: `${tipoPago} - ${hora}`,
        precio: parseFloat(v.total),
        fechaCompleta: fechaObj.toISOString(),
        fechaTexto: `${fechaLocal} ${hora}`,
        productosOriginales: [],
        textoBusqueda: `${titulo} ${v.descripcion ?? ''} ${tipoPago}`.trim()
      };
    });

    this.ingresos = [...this.ingresos, ...ingresosLibresFormateados];
    this.ingresos.sort((a, b) =>
      new Date(b.fechaCompleta).getTime() - new Date(a.fechaCompleta).getTime()
    );

    const gastos = await this.supabaseService.obtenerGastos(fechaInicio, fechaFin);
    const otrosEgresos = await this.supabaseService.obtenerOtrosEgresos(fechaInicio, fechaFin);

    const gastosFormateados = gastos.map((g: any) => {
      const fechaObj = g.fecha ? new Date(g.fecha + 'Z') : new Date();
      const hora = fechaObj.toLocaleTimeString('es-BO', { timeZone: 'America/La_Paz' });

      const tipoPago = g.tipo_de_pago?.nombre ?? '-';

      return {
        nombre: g.descripcion,
        descripcion: `${tipoPago} - ${hora}`,
        precio: parseFloat(g.monto),
        fechaCompleta: fechaObj.toISOString(),
        textoBusqueda: `${g.descripcion ?? ''} ${tipoPago}`.toLowerCase()
      };
    });

    const otrosEgresosFormateados = otrosEgresos.map((e: any) => {
      const fechaObj = e.fecha ? new Date(e.fecha + 'Z') : new Date();
      const hora = fechaObj.toLocaleTimeString('es-BO', { timeZone: 'America/La_Paz' });

      const tipoPago = e.tipo_de_pago?.nombre ?? '-';
      const nombreBase = this.obtenerNombreTipoEgreso(e.tipo_egreso);
      const descripcionBase = e.descripcion ?? nombreBase;

      return {
        nombre: descripcionBase,
        descripcion: `${tipoPago} - ${hora}`,
        precio: parseFloat(e.total),
        fechaCompleta: fechaObj.toISOString(),
        textoBusqueda: `${descripcionBase} ${nombreBase} ${tipoPago}`.toLowerCase()
      };
    });

    this.egresos = [...gastosFormateados, ...otrosEgresosFormateados];
    this.egresos.sort((a, b) =>
      new Date(b.fechaCompleta).getTime() - new Date(a.fechaCompleta).getTime()
    );

    if (this.vistaActual === 'egresos') {
      this.mostrarEgresos();
    } else {
      this.mostrarIngresos();
    }
  }

  filtrarItems() {
    const texto = this.textoBusqueda.toLowerCase().trim();

    if (!texto) {
      this.filteredItems = this.vistaActual === 'ingresos'
        ? this.ingresos
        : this.egresos;
      return;
    }

    if (this.vistaActual === 'ingresos') {
      this.filteredItems = this.ingresos.filter(item =>
        item.textoBusqueda?.toLowerCase().includes(texto) ||
        item.descripcion?.toLowerCase().includes(texto)
      );
    } else {
      this.filteredItems = this.egresos.filter(item =>
        item.nombre?.toLowerCase().includes(texto) ||
        item.descripcion?.toLowerCase().includes(texto) ||
        item.textoBusqueda?.toLowerCase().includes(texto)
      );
    }
  }

  mostrarIngresos() {
    this.vistaActual = 'ingresos';
    this.filteredItems = this.ingresos;
  }

  mostrarEgresos() {
    this.vistaActual = 'egresos';
    this.filteredItems = this.egresos;
  }

  get totalIngresos() {
    return this.ingresos.reduce((acc, i) => acc + i.precio, 0);
  }

  get totalEgresos() {
    return this.egresos.reduce((acc, e) => acc + e.precio, 0);
  }

  get balance() {
    return this.saldoInicial + this.totalIngresos - this.totalEgresos;
  }

  goToNuevaVentaPage() {
    this.navCtrl.navigateForward('/nueva-venta');
  }

  goToNuevoGastoPage() {
    this.navCtrl.navigateForward('/nuevo-gasto');
  }

  goToCierreCaja() {
    this.navCtrl.navigateForward('/cierre-caja');
  }

  verRecibo(item: any) {
    if (this.vistaActual !== 'ingresos') return;

    if (item?.venta_id) {
      this.router.navigate(['/recibo', item.venta_id]);
    }
  }

  irAVentaProductos() {
    if (this.mostrarModalNuevaVenta) {
      this.rutaVentaSeleccionada = '/nueva-venta';
      this.mostrarModalNuevaVenta = false;
    } else {
      this.router.navigate(['/nueva-venta']);
    }
  }

  irAVentaLibre() {
    if (this.mostrarModalNuevaVenta) {
      this.rutaVentaSeleccionada = '/venta-libre';
      this.mostrarModalNuevaVenta = false;
    } else {
      this.router.navigate(['/venta-libre']);
    }
  }
}