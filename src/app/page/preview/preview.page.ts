import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, AlertController, AlertInput } from '@ionic/angular';
import { SupabaseService } from '../../supabase.service';
import { MensajeService } from 'src/app/mensaje.service';

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
    private alertCtrl: AlertController,
    private mensajeService: MensajeService,
    private supabase: SupabaseService
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

  private async cargarClientes() {
    this.clientes = (await this.supabase.obtenerClientes()) || [];
  }

  /** Abre un Alert con radios + Nuevo + Cancel + OK */
  async openClienteAlert() {
    // 1) Construyo los inputs
    const inputs: AlertInput[] = this.clientes.map(c => ({
      name: 'cliente',
      type: 'radio',
      label: `${c.nombre} ${c.apellido}`,
      value: c,
      checked: this.clienteSeleccionado?.cliente_id === c.cliente_id
    }));

    // 2) Creo el Alert y guardo la instancia en `alert`
    const alert = await this.alertCtrl.create({
      header: 'Cliente',
      inputs,
      buttons: [
        {
          text: 'Nuevo',
          handler: () => {
            // Cierro este selector
            alert.dismiss();
            // Abro el formulario para crear cliente
            this.promptNewClient();
            return false; 
          }
        },
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'OK',
          handler: (sel: any) => {
            this.clienteSeleccionado = sel;
          }
        }
      ]
    });

    // 3) Muestro el Alert
    await alert.present();
  }

  /** Prompt para crear un cliente nuevo */
  async promptNewClient() {
    const prompt = await this.alertCtrl.create({
      header: 'Nuevo Cliente',
      inputs: [
        { name: 'nombre',   placeholder: 'Nombre',   type: 'text' },
        { name: 'apellido', placeholder: 'Apellido', type: 'text' },
        { name: 'telefono', placeholder: 'Teléfono', type: 'tel'  }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Crear',
          handler: async (data: any) => {
            // 0) Evitar duplicados por teléfono
            if (this.clientes.some(c => c.telefono === data.telefono)) {
              const e = await this.alertCtrl.create({
                header: 'Error',
                message: 'Ya existe un cliente con ese número.',
                buttons: ['OK']
              });
              await e.present();
              return false;
            }
            // 1) Validar campos
            if (!data.nombre || !data.apellido || !data.telefono) {
              const e = await this.alertCtrl.create({
                header: 'Error',
                message: 'Completa todos los campos.',
                buttons: ['OK']
              });
              await e.present();
              return false;
            }
            // 2) Insertar en Supabase
            const nuevo = await this.supabase.agregarCliente(data);
            if (!nuevo) {
              const e = await this.alertCtrl.create({
                header: 'Error',
                message: 'No se pudo crear el cliente.',
                buttons: ['OK']
              });
              await e.present();
              return false;
            }
            // 3) Actualizar lista y selección
            this.clientes.unshift(nuevo);
            this.clienteSeleccionado = nuevo;
            // 4) Emitir para balance (si lo necesitas)
            this.mensajeService.enviarMensaje('actualizar ingresos');
            return true; // cierra el prompt de creación
          }
        }
      ]
    });
    await prompt.present();
  }

  /** Confirma la venta */
  async confirmarVenta() {
    if (!this.clienteSeleccionado) {
      const a = await this.alertCtrl.create({
        header: 'Cliente requerido',
        message: 'Selecciona un cliente antes de continuar.',
        buttons: ['OK']
      });
      await a.present();
      return;
    }
    const usuarioId = parseInt(localStorage.getItem('usuario_id')||'',10);
    if (!usuarioId) { console.error('No hay usuario_id'); return; }

    try {
      const tipos: Record<string,number> = {
        'Cuota':1,'Efectivo':2,'Transferencia Bancaria':3,'Tarjeta':4
      };
      const tipoPagoId = tipos[this.venta.metodoPago] || 0;
      const res = await this.supabase.registrarVentaCompleta(
        this.venta.productos, tipoPagoId,
        this.clienteSeleccionado.cliente_id, usuarioId
      );
      if (!res) { console.error('Error al registrar venta'); return; }
      this.navCtrl.navigateForward(['/recibo', res.venta.venta_id]);
    } catch (e) {
      console.error('Error al confirmar venta', e);
    }
  }
}
