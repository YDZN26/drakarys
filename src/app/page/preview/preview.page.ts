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

    this.cargarClientes();
  }

  private async cargarClientes() {
    this.clientes = (await this.supabase.obtenerClientes()) || [];
  }

  async openClienteAlert() {
    const inputs: AlertInput[] = this.clientes.map(c => ({
      name: 'cliente',
      type: 'radio',
      label: `${c.nombre} ${c.apellido}`,
      value: c,
      checked: this.clienteSeleccionado?.cliente_id === c.cliente_id
    }));

    const alert = await this.alertCtrl.create({
      header: 'Cliente',
      inputs,
      buttons: [
        {
          text: 'Nuevo',
          handler: () => {
            alert.dismiss();
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

    await alert.present();
  }

  async promptNewClient() {
    const prompt = await this.alertCtrl.create({
      header: 'Nuevo Cliente',
      inputs: [
        { name: 'nombre', placeholder: 'Nombre', type: 'text' },
        { name: 'apellido', placeholder: 'Apellido', type: 'text' },
        { name: 'telefono', placeholder: 'Teléfono', type: 'tel' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Crear',
          handler: async (data: any) => {
            if (this.clientes.some(c => c.telefono === data.telefono)) {
              const e = await this.alertCtrl.create({
                header: 'Error',
                message: 'Ya existe un cliente con ese número.',
                buttons: ['OK']
              });
              await e.present();
              return false;
            }

            if (!data.nombre || !data.apellido || !data.telefono) {
              const e = await this.alertCtrl.create({
                header: 'Error',
                message: 'Completa todos los campos.',
                buttons: ['OK']
              });
              await e.present();
              return false;
            }

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

            this.clientes.unshift(nuevo);
            this.clienteSeleccionado = nuevo;

            this.mensajeService.enviarMensaje('actualizar ingresos');
            return true;
          }
        }
      ]
    });

    await prompt.present();
  }

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

    const usuarioId = parseInt(localStorage.getItem('usuario_id') || '', 10);
    if (!usuarioId) {
      console.error('No hay usuario_id');
      return;
    }

    const tipos: Record<string, number> = {
      'Cuotas': 1,
      'Efectivo': 2,
      'Transferencia Bancaria': 3,
      'Tarjeta': 4
    };

    const tipoPagoId = tipos[this.venta.metodoPago] || 0;
    if (!tipoPagoId) {
      const a = await this.alertCtrl.create({
        header: 'Método de pago inválido',
        message: `No se reconoció el método de pago: ${this.venta.metodoPago}`,
        buttons: ['OK']
      });
      await a.present();
      return;
    }

    try {
      const res = await this.supabase.registrarVentaCompleta(
        this.venta.productos,
        tipoPagoId,
        this.clienteSeleccionado.cliente_id,
        usuarioId
      );

      if (!res) {
        console.error('Error al registrar venta');
        return;
      }

      this.mensajeService.enviarMensaje('actualizar inventario');
      this.mensajeService.enviarMensaje('actualizar ingresos');

      this.navCtrl.navigateForward(['/recibo', res.ingreso.ingreso_id]);
    } catch (e) {
      console.error('Error al confirmar venta', e);
    }
  }
}