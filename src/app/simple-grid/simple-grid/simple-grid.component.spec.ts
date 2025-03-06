import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SimpleGridComponent } from './simple-grid.component';

describe('SimpleGridComponent', () => {
  let component: SimpleGridComponent;
  let fixture: ComponentFixture<SimpleGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimpleGridComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SimpleGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
