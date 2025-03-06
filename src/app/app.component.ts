import { ChangeDetectionStrategy, Component, ViewChild } from '@angular/core';
import {
  IndexedSimpleGridRow,
  SimpleGridColumnData,
  SimpleGridModule,
  SimpleGridPageCahangeEvent,
  SimpleGridRow,
} from './simple-grid';
import { faker } from '@faker-js/faker';
import { SimpleGridComponent } from './simple-grid/simple-grid/simple-grid.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SimpleGridModule, SimpleGridComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  @ViewChild('sampleGrid') sampleGrid!: SimpleGridComponent;
  totalRows = 250000;
  dataRows: SimpleGridRow[] = [];
  columnsData: SimpleGridColumnData[] = [
    {
      field: 'roll',
      label: 'Roll Number',
      width: 120,
    },
    {
      field: 'name',
      label: 'Name',
    },
    {
      field: 'english',
      label: 'English',
    },
    {
      field: 'maths',
      label: 'Maths',
    },
    {
      field: 'science',
      label: 'Science',
    },
    {
      field: 'total',
      label: 'Total',
    },
    {
      field: 'actions',
      label: '',
      sortable: false,
    },
  ];

  constructor() {
    this.dataRows = this.dataGenerator(50);
  }

  dataGenerator(count: number, offset: number = 0): SimpleGridRow[] {
    const data = [];

    for (let i = 0; i < count; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      data.push({
        roll: offset + i + 1,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        english: Math.floor(Math.random() * 100),
        maths: Math.floor(Math.random() * 100),
        science: Math.floor(Math.random() * 100),
        total:
          Math.floor(Math.random() * 100) +
          Math.floor(Math.random() * 100) +
          Math.floor(Math.random() * 100),
      });
    }
    return data;
  }

  editRow(row: SimpleGridRow) {
    // console.log('Edit row:', row);
  }

  deleteRow(row: SimpleGridRow) {
    // console.log('Delete row:', row);
  }

  handlePageChange(event: SimpleGridPageCahangeEvent) {
    // console.log('Page change event:', event, this.sampleGrid);
    if (event.isLastPage && event.shouldFetchNextRows) {
      this.dataRows = this.dataGenerator(this.totalRows);
      return;
    }
    if (event.shouldFetchNextRows) {
      this.sampleGrid.appendDataRows(
        this.dataGenerator(
          event.pageSize >= 50 ? 100 : 50,
          event.dataRowsInSource
        )
      );
    }
  }

  handleSelectionChange(slectedRows: IndexedSimpleGridRow[]) {
    console.log('Selection change event:', slectedRows.length);
  }
}
