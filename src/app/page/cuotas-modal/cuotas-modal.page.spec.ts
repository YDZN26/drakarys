import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CuotasModalPage } from './cuotas-modal.page';

describe('CuotasModalPage', () => {
  let component: CuotasModalPage;
  let fixture: ComponentFixture<CuotasModalPage>;

  beforeEach(async(() => {
    fixture = TestBed.createComponent(CuotasModalPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
