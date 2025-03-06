import { CommonModule } from '@angular/common';
import {
  Component,
  ContentChild,
  input,
  TemplateRef,
  DoCheck,
  ChangeDetectionStrategy,
  AfterViewChecked,
  ChangeDetectorRef,
} from '@angular/core';

@Component({
  selector: 'app-simple-grid-cell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './simple-grid-cell.component.html',
  styleUrl: './simple-grid-cell.component.scss',
})
export class SimpleGridCellComponent {
  column = input.required<string>();

  @ContentChild(TemplateRef) template!: TemplateRef<any>;
}
