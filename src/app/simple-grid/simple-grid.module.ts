import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SimpleGridPaginationComponent } from './simple-grid-pagination/simple-grid-pagination.component';
import { SimpleGridCellComponent } from './simple-grid-cell/simple-grid-cell.component';
import { SimpleGridComponent } from './simple-grid/simple-grid.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    SimpleGridComponent,
    SimpleGridPaginationComponent,
    SimpleGridCellComponent,
  ],
  exports: [
    SimpleGridComponent,
    SimpleGridPaginationComponent,
    SimpleGridCellComponent,
  ],
})
export class SimpleGridModule {}
