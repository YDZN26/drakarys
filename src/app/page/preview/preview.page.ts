import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, AlertController } from '@ionic/angular';
import { SupabaseService } from '../../supabase.service';

@Component({
  selector: 'app-preview',
  templateUrl: './preview.page.html',
  styleUrls: ['./preview.page.scss'],
})
export class PreviewPage implements OnInit {
  venta: any = {
    productos: [],
    metodoPago: '',
    totalVenta: 0,
    fechaVenta: ''
  };
  
  clientes: any[] = [];
  clienteSeleccionado: any = null;

  constructor(
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private alertController: AlertController,
    private supabaseService: SupabaseService
  ) {}

  ngOnInit() {
    // se reciben los datos de la venta desde queryParams
    this.route.queryParams.subscribe(params => {
      if (params['metodoPago']) {
        this.venta.metodoPago = params['metodoPago'];
      }
      if (params['productos']) {
        this.venta.productos = JSON.parse(params['productos']);
      }
      if (params['totalVenta']) {
        this.venta.totalVenta = params['totalVenta'];
      }
      const now = new Date();
      this.venta.fechaVenta = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
    });
    // Cargar la lista de clientes desde Supabase
    this.cargarClientes();
  }

  async cargarClientes() {
    try {
      this.clientes = await this.supabaseService.obtenerClientes();
      console.log('Clientes obtenidos:', this.clientes);
    } catch (error) {
      console.error('Error al cargar clientes:', error);
    }
  }

  onClienteOk() {
    console.log('Cliente seleccionado:', this.clienteSeleccionado);
  }

    async confirmarVenta() {
      if (!this.clienteSeleccionado) {
        const alert = await this.alertController.create({
          header: 'Cliente requerido',
          message: 'Por favor, seleccione un cliente para confirmar la venta.',
          buttons: ['OK']
          });
      await alert.present();
      return;
      }

    try {
      const tipoPagoId = this.obtenerTipoPagoId(this.venta.metodoPago);

      const resultado = await this.supabaseService.registrarVentaCompleta(
        this.venta.productos,
        tipoPagoId,
        this.clienteSeleccionado.cliente_id,
      );

      if (!resultado){
        console.log('Error al registrar venta');
        return;
      }

      console.log ('Venta registrada con exito', resultado);

      this.navCtrl.navigateForward(['/recibo', resultado.venta.venta_id]);
        
      }catch (error) {
        console.log('Error al registrar venta', error);
        }
    }

    obtenerTipoPagoId(metodoPago: string): number {
      const tiposPago = {
        'Cuota': 1,
        'Efectivo': 2,
        'Transferencia Bancaria': 3,
        'Tarjeta': 4
      };

      return tiposPago[metodoPago as keyof typeof tiposPago]|| 0;
    }
}

