import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { IonModal, NavController } from '@ionic/angular';
import { SupabaseService } from '../../supabase.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MensajeService } from 'src/app/mensaje.service';



@Component({
  selector: 'app-balance',
  templateUrl: './balance.page.html',
  styleUrls: ['./balance.page.scss'],
})
export class BalancePage implements AfterViewInit {

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

 
  constructor(
    private navCtrl: NavController,
    private supabaseService: SupabaseService,
    private router: Router,
    private mensajeService: MensajeService
  ) {}

  ngAfterViewInit() {
    setTimeout(() => {
      this.presentingElement = document.querySelector('ion-content');
    }, 100); // da tiempo a rende
  }
  
  async ngOnInit() {
    const nombreGuardado = localStorage.getItem('usuario');
    if (nombreGuardado) {
      this.nombreUsuario = this.capitalize(nombreGuardado);
    }
    // Al iniciar la página, carga el balance del día actual
    this.generarDiasDelMesActual();
    
    const fecha = new Date();
    const day = fecha.getDate();
    const mes = fecha.toLocaleString('es-BO', { month: 'long' });

    this.selectedDay = `${day} de ${mes}`;
    this.onDaySelected(this.selectedDay);

    this.mensajeSub = this.mensajeService.mensaje$.subscribe((mensaje: string) => {
      if (mensaje) {
        console.log('Mensaje recibido:', mensaje);
        this.mensaje = mensaje; 
        if (mensaje === 'actualizar ingresos'|| mensaje === 'actualizar gastos')  {
          this.onDaySelected(this.selectedDay);
        }
      }
      
    });
  }

  capitalize(nombre: string): string {
    return nombre.charAt(0).toUpperCase() + nombre.slice(1);
  }

  cerrarSesion() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  generarDiasDelMesActual() {
    const fecha = new Date();
    const mes = fecha.toLocaleString('es-BO', { month: 'long' }); // Ej: 'Abril'
    const year = fecha.getFullYear();
    const monthIndex = fecha.getMonth();
    const today = fecha.getDate();
    this.days = Array.from({ length: today }, (_, i) => `${i + 1} de ${mes}`);
  }

  async onDaySelected(dayString: string | null) {
    if (!dayString) return;
    this.selectedDay = dayString;
  
    // Extraer número de día y mes
    const partes = dayString.split(' ');
    if (partes.length < 3) {
      console.error('Formato de fecha inválido:', dayString);
      return;
    }
    
    const dayStr = partes[0];
    const mesStr = partes[2];
    
    const dia = parseInt(dayStr);
  
    const meses: { [key: string]: number } = {
      enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
      julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
    };
  
    const mes = meses[mesStr.toLowerCase()];
    const year = new Date().getFullYear();
  
    if (isNaN(dia) || mes === undefined) {
      console.error('Fecha inválida:', dayString);
      return;
    }
  
    const fechaSeleccionada = new Date(year, mes, dia);
  
    const inicioDelDia = new Date(fechaSeleccionada.setHours(0, 0, 0, 0)).toISOString();
    const finDelDia = new Date(fechaSeleccionada.setHours(23, 59, 59, 999)).toISOString();
  
    await this.cargarBalance(inicioDelDia, finDelDia);
  }
  
  async cargarBalance(fechaInicio: string, fechaFin: string) {
    const detalles = await this.supabaseService.obtenerDetallesVentasPorFecha(fechaInicio, fechaFin);
    console.log('Detalles:', detalles);
  
    // Agrupar ingresos por venta_id
    const agrupadas: { [key: number]: any[] } = {};
      for (const d of detalles) {
        if (!d.venta) continue; // Evita datos huérfanos
        const ventaId = d.venta_id;
        if (!agrupadas[ventaId]) agrupadas[ventaId] = [];
        agrupadas[ventaId].push(d);
    }
  

    const agrupadasArray = Object.values(agrupadas);
    agrupadasArray.sort((a, b) => {
      const tA = new Date(a[0].venta.fecha + 'Z').getTime();
      const tB = new Date(b[0].venta.fecha + 'Z').getTime();
      return tB - tA;  // la última venta queda al pincipio
    });
  
    this.ingresos = agrupadasArray.map((items: any[]) => {
      const venta = items[0].venta;
      const tipoPago = venta?.tipo_de_pago?.nombre ?? '-';
      const fechaObj = venta?.fecha
        ? new Date(venta.fecha + 'Z')
        : new Date();
      const hora = fechaObj.toLocaleTimeString('es-BO', { timeZone: 'America/La_Paz' });
      const fechaLocal = fechaObj.toLocaleDateString('es-BO', { timeZone: 'America/La_Paz' });
      const descripcion = `${tipoPago} - ${hora}`;
      const productos = items.map(i => `${i.cantidad} ${i.producto?.nombre}`);
      const total = items.reduce((sum, i) => sum + parseFloat(i.subtotal), 0);

      return {
        nombre: productos.length > 1 ? productos.slice(0, 1).join(', ') + ', ...' : productos.join(', '),
        descripcion,
        precio: total,
        fechaCompleta: `${fechaLocal} ${hora}`,
        productosOriginales: items.map(i => ({
          descripcion: i.producto?.nombre,
          cantidad: i.cantidad
        })),
        // Nuevo campo para búsqueda
        textoBusqueda: productos.join(', ')
      };
    });
  
    const gastos = await this.supabaseService.obtenerGastos(fechaInicio, fechaFin);
    const gastosOrdenados = gastos.sort((a, b) => {
      const tA = new Date(a.fecha + 'Z').getTime();
      const tB = new Date(b.fecha + 'Z').getTime();
      return tB - tA;
    });
    
    this.egresos = gastos.map((g: any) => ({
      nombre: 'Gasto',
      descripcion: g.descripcion,
      precio: parseFloat(g.monto),
    }));

    if (this.mensaje === 'actualizar ingresos'){
      this.mostrarIngresos();
    }
    if (this.mensaje === 'actualizar gastos'){
      this.mostrarEgresos();
    } 
    if (!this.mensaje) {
      this.mostrarIngresos();
    }
  
    // this.mostrarIngresos(); // Por defecto mostrar ingresos
  }

  mostrarCampoBusqueda = false;
textoBusqueda: string = '';

filtrarItems() {
  const texto = this.textoBusqueda.toLowerCase().trim();

  if (!texto) {
    this.filteredItems = this.vistaActual === 'ingresos' ? this.ingresos : this.egresos;
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


vistaActual: 'ingresos' | 'egresos' = 'ingresos';
  
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
    return this.totalIngresos - this.totalEgresos;
  }

  goToNuevaVentaPage() {
    this.navCtrl.navigateForward('/nueva-venta');
  }

  goToNuevoGastoPage() {
    this.navCtrl.navigateForward('/nuevo-gasto');
  }
  verRecibo(item: any) {
    // Asegura pasar la fecha y hora real
    const venta = {
      ...item,
      descripcion: `${item.descripcion}`, // ya contiene la hora
      fechaCompleta: item.fechaCompleta || new Date().toISOString()
    };
  
    this.router.navigate(['/recibo'], {
      state: {
        venta
      }
    });
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
  
}
