import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NuevaVentaPage } from './nueva-venta.page';

describe('NuevaVentaPage', () => {
  let component: NuevaVentaPage;
  let fixture: ComponentFixture<NuevaVentaPage>;

  beforeEach(waitForAsync(() => {
    fixture = TestBed.createComponent(NuevaVentaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
