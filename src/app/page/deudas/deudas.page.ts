import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

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

  // ✅ (AUMENTADO) Para que coincida con tu HTML: [(ngModel)]="tipoPagoId"
  tipoPagoId: number = 0;

  // ✅ (AUMENTADO) Para que coincida con tu HTML: *ngFor="let t of tiposDePago"
  // Por ahora está vacío para que compile; luego lo llenamos desde Supabase si quieres.
  tiposDePago: any[] = [];

  clientes: Cliente[] = [
    { id: 1, deuda: 10, montoPagado: 5, montoFaltante: 5 },
    { id: 2, deuda: 45, montoPagado: 20, montoFaltante: 25 },
    { id: 3, deuda: 30, montoPagado: 10, montoFaltante: 20 },
    { id: 4, deuda: 25, montoPagado: 5, montoFaltante: 20 },
    { id: 5, deuda: 50, montoPagado: 20, montoFaltante: 30 }
  ];

  constructor(private router: Router) {}

  ngOnInit() {}

  toggleMenu(clienteId: number) {
    this.selectedCliente = this.selectedCliente === clienteId ? null : clienteId;
  }

  pagar(clienteId: number) {
    if (!clienteId || this.pago <= 0) return;

    const cliente = this.clientes.find(c => c.id === clienteId);
    if (!cliente) return;

    console.log(`Cliente ${clienteId} pagó ${this.pago} Bs. con tipoPagoId: ${this.tipoPagoId}`);

    cliente.montoPagado += this.pago;
    cliente.montoFaltante -= this.pago;

    if (cliente.montoFaltante < 0) {
      cliente.montoFaltante = 0;
    }

    this.pago = 0;
    this.tipoPagoId = 0;
    this.selectedCliente = null;
  }

  crearDeuda() {
    console.log('Botón Crear Deuda presionado');
    this.router.navigate(['/crear-deuda']);
  }
}
