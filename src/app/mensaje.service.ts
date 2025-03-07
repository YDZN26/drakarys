import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MensajeService {
  private mensajeSource = new BehaviorSubject<string>(''); // Estado inicial vacío
  mensaje$ = this.mensajeSource.asObservable(); // Observable para escuchar cambios

  enviarMensaje(mensaje: string) {
    this.mensajeSource.next(mensaje); // Enviar mensaje
  }
}
