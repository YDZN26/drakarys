import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';
import { SupabaseService } from '../../supabase.service';
import { Location } from '@angular/common';

@Component({
  selector: 'app-recibo',
  templateUrl: './recibo.page.html',
  styleUrls: ['./recibo.page.scss'],
})
export class ReciboPage implements OnInit {
  recibo: any = {
    venta_id: 0,
    fechaVenta:'',
    productos: [],
    totalVenta: 0,
    metodoPago: '',
    cliente: {},
    detalles: []
  };

  tiposPago: { [key: number]: string } = {
    1: 'Cuota',
    2: 'Efectivo',
    3: 'Transferencia Bancaria',
    4: 'Tarjeta'
  };

  constructor( private route: ActivatedRoute,
    private navCtrl: NavController,
    private supabaseService: SupabaseService,
    private location: Location,
  ) {}

  ngOnInit() {
    const ventaParam = this.route.snapshot.paramMap.get('ventaId');
    if (ventaParam) {
      const ventaId = Number(ventaParam);
      // this.location.replaceState(`/recibo/${ventaId}`);
      this.cargarVenta(ventaId);
    } else {
      console.error("No se recibió un ventaId en la URL.");
    }
  }

  async cargarVenta(ventaId: number) {
    try {
      const venta = await this.supabaseService.obtenerVentaPorId(ventaId);
      // Obtener los detalles de la venta (productos)
      const detalles = await this.supabaseService.obtenerVentaDetalles(ventaId);
      
      if (venta) {

        const fecha = new Date(venta.fecha + 'Z');

        const fechaLocal = fecha.toLocaleDateString('es-BO');
        const horaLocal  = fecha.toLocaleTimeString('es-BO')

        this.recibo = {
          venta_id: venta.venta_id,
          fechaVenta: `${fechaLocal} ${horaLocal}`,
          totalVenta: venta.total,
          // Convierte el ID de tipo de pago a su nombre legible usando el mapeo:
          metodoPago: this.tiposPago[venta.tipo_pago_id] || venta.tipo_pago_id,
          cliente: venta.cliente_id, // Si deseas más datos del cliente, deberás hacer otra consulta.
          productos: detalles || []
        };
        console.log('Recibo cargado:', this.recibo);
      } else {
        console.error("No se encontró la venta con ID:", ventaId);
      }
    } catch (error) {
      console.error("Error al cargar la venta:", error);
    }
  }

    irABalance(){
      this.navCtrl.navigateBack('/tab-inicial/balance');
    }
}