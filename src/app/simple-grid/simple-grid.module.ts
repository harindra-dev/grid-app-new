import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SimpleGridPaginationComponent } from './simple-grid-pagination/simple-grid-pagination.component';
import { SimpleGridCellComponent } from './simple-grid-cell/simple-grid-cell.component';
import { SimpleGridComponent } from './simple-grid/simple-grid.component';
import { SimpleGridFilterComponent } from './simple-grid-filter/simple-grid-filter.component';
import { MatCheckboxModule } from '@angular/material/checkbox';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    SimpleGridComponent,
    SimpleGridPaginationComponent,
    SimpleGridCellComponent,
    SimpleGridFilterComponent,
    MatCheckboxModule,
  ],
  exports: [
    SimpleGridComponent,
    SimpleGridPaginationComponent,
    SimpleGridCellComponent,
    SimpleGridFilterComponent,
  ],
})
export class SimpleGridModule {}
