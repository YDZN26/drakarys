import { Component, ViewChild, AfterViewInit, OnInit } from '@angular/core';
import { IonModal, NavController, PopoverController } from '@ionic/angular';
import { SupabaseService } from '../../supabase.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MensajeService } from 'src/app/mensaje.service';

@Component({
  selector: 'app-balance',
  templateUrl: './balance.page.html',
  styleUrls: ['./balance.page.scss'],
})
export class BalancePage implements OnInit, AfterViewInit {

  @ViewChild('modalCalendario', { static: false }) modalCalendario!: IonModal;
  presentingElement: HTMLElement | null = null;

  nombreUsuario: string = 'Usuario';
  days: string[] = [];
  selectedDay: string = '';
  fechaActualISO = new Date().toISOString();

  ingresos: any[] = [];
  egresos: any[] = [];
  filteredItems: any[] = [];

  private mensajeSub!: Subscription;
  mensaje: string = '';

  saldoInicial: number = 0;

  mostrarCampoBusqueda = false;
  textoBusqueda: string = '';

  vistaActual: 'ingresos' | 'egresos' = 'ingresos';

  constructor(
    private navCtrl: NavController,
    private supabaseService: SupabaseService,
    private router: Router,
    private mensajeService: MensajeService,
    private popoverCtrl: PopoverController
  ) {}

  ngAfterViewInit() {
    setTimeout(() => {
      this.presentingElement = document.querySelector('ion-content');
    }, 100);
  }

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

    const fecha = new Date();
    const day = fecha.getDate();
    const mes = fecha.toLocaleString('es-BO', { month: 'long' });
    this.selectedDay = `${day} de ${mes}`;

    this.onDaySelected(this.selectedDay);

    this.mensajeSub = this.mensajeService.mensaje$.subscribe((mensaje: string) => {
      if (mensaje) {
        this.mensaje = mensaje;
        if (mensaje === 'actualizar ingresos' || mensaje === 'actualizar gastos') {
          this.onDaySelected(this.selectedDay);
        }
      }
    });
  }

  async ionViewWillEnter() {
    await this.popoverCtrl.dismiss().catch(() => {});
  }

  async ionViewWillLeave() {
    await this.popoverCtrl.dismiss().catch(() => {});
  }

  capitalize(nombre: string): string {
    return nombre.charAt(0).toUpperCase() + nombre.slice(1);
  }

  async cerrarSesion() {
    await this.popoverCtrl.dismiss().catch(() => {});
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  generarDiasHistoricos(cantidadDias: number = 360) {
    const dias: string[] = [];
    for (let i = cantidadDias - 1; i >= 0; i--) {
      const f = new Date();
      f.setDate(f.getDate() - i);
      const d = f.getDate();
      const m = f.toLocaleString('es-BO', { month: 'long' });
      dias.push(`${d} de ${m}`);
    }
    this.days = dias;
  }

  async onDaySelected(dayString: string | null) {
    if (!dayString) return;
    this.selectedDay = dayString;

    const partes = dayString.split(' ');
    if (partes.length < 3) return;

    const dia = parseInt(partes[0]);
    const meses: { [key: string]: number } = {
      enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
      julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
    };
    const mes = meses[partes[2].toLowerCase()];
    const year = new Date().getFullYear();
    if (isNaN(dia) || mes === undefined) return;

    const fechaSeleccionada = new Date(year, mes, dia);
    const inicioDelDia = new Date(fechaSeleccionada.setHours(0, 0, 0, 0)).toISOString();
    const finDelDia = new Date(fechaSeleccionada.setHours(23, 59, 59, 999)).toISOString();

    await this.cargarBalance(inicioDelDia, finDelDia);
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

      const tipoPago = venta?.ingreso?.tipo_de_pago?.nombre ?? '-';

      const fechaObj = venta?.fecha ? new Date(venta.fecha + 'Z') : new Date();
      const hora = fechaObj.toLocaleTimeString('es-BO', { timeZone: 'America/La_Paz' });
      const fechaLocal = fechaObj.toLocaleDateString('es-BO', { timeZone: 'America/La_Paz' });

      const productos = items.map(i => `${i.cantidad} ${i.producto?.nombre}`);
      const total = items.reduce((sum, i) => sum + parseFloat(i.subtotal), 0);

      return {
        venta_id: venta.venta_id,
        nombre: productos.length > 1
          ? productos.slice(0, 1).join(', ') + ', ...'
          : productos.join(', '),
        cliente: clienteStr,
        descripcion: `${tipoPago} - ${hora}`,
        precio: total,
        fechaCompleta: `${fechaLocal} ${hora}`,
        productosOriginales: items.map(i => ({
          descripcion: i.producto?.nombre,
          cantidad: i.cantidad
        })),
        textoBusqueda: `${productos.join(', ')} ${clienteStr}`.trim()
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
        fechaCompleta: `${fechaLocal} ${hora}`,
        productosOriginales: [],
        textoBusqueda: `${titulo} ${v.descripcion ?? ''}`.trim()
      };
    });

    this.ingresos = [...this.ingresos, ...ingresosLibresFormateados];
    this.ingresos.sort((a, b) =>
      new Date(b.fechaCompleta).getTime() - new Date(a.fechaCompleta).getTime()
    );

    const gastos = await this.supabaseService.obtenerGastos(fechaInicio, fechaFin);
    this.egresos = gastos
      .sort((a, b) => new Date(b.fecha + 'Z').getTime() - new Date(a.fecha + 'Z').getTime())
      .map((g: any) => {
        const fechaObj = g.fecha ? new Date(g.fecha + 'Z') : new Date();
        const hora = fechaObj.toLocaleTimeString('es-BO', { timeZone: 'America/La_Paz' });

        const tipoPago = g.tipo_de_pago?.nombre ?? '-';

        return {
          nombre: g.descripcion,
          descripcion: `${tipoPago} - ${hora}`,
          precio: parseFloat(g.monto),
          textoBusqueda: (g.descripcion ?? '').toLowerCase()
        };
      });

    if (this.mensaje === 'actualizar ingresos' || !this.mensaje) {
      this.mostrarIngresos();
    }

    if (this.mensaje === 'actualizar gastos') {
      this.mostrarEgresos();
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
        item.descripcion?.toLowerCase().includes(texto)
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

  async seleccionarFechaDesdeCalendario(event: any) {
    const fechaSeleccionada = new Date(event.detail.value);
    const dia = fechaSeleccionada.getDate();
    const mes = fechaSeleccionada.toLocaleString('es-BO', { month: 'long' });
    this.selectedDay = `${dia} de ${mes}`;

    const inicioDelDia = new Date(fechaSeleccionada.setHours(0, 0, 0, 0)).toISOString();
    const finDelDia = new Date(fechaSeleccionada.setHours(23, 59, 59, 999)).toISOString();
    await this.cargarBalance(inicioDelDia, finDelDia);
  }

  async irAVentaProductos() {
    await this.popoverCtrl.dismiss().catch(() => {});
    this.router.navigate(['/nueva-venta']);
  }

  async irAVentaLibre() {
    await this.popoverCtrl.dismiss().catch(() => {});
    this.router.navigate(['/venta-libre']);
  }
}