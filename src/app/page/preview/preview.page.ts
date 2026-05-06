import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, AlertController } from '@ionic/angular';
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
  clientesFiltrados: any[] = [];
  clienteSeleccionado: any = null;

  textoBusquedaCliente: string = '';
  modalClientesAbierto: boolean = false;

  modoEditar: boolean = false;
  ventaIdEditar: number = 0;

  constructor(
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private alertCtrl: AlertController,
    private mensajeService: MensajeService,
    private supabase: SupabaseService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['modo'] === 'editar') {
        this.modoEditar = true;
      }

      if (params['ventaId']) {
        this.ventaIdEditar = Number(params['ventaId']);
      }

      if (params['metodoPago']) {
        this.venta.metodoPago = params['metodoPago'];
      }

      if (params['productos']) {
        this.venta.productos = JSON.parse(params['productos']);
      }

      if (params['totalVenta']) {
        this.venta.totalVenta = Number(params['totalVenta']);
      }

      if (params['cliente']) {
        this.clienteSeleccionado = JSON.parse(params['cliente']);
      }

      this.actualizarTotalVenta();

      const now = new Date();
      this.venta.fechaVenta = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
    });

    this.cargarClientes();
  }

  actualizarTotalVenta() {
    this.venta.totalVenta = this.venta.productos.reduce((total: number, producto: any) => {
      const cantidad = Number(producto.cantidadSeleccionada || 0);
      const precio = Number(producto.precio || 0);
      return total + (cantidad * precio);
    }, 0);
  }

  eliminarProductoSeleccionado(index: number) {
    this.venta.productos.splice(index, 1);
    this.actualizarTotalVenta();
  }

  volverANuevaVenta() {
    this.actualizarTotalVenta();

    this.navCtrl.navigateBack('/nueva-venta', {
      queryParams: {
        productos: JSON.stringify(this.venta.productos),
        totalVenta: this.venta.totalVenta,
        modo: this.modoEditar ? 'editar' : 'crear',
        ventaId: this.ventaIdEditar
      }
    });
  }

  private async cargarClientes() {
    this.clientes = (await this.supabase.obtenerClientes()) || [];
    this.clientesFiltrados = [...this.clientes];

    this.seleccionarClientePorDefecto();
  }

  seleccionarClientePorDefecto() {
    if (this.clienteSeleccionado) {
      return;
    }

    const clienteVarios = this.clientes.find((cliente: any) => {
      return Number(cliente.cliente_id) === 1;
    });

    if (clienteVarios) {
      this.clienteSeleccionado = clienteVarios;
    }
  }

  abrirModalClientes() {
    this.textoBusquedaCliente = '';
    this.clientesFiltrados = [...this.clientes];
    this.modalClientesAbierto = true;
  }

  cerrarModalClientes() {
    this.modalClientesAbierto = false;
  }

  buscarClientes(event: any) {
    this.textoBusquedaCliente = (event?.target?.value || '').toString();
    this.aplicarFiltroClientes();
  }

  aplicarFiltroClientes() {
    const texto = this.normalizarTexto(this.textoBusquedaCliente);

    if (!texto) {
      this.clientesFiltrados = [...this.clientes];
      return;
    }

    const palabrasBusqueda = texto
      .split(' ')
      .filter((palabra: string) => palabra.trim() !== '');

    this.clientesFiltrados = this.clientes.filter((cliente: any) => {
      const textoCliente = this.normalizarTexto(`
        ${cliente.nombre || ''}
        ${cliente.apellido || ''}
        ${cliente.telefono || ''}
      `);

      return palabrasBusqueda.every((palabra: string) => {
        return textoCliente.includes(palabra);
      });
    });
  }

  normalizarTexto(texto: any): string {
    return (texto || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  seleccionarCliente(cliente: any) {
    this.clienteSeleccionado = cliente;
    this.cerrarModalClientes();
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
            this.aplicarFiltroClientes();
            this.clienteSeleccionado = nuevo;
            this.modalClientesAbierto = false;

            this.mensajeService.enviarMensaje('actualizar ingresos');
            return true;
          }
        }
      ]
    });

    await prompt.present();
  }

  async irAMetodoPago() {
    this.actualizarTotalVenta();

    if (this.venta.productos.length === 0) {
      const a = await this.alertCtrl.create({
        header: 'Sin productos',
        message: 'Debes tener al menos un producto seleccionado para continuar.',
        buttons: ['OK']
      });
      await a.present();
      return;
    }

    if (!this.clienteSeleccionado) {
      const a = await this.alertCtrl.create({
        header: 'Cliente requerido',
        message: 'Selecciona un cliente antes de continuar.',
        buttons: ['OK']
      });
      await a.present();
      return;
    }

    if (Number(this.venta.totalVenta) <= 0) {
      const a = await this.alertCtrl.create({
        header: 'Total inválido',
        message: 'El total de la venta debe ser mayor a 0.',
        buttons: ['OK']
      });
      await a.present();
      return;
    }

    this.navCtrl.navigateForward('/metodo-pago', {
      queryParams: {
        productos: JSON.stringify(this.venta.productos),
        totalVenta: this.venta.totalVenta,
        fechaVenta: this.venta.fechaVenta,
        cliente: JSON.stringify(this.clienteSeleccionado),
        modo: this.modoEditar ? 'editar' : 'crear',
        ventaId: this.ventaIdEditar
      }
    });
  }
}
