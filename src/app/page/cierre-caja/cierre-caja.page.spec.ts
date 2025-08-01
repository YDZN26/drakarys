import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CierreCajaPage } from './cierre-caja.page';

describe('CierreCajaPage', () => {
  let component: CierreCajaPage;
  let fixture: ComponentFixture<CierreCajaPage>;

  beforeEach(async(() => {
    fixture = TestBed.createComponent(CierreCajaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
