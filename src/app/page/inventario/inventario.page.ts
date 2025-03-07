import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { SupabaseService } from '../../supabase.service';
import { MensajeService } from 'src/app/mensaje.service';
import { Subscription } from 'rxjs';


@Component({
  selector: 'app-inventario',
  templateUrl: './inventario.page.html',
  styleUrls: ['./inventario.page.scss'],
})
export class InventarioPage implements OnInit {
  productos: any[] = [];
  mensaje: string = '';
  private mensajeSub!: Subscription

  constructor(
    private navCtrl: NavController,
    private supabaseService: SupabaseService,
    private mensajeService: MensajeService,
    
  ) { }

  ngOnInit() {
    this.cargarProductos();
    this.mensajeSub = this.mensajeService.mensaje$.subscribe((mensaje: string) => {
      if (mensaje) {
        console.log('Mensaje recibido:', mensaje);
        this.mensaje = mensaje; 
        this.cargarProductos();
      }
    });
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

