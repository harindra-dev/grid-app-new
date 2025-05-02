import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  AfterViewInit,
  Output,
  SimpleChanges,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  OnDestroy,
  HostListener,
} from '@angular/core';
import { CdkPortal, PortalModule } from '@angular/cdk/portal';
import {
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subject } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

import {
  MatAutocomplete,
  MatAutocompleteModule,
  MatAutocompleteTrigger,
} from '@angular/material/autocomplete';
import {
  CdkVirtualScrollViewport,
  ScrollingModule,
} from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';

import {
  OvUiPortalService,
  PortalEvents,
} from '../../../../../ov-ui-portal.service.js';

export interface TypeAheadData {
  [x: string]: any;
  id?: string | number;
  value: string;
  icon?: string;
  label?: string;
}

@Component({
  selector: 'lib-ov-type-ahead',
  standalone: true,
  imports: [
    CommonModule,
    ScrollingModule,
    FormsModule,
    MatAutocompleteModule,
    ReactiveFormsModule,
    PortalModule,
  ],
  templateUrl: './ov-type-ahead.component.html',
  styleUrl: './ov-type-ahead.component.scss',
})
export class OvTypeAheadComponent
  implements OnInit, OnChanges, AfterViewInit, OnDestroy
{
  @HostListener('focus')
  onFocus() {
    this.inputEle.nativeElement.focus();
  }

  @ViewChild('virtualScrollPort', { static: false })
  virtualScrollPort: CdkVirtualScrollViewport | undefined;
  @ViewChild(MatAutocompleteTrigger) inputAutocomplet:
    | MatAutocompleteTrigger
    | undefined;
  @ViewChild(MatAutocomplete) matAutocomplete: MatAutocomplete | undefined;
  @ViewChild('closePanelTrigger') closePanelTrigger: ElementRef | undefined;
  @ViewChild('input') inputEle!: ElementRef;

  @ViewChild(CdkPortal, { static: true }) portalContent!: CdkPortal;

  @Input() placeholder = 'Enter the input';
  @Input() keyName = 'id';
  @Input() valueName = 'value';
  @Input() defaultValueKey = null;
  @Input() hasIcon = false;
  @Input() isRequired = true;
  @Input() minRecordIndex = 100;
  @Input() hasVirtualScroll = true;
  // enable / disale auto select first non blank value if only one option is available in the list
  @Input() shouldAutoSelectFirstOption = false;
  @Input() isFieldReset = false;
  @Input() isAllowNullValtoCntrl = false;
  @Input() hasError = false;
  @Input() options: TypeAheadData[] | null | undefined = [
    {
      id: 1,
      value:
        'Aerospace Aerospace Aerospace Aerospace Aerospace Aerospace Aerospace Aerospace Aerospace',
      icon: 'home',
    },
    { id: 2, value: 'Aerospace', icon: 'building' },
    { id: 3, value: 'Banking', icon: 'location-arrow' },
    { id: 4, value: 'CapitalMarkets', icon: 'building' },
    { id: 5, value: 'Chemicals', icon: 'eye-slash' },
    { id: 6, value: 'Defence', icon: 'home' },
    { id: 7, value: 'Education', icon: 'home' },
  ];
  @Input() tabindex: string | undefined;
  @Input() isDisabled = false;
  @Output() selectedValueEmitter: EventEmitter<any> = new EventEmitter();
  @Output() resetFieldEmitter = new EventEmitter();
  @Input() defaultValue!: any;
  @Input() isDropDownRequired = true;
  @Input() isEnableBlankSpacesOption = false;
  @Input() hasCdkScroller = false;
  @Input() shouldEmitAutoMatchedOption = true;
  @Output() enteredKeyValue: EventEmitter<any> = new EventEmitter();
  typeInputOriginValue: string | undefined;
  keyupInputValue: string | undefined;
  isState = false;
  control = new FormControl();
  filteredOptions!: TypeAheadData[];
  noOptionsData = [{ id: 1, value: 'No Results Found' }];
  shouldShowIcon = false;
  iconDisplay: any;
  iconDisplay$ = new Subject<any>();
  selectedValue = '';
  isDropdownOpened = false;
  private onDestroy$ = new Subject<void>();
  showIconTimeout: any;

  isAcOptionsHidden = true;
  acOptionsVisibility = new Subject<boolean>();
  acOptionSelected: number | null = null;
  acOptionInFocus: number | null = null;
  typeAheadComponentId: string | null = null;
  portalEventsSubscription: null | any;
  isOptionSelectedByClick: boolean | undefined = undefined;

  isPortalActive = false;
  isAnyKeyPressed = false;
  optionsContainerPosition = {
    minWidth: `0px`,
  };
  optionsContainerPosition$ = new Subject<
    typeof this.optionsContainerPosition
  >();

  constructor(
    private cdRef: ChangeDetectorRef,
    private _OvUiPortalService: OvUiPortalService
  ) {}
  panelOpened() {
    if (this.virtualScrollPort) {
      this.virtualScrollPort.scrollToIndex(0);
      this.virtualScrollPort.checkViewportSize();
    }
  }

  ngOnChanges(changes?: SimpleChanges): void {
    if (changes?.['isFieldReset']?.currentValue) {
      this.control.reset();
      this.typeInputOriginValue = '';
    }

    const data = changes?.['defaultValue']?.currentValue || this.defaultValue;
    if (this.isAllowNullValtoCntrl && (data === null || data === '')) {
      this.control.setValue(null);
    }

    if (data && this.options) {
      const key = this.defaultValueKey ? this.defaultValueKey : this.keyName;
      const selectedControlValue: any = this.options.find((option: any) => {
        if (option[key] === data || option[key] === data.toString()) {
          return option;
        }
      });

      if (selectedControlValue && selectedControlValue[this.valueName]) {
        this.control.setValue(selectedControlValue[this.valueName]);

        if (changes?.['options']?.firstChange || this.defaultValue) {
          this.selectedValueEmitter.emit(selectedControlValue);
        }
      }
    }
    // auto-select available option if there is only one option available in dropdown
    if (
      changes?.['options']?.currentValue?.length === 2 &&
      changes?.['shouldAutoSelectFirstOption']?.currentValue
    ) {
      this.control.setValue(
        changes?.['options']?.currentValue[1][this.valueName]
      );
      this.selectedValue =
        changes?.['options']?.currentValue[1][this.valueName];
      this.selectedValueEmitter.emit(changes?.['options']?.currentValue[1]);
    }

    if (changes?.['options']?.currentValue && !this.isEnableBlankSpacesOption) {
      this.options = this.options?.filter(
        (option: any) => option[this.valueName]?.trim().length > 0
      );
    }

    if (
      JSON.stringify(changes?.['options']?.currentValue) !==
      JSON.stringify(changes?.['options']?.previousValue)
    ) {
      this.filteredMethod();
    }
  }

  ngOnInit() {
    // if the field is required. sets the required validator true
    if (this.isRequired) {
      this.control.setValidators(Validators.required);
    } else {
      this.control.setValidators(null);
      this.control.setErrors(null);
    }

    this.filteredMethod();
    this.typeAheadComponentId = uuidv4();
    this.acOptionsVisibility.next(this.isAcOptionsHidden);
  }

  filteredMethod() {
    // filters the options on form value change
    this.control.valueChanges
      .pipe(
        debounceTime(10),
        distinctUntilChanged(),
        takeUntil(this.onDestroy$)
      )
      .subscribe((value) => {
        this.acOptionInFocus = -1;
        this.acOptionSelected = null;
        this.filteredOptions = this.applyFilter(value);
      });
  }

  ngAfterViewInit() {
    // if there is a defual value icon
    if (this.defaultValue && this.options && this.hasIcon) {
      this.shouldShowIcon = true;
      this.iconDisplay = this.options[this.defaultValue - 1].icon;
    }
    if (this.isDisabled) {
      this.inputEle.nativeElement.disabled = true;
    }

    this.cdRef.detectChanges();
  }

  // click state on form
  keepDefault() {
    this.isState = true;
  }

  applyFilter(value: string): TypeAheadData[] {
    const filterValue = value?.toString().toLowerCase();
    this.enteredKeyValue.emit(filterValue);
    const results: TypeAheadData[] | null | undefined = this.options?.filter(
      (option: TypeAheadData) => {
        type TypeOmitIcon = Omit<TypeAheadData, 'icon' | 'label'>;
        if (
          option[this.valueName as keyof TypeOmitIcon]
            .toString()
            .toLowerCase() === filterValue &&
          (!this.typeInputOriginValue ||
            this.typeInputOriginValue !==
              option[this.valueName as keyof TypeOmitIcon].toString())
        ) {
          if (this.shouldEmitAutoMatchedOption) {
            this.selectedValueEmitter.emit(option);
          }

          this.typeInputOriginValue =
            option[this.valueName as keyof TypeOmitIcon].toString();
        }
        if (filterValue === '') {
          this.resetFieldEmitter.emit();
        }
        return option[this.valueName as keyof TypeOmitIcon]
          .toString()
          .toLowerCase()
          .includes(filterValue);
      }
    );
    if (results && results.length && this.isAnyKeyPressed) {
      this.setAcOptionInFocus(0);
    }
    return results?.length ? results : this.filterResultValidation(filterValue);
  }

  filterResultValidation(filterValue: string) {
    if (filterValue && (this.options === null || this.options === undefined)) {
      return this.noOptionsData.map((x: TypeAheadData) => {
        x[this.valueName as keyof TypeAheadData] = x.value;
        return x;
      });
    }
    return [];
  }
  autocompleteDisplay(option: any): string {
    return option && option[this.valueName] ? option[this.valueName] : '';
  }

  selectionValue(event: any) {
    this.selectedValueEmitter.emit(event.option.value[this.keyName]);
  }

  closePanel() {
    this.isDropdownOpened = false;
  }

  setControlValue(char: string, value: string) {
    this.keyupInputValue = value;
    if (char === 'Tab' && !value && !this.hasError) {
      this.inputEle.nativeElement.classList.remove('ng-invalid');
    }
  }

  setOverlayPositionBounding(): void {
    const inputElBounds: DOMRect =
      this.inputEle.nativeElement.getBoundingClientRect();
    this.optionsContainerPosition = {
      minWidth: `${inputElBounds.width}px`,
    };
    this.optionsContainerPosition$.next(this.optionsContainerPosition);
  }

  /**
   * @method toggleAcOptions
   * This method is to toggle auto complete options toggle between `Visible` and `Hidden`
   * @param acOptionsState : 'open | 'close
   */
  toggleAcOptions(acOptionsState: 'open' | 'close'): void {
    // Set options hidden state
    this.isAcOptionsHidden = acOptionsState === 'open' ? false : true;
    this.acOptionsVisibility.next(this.isAcOptionsHidden);

    if (!this.isAcOptionsHidden) {
      this.setOverlayPositionBounding();
      this._OvUiPortalService.setPortalInfo({
        portalContent: this.portalContent,
        targetElementRefId: `[data-ac-options-input="${this.typeAheadComponentId}"]`,
        overlayPointerEvents: 'none',
      });

      if (!this.filteredOptions || this.filteredOptions?.length < 1) {
        this.filteredOptions = this.control.value?.length
          ? this.applyFilter(this.control.value)
          : [...(this.options as any)];
      } else {
        let optionSelected = -1;
        // eslint-disable-next-line @typescript-eslint/prefer-for-of
        for (let i = 0; i < this.filteredOptions.length; i += 1) {
          const _option: any = this.filteredOptions[i];
          if (
            _option[this.valueName].toLowerCase() ===
            this.inputEle.nativeElement.value.toLowerCase()
          ) {
            optionSelected = i;
            break;
          }
        }
        // Below `if` block will highlite any selected option or existing value that is exactly matching with any option
        if (optionSelected >= 0) {
          this.setAcOptionInFocus(optionSelected);
        }
      }
      if (!this.portalEventsSubscription) {
        this.listenToPortalEvent();
      }
    } else {
      // if (
      //   !this.shouldEmitAutoMatchedOption &&
      //   typeof this.acOptionSelected === 'number' &&
      //   this.acOptionSelected >= 0 &&
      //   (this.isAnyKeyPressed || this.isOptionSelectedByClick)
      // ) {
      //   this.selectedValueEmitter.emit(
      //     this.filteredOptions[this.acOptionSelected],
      //   );
      // }
    }

    if (this.isAcOptionsHidden) {
      this.filteredOptions = [];
      this.unSubscribeToPortalEvents();
    }
  }

  listenToPortalEvent() {
    this.portalEventsSubscription =
      this._OvUiPortalService.portalEvents$.subscribe((event: PortalEvents) => {
        if (event?.click) {
          const target = event.click?.target as HTMLElement;
          const parentNode = document.querySelector(
            `[data-ac-option-comp="${this.typeAheadComponentId}"]`
          );
          const listNode = document.querySelector(
            `[data-ac-options-list="${this.typeAheadComponentId}"]`
          );
          const isChild =
            parentNode?.contains(target as HTMLElement) ||
            listNode?.contains(target as HTMLElement);
          if (!isChild) {
            this.isOptionSelectedByClick = true;
            const inputValue = this.inputEle?.nativeElement?.value
              ?.trim()
              .toLowerCase();
            if (inputValue.length >= 1) {
              const optionMatching = this.findMatchedOptionIndex(inputValue);
              if (typeof optionMatching === 'number' && optionMatching >= 0) {
                this.selectAutoCompleteOption(optionMatching);
              } else {
                this.resetFieldAndCloseOptionsDropdown();
                return;
              }
            } else {
              this.toggleAcOptions('close');
            }
          } else {
            this.isOptionSelectedByClick = false;
          }
        }
      });
  }

  unSubscribeToPortalEvents() {
    if (this.portalEventsSubscription) {
      this.portalEventsSubscription.unsubscribe();
      this.portalEventsSubscription = null;
    }
  }

  scrollAcOptionIntoView() {
    setTimeout(() => {
      document
        .querySelector(
          `[data-option-id="${this.typeAheadComponentId}-option-${this.acOptionInFocus}"]`
        )
        ?.scrollIntoView({ block: 'nearest' });
    }, 100);
  }

  setAcOptionInFocus(optionIndex: number | null) {
    this.acOptionInFocus = optionIndex;
    if (typeof this.acOptionInFocus === 'number' && this.acOptionInFocus >= 0) {
      this.scrollAcOptionIntoView();
    }
  }

  getNativeInputrCurrentValue(isOptionInFocus?: boolean): string {
    return isOptionInFocus
      ? this.acOptionInFocus
      : this.inputEle?.nativeElement?.value;
  }

  findMatchedOptionIndex(inputValue: string): number | undefined {
    return this.filteredOptions?.findIndex(
      (option: any) =>
        option[this.valueName].toLowerCase() === inputValue.trim().toLowerCase()
    );
  }

  resetFieldAndCloseOptionsDropdown() {
    this.inputEle.nativeElement.value = '';
    this.control.setValue('');
    this.toggleAcOptions('close');
  }

  handleKeyDown(event: KeyboardEvent) {
    const exemptedKeys: string[] = [
      'Delete',
      'CapsLock',
      'Shift',
      'Meta',
      'MetaLeft',
      'ScrollLock',
      'Pause',
      'Insert',
      'Home',
      'PageUp',
      'End',
      'PageDown',
      'NumLock',
      'F1',
      'F2',
      'F3',
      'F4',
      'F5',
      'F6',
      'F7',
      'F8',
      'F9',
      'F10',
      'F11',
      'F12',
    ];
    if (event.ctrlKey || event.altKey || exemptedKeys.includes(event.key)) {
      return;
    }
    const keyCode = event.key;

    switch (keyCode) {
      case 'Tab':
      case 'Enter':
        if (!this.isAcOptionsHidden) {
          if (keyCode === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
          }
          const enteredValue = this.getNativeInputrCurrentValue(true);
          const matchedOption: number =
            enteredValue.length >= 1
              ? (this.findMatchedOptionIndex(enteredValue) as number)
              : -1;
          if (typeof matchedOption === 'number' && matchedOption >= 0) {
            this.insertSelectedOption(matchedOption);
          } else if (
            typeof this.acOptionInFocus === 'number' &&
            this.acOptionInFocus >= 0
          ) {
            this.insertSelectedOption(this.acOptionInFocus as number);
            return;
          } else {
            this.resetFieldAndCloseOptionsDropdown();
          }
        }
        break;
      case 'ArrowDown':
        if (this.isAcOptionsHidden) {
          this.toggleAcOptions('open');
          this.setAcOptionInFocus(0);
        } else {
          if (typeof this.acOptionInFocus !== 'number') {
            this.setAcOptionInFocus(0);
          } else if (this.acOptionInFocus < this.filteredOptions.length - 1) {
            this.setAcOptionInFocus(this.acOptionInFocus + 1);
          }
        }
        break;
      case 'ArrowUp':
        if (
          typeof this.acOptionInFocus === 'number' &&
          this.acOptionInFocus >= 0
        ) {
          this.setAcOptionInFocus(this.acOptionInFocus - 1);
        }
        break;
      case 'Escape':
        this.toggleAcOptions('close');
        break;
      default:
        this.isAnyKeyPressed = true;
        this.toggleAcOptions('open');
    }
  }

  handleFocus() {
    this.acOptionInFocus = -1;
    if (this.isAcOptionsHidden) {
      this.filteredOptions = (this.options as TypeAheadData[]) || [];
      this.inputEle.nativeElement.select();
      this.toggleAcOptions('open');
    }
  }

  handleDropdownIconClick(): void {
    if (this.isAcOptionsHidden) {
      this.filteredOptions = (this.options as TypeAheadData[]) || [];

      this.inputEle.nativeElement.focus();
    } else {
      this.toggleAcOptions('close');
    }
  }

  insertSelectedOption(index: number) {
    const option: any = this.filteredOptions[index];
    this.control.setValue(option[this.valueName]);
    this.iconDisplay = option?.icon;
    this.iconDisplay$.next(this.iconDisplay);
    this.toggleAcOptions('close');
    if (!this.shouldEmitAutoMatchedOption) {
      this.selectedValueEmitter.emit(option);
    }
    // if (
    //   !this.shouldEmitAutoMatchedOption &&
    //   typeof this.acOptionSelected === 'number' &&
    //   this.acOptionSelected >= 0 &&
    //   (this.isAnyKeyPressed || this.isOptionSelectedByClick)
    // ) {
    //   this.selectedValueEmitter.emit(
    //     this.filteredOptions[this.acOptionSelected],
    //   );
    // }
  }

  selectAutoCompleteOption(index: number): void {
    this.acOptionSelected = index;
    this.acOptionInFocus = index;
    this.insertSelectedOption(index);
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
    this.iconDisplay$.complete();
    clearTimeout(this.showIconTimeout);
    if (this.portalContent.isAttached) {
      this.portalContent.detach();
    }

    this.unSubscribeToPortalEvents();
    this.acOptionsVisibility?.unsubscribe();
  }
}
