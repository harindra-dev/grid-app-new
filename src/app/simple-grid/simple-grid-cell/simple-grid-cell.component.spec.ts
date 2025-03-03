import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SimpleGridCellComponent } from './simple-grid-cell.component';

describe('SimpleGridCellComponent', () => {
  let component: SimpleGridCellComponent;
  let fixture: ComponentFixture<SimpleGridCellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimpleGridCellComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SimpleGridCellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
