import { Component, OnInit } from '@angular/core';

interface Cliente {
  id: number;
  deuda: number;
  montoPagado: number;
  montoFaltante: number;
}

@Component({
  selector: 'app-deudas',
  templateUrl: './deudas.page.html',
  styleUrls: ['./deudas.page.scss'],
})
export class DeudasPage implements OnInit {
  selectedCliente: number | null = null;
  pago: number = 0;
  clientes: Cliente[] = [
    { id: 1, deuda: 10, montoPagado: 5, montoFaltante: 5 },
    { id: 2, deuda: 45, montoPagado: 20, montoFaltante: 25 },
    { id: 3, deuda: 30, montoPagado: 10, montoFaltante: 20 },
    { id: 4, deuda: 25, montoPagado: 5, montoFaltante: 20 },
    { id: 5, deuda: 50, montoPagado: 20, montoFaltante: 30 }
  ];

  constructor() {}

  ngOnInit() {}

  toggleMenu(clienteId: number) {
    this.selectedCliente = this.selectedCliente === clienteId ? null : clienteId;
  }

  pagar() {
    if (this.selectedCliente && this.pago > 0) {
      console.log(`Cliente ${this.selectedCliente} pagó ${this.pago} Bs.`);
      const cliente = this.clientes.find(c => c.id === this.selectedCliente);
      if (cliente) {
        cliente.montoPagado += this.pago;
        cliente.montoFaltante -= this.pago;
      }
      this.pago = 0; // Reiniciar el valor del input
      this.selectedCliente = null; // Cerrar el menú después de pagar
    }
  }
}
