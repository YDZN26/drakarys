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
  categorias: any[] = [];
  categoriaSeleccionada: number | null = null;
  textoBusqueda: string = '';
  mensaje: string = '';
  private mensajeSub!: Subscription

  constructor(
    private navCtrl: NavController,
    private supabaseService: SupabaseService,
    private mensajeService: MensajeService,
    
  ) { }

  ngOnInit() {
    this.cargarProductos();
    this.cargarCategorias();
    this.mensajeSub = this.mensajeService.mensaje$.subscribe((mensaje: string) => {
      if (mensaje) {
        console.log('Mensaje recibido:', mensaje);
        this.mensaje = mensaje; 
        this.cargarProductos();
      }
    });
  }

  async cargarCategorias() {
    try {
      this.categorias = await this.supabaseService.obtenerCategorias();
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  }

  async cargarProductos(categoriaId: number | null = null) {
    try {
      const todos = await this.supabaseService.obtenerProductos();
      this.productos = categoriaId
        ? todos.filter(p => p.categoria_id === categoriaId)
        : todos;
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  }

  filtrarPorCategoria(categoriaId: number | null) {
    this.categoriaSeleccionada = categoriaId;
    this.cargarProductos(categoriaId);
  }

  agregarNuevoProducto() {
    this.navCtrl.navigateForward('/agregar-producto');
  }

  verDetalleProducto(producto: any) {
    console.log('Detalle del producto:', producto);
    this.navCtrl.navigateForward(`/agregar-producto/${producto.producto_id}`);
  }

  calcularValorTotal(): number {
    return this.productos.reduce((total, p) => {
      const precio = p.precio || 0;
      const stock = p.stock || 0;
      return total + precio * stock;
    }, 0);
  }
  

  
}

