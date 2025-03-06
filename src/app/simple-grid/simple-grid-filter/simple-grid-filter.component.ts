import {
  ChangeDetectionStrategy,
  Component,
  effect,
  EventEmitter,
  input,
  Output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-simple-grid-filter',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './simple-grid-filter.component.html',
  styleUrl: './simple-grid-filter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimpleGridFilterComponent {
  _filterValue = input<string>('', {
    alias: 'value',
  });

  filterValue = signal<string>(this._filterValue());

  @Output() onFilterValueChange = new EventEmitter<string>();

  filterValueEffect = effect(() => {
    // console.log('filter value updated', this.filterValue());
    this.onFilterValueChange.emit(this.filterValue());
  });
}
