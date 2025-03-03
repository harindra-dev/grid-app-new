import { Component, Signal } from '@angular/core';
import {
  SimpleGridColumnData,
  SimpleGridModule,
  SimpleGridRow,
} from './simple-grid';
import { faker } from '@faker-js/faker';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SimpleGridModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  dataRows: SimpleGridRow[] = [];
  // Student marks columns Data for student roll number, english, maths, science, and total marks along with action to do something in last column
  columnsData: SimpleGridColumnData[] = [
    {
      key: 'roll',
      label: 'Roll Number',
      width: 60,
    },
    {
      key: 'name',
      label: 'Name',
    },
    {
      key: 'english',
      label: 'English',
    },
    {
      key: 'maths',
      label: 'Maths',
    },
    {
      key: 'science',
      label: 'Science',
    },
    {
      key: 'total',
      label: 'Total',
    },
    {
      key: 'actions',
      label: '',
    },
  ];

  constructor() {
    this.dataRows = this.dataGenerator(50);
  }

  dataGenerator(count: number): SimpleGridRow[] {
    const data = [];
    for (let i = 0; i < count; i++) {
      data.push({
        roll: i + 1,
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
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
    console.log('Edit row:', row);
  }

  deleteRow(row: SimpleGridRow) {
    console.log('Delete row:', row);
  }
}
