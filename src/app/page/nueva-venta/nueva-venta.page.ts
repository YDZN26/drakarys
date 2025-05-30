import { Component, OnInit, NgZone } from '@angular/core';
import { ActionSheetController, NavController, ModalController } from '@ionic/angular';
import { CuotasModalPage } from '../cuotas-modal/cuotas-modal.page'; 
import { SupabaseService } from '../../supabase.service';


@Component({
  selector: 'app-nueva-venta',
  templateUrl: './nueva-venta.page.html',
  styleUrls: ['./nueva-venta.page.scss'],
})

export class NuevaVentaPage implements OnInit {

  productos: any[] = [];
  productosFiltrados: any[] = [];
  tipo_de_pago: any[] = [];
  totalProductosSeleccionados: number = 0;
  valorTotalSeleccionado: number = 0;

  constructor (
    private actionSheetCtrl: ActionSheetController,
    private navCtrl: NavController,
    private modalCtrl: ModalController,
    private supabaseService: SupabaseService,
    
    private zone: NgZone
  ) {}

  productosCargando: boolean = false; // para evitar duplicados
  tiposDePagoCargando: boolean = false;

  ngOnInit() {
    setTimeout(() => {
      this.cargarProductos();
    }, 0);
  
    setTimeout(() => {
      this.cargarTiposDePago();
    }, 100); // Delay de 100ms para evitar conflictos simultáneos
  }

  async cargarProductos() {
    try {
      this.productos = await this.supabaseService.obtenerProductos();
      this.productosFiltrados = this.productos.map((producto) => ({
        ...producto,
        cantidadSeleccionada: 0, // Inicializa seleccionados en 0
        disponibles: typeof producto.stock === 'number' ? producto.stock : 0,
        precio: typeof producto.precio === 'number' ? producto.precio : 0,
      }));
      console.log(this.productosFiltrados);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  }

  async cargarTiposDePago() {
    try {
      this.tipo_de_pago = await this.supabaseService.obtenerTiposDePago();
    } catch (error) {
      console.error('Error al cargar tipos de pago:', error);
    }
  }

  // Buscar productos por nombre o código
  buscarProductos(event: any) {
    const searchTerm = event.target.value.toLowerCase();
  if (!searchTerm) {
    this.cargarProductos();
  } else {
    this.productosFiltrados = this.productosFiltrados.filter(function(producto) {
      const nombre = producto.nombre.toLowerCase();
      const codigoBarras = producto.codigo_barras ? producto.codigo_barras.toString().toLowerCase() : '';
      return nombre.includes(searchTerm) || codigoBarras.includes(searchTerm);
    });
  }
  }

  aumentarCantidad(producto: any) {
    const index = this.productos.findIndex(p => p.producto_id === producto.producto_id);
    if (producto.cantidadSeleccionada < producto.disponibles) {
      producto.cantidadSeleccionada++;
      if (index !== -1) {
        this.productos[index].cantidadSeleccionada = producto.cantidadSeleccionada;
      }
      this.actualizarTotales();
    }
  }
  
  disminuirCantidad(producto: any) {
    const index = this.productos.findIndex(p => p.producto_id === producto.producto_id);
    if (producto.cantidadSeleccionada > 0) {
      producto.cantidadSeleccionada--;
      if (index !== -1) {
        this.productos[index].cantidadSeleccionada = producto.cantidadSeleccionada;
      }
      this.actualizarTotales();
    }
  }

  actualizarTotales() {
    this.zone.run(() => {
      this.totalProductosSeleccionados = this.productos.reduce((total, producto) => {
        const seleccionados = producto.cantidadSeleccionada || 0;
        return total + seleccionados;
      }, 0);
  
      this.valorTotalSeleccionado = this.productos.reduce((total, producto) => {
        const seleccionados = producto.cantidadSeleccionada || 0;
        const precio = producto.precio || 0;
        return total + seleccionados * precio;
      }, 0);
  
      console.log('Total productos seleccionados:', this.totalProductosSeleccionados);
      console.log('Valor total:', this.valorTotalSeleccionado);
    });
  }
  

  async agregarVenta() {
    const productosSeleccionados = this.productos.filter(producto => producto.cantidadSeleccionada > 0); // Filtrar productos seleccionados
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Selecciona el método de pago',
      buttons: [
        {
          text: 'Efectivo',
          handler: () => {
            this.goToCarrito('Efectivo', productosSeleccionados);
          }
        },
        {
          text: 'Transferencia Bancaria',
          handler: () => {
            this.goToCarrito('Transferencia Bancaria', productosSeleccionados);
          }
        },
        {
          text: 'Tarjeta',
          handler: () => {
            this.goToCarrito('Tarjeta', productosSeleccionados);
          }
        },
        {
          text: 'Cuotas',
          handler: () => {
            this.presentCuotasModal();
          }
        },
        {
          text: 'Cancelar',
          role: 'cancel'
        }
      ]
    });
    console.log("Aqui llamare a la funcion que muestra el carrito");
    await actionSheet.present();
  }

  async presentCuotasModal() {
    const modal = await this.modalCtrl.create({
      component: CuotasModalPage, 
      componentProps: { 
      }
    });

    modal.onDidDismiss().then((data) => {
      if (data.data && data.data.confirmed) {
        const productosSeleccionados = this.productos.filter(producto => producto.cantidadSeleccionada > 0);
        this.goToCarrito('Cuotas', productosSeleccionados, data.data); 
      }
    });

    await modal.present();
  }

  goToCarrito(metodoPago: string, productosSeleccionados: any[], cuotaData?: any) {
    this.navCtrl.navigateForward('/preview', {
      queryParams: { 
        metodoPago: metodoPago,
        productos: JSON.stringify(productosSeleccionados), // Enviar productos seleccionados como JSON
        totalVenta: this.valorTotalSeleccionado,  // Enviar el total de la venta
        ...cuotaData // Enviar datos de cuotas si existen
      }
    });
  }
}
