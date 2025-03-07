import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { SupabaseService } from '../../supabase.service';

@Component({
  selector: 'app-inventario',
  templateUrl: './inventario.page.html',
  styleUrls: ['./inventario.page.scss'],
})
export class InventarioPage implements OnInit {
  productos: any[] = [];

  constructor(
    private navCtrl: NavController,
    private supabaseService: SupabaseService
  ) { }

  ngOnInit() {
    this.cargarProductos();
  }

  ionViewWillEnter() {
    this.cargarProductos();
  }

  async cargarProductos() {
    try {
      this.productos = await this.supabaseService.obtenerProductos();
      console.log('Productos obtenidos:', this.productos);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  }
  agregarNuevoProducto() {
    this.navCtrl.navigateForward('/agregar-producto');
  }

  verDetalleProducto(producto: any) {
    console.log('Detalle del producto:', producto);
    this.navCtrl.navigateForward(`/agregar-producto/${producto.producto_id}`);
  }
}

