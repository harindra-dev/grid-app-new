import {
  Component,
  Input,
  ElementRef,
  OnInit,
  OnDestroy,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Overlay,
  OverlayRef,
  OverlayModule,
  ConnectedPosition,
} from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { fromEvent, Subscription } from 'rxjs';
import { debounceTime, filter } from 'rxjs/operators';

type HorizontalPosition = 'start' | 'center' | 'end';
type VerticalPosition = 'top' | 'center' | 'bottom';

@Component({
  selector: 'lib-popover',
  standalone: true,
  imports: [CommonModule, OverlayModule],
  templateUrl: './popover.component.html',
  styleUrls: ['./popover.component.scss'],
})
export class PopoverComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() triggerEl!: ElementRef | HTMLElement;
  @Input() triggerEvent: 'hover' | 'click' = 'hover';
  @Input() position: [HorizontalPosition, VerticalPosition] = [
    'center',
    'bottom',
  ];
  @Input() backdrop = true;
  @Input() closeOnEscape = true;
  @Input() testId?: string; // Add this to your inputs
  @Input() maxWidth = 276;
  @Input() autoShow = false;
  @Input() disableArrow = false;

  @ViewChild('templatePortalContent') templatePortalContent!: TemplateRef<any>;

  private overlayRef!: OverlayRef;
  private portal!: TemplatePortal;
  private subscriptions: Subscription[] = [];

  // Add these new properties and methods
  private hideTimer: any;
  private readonly hideDelay = 150; // Increased delay for smoother transition

  private mouseLeaveDelay = 100;

  private isPinned = false;

  constructor(
    private overlay: Overlay,

    private viewContainerRef: ViewContainerRef
  ) {}

  ngOnInit() {
    this.createOverlay();
    this.setupTriggers();
    const positionJoin = this.position.join(',');
    if (positionJoin === 'center,center') {
      this.disableArrow = true;
    }
  }

  ngAfterViewInit() {
    if (this.autoShow) {
      setTimeout(() => {
        this.show();
      }, 0);
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.cancelHideTimer();
    if (this.overlayRef) {
      this.overlayRef.dispose();
    }
  }

  getTriggerElement(): HTMLElement {
    return this.triggerEl instanceof ElementRef
      ? this.triggerEl.nativeElement
      : this.triggerEl;
  }

  get triggerElWidth(): number {
    return this.getTriggerElement().getBoundingClientRect().width;
  }

  private addTestIdAttribute() {
    if (this.testId && this.overlayRef) {
      this.overlayRef.overlayElement.setAttribute('data-test-id', this.testId);
    }
  }

  private setupOverlayListeners() {
    // Backdrop click handler
    const backdropClick = this.overlayRef.backdropClick().subscribe(() => {
      if (this.isPinned) {
        this.hide();
      }
    });
    this.subscriptions.push(backdropClick);

    // Escape key handler
    if (this.closeOnEscape) {
      const escapeKey = this.overlayRef
        .keydownEvents()
        .pipe(filter((event) => event.key === 'Escape'))
        .subscribe(() => {
          if (this.isPinned) {
            this.hide();
          }
        });
      this.subscriptions.push(escapeKey);
    }
  }

  show(shouldPin = false) {
    if (!this.overlayRef.hasAttached()) {
      this.portal = new TemplatePortal(
        this.templatePortalContent,
        this.viewContainerRef
      );

      // Attach the portal first
      this.overlayRef.attach(this.portal);
      this.setupPopoverMouseEvents();

      // Handle pinning after attachment
      if (shouldPin) {
        this.pin();
      }
    } else if (shouldPin && !this.isPinned) {
      this.pin();
    }
  }

  private pin() {
    this.isPinned = true;
    if (this.backdrop) {
      // Detach and recreate overlay with backdrop
      const element = this.overlayRef.overlayElement;
      this.overlayRef.dispose();

      const config = {
        positionStrategy: this.overlay
          .position()
          .flexibleConnectedTo(this.triggerEl)
          .withPositions([{ ...this.getOverlayPosition() }]),
        scrollStrategy: this.overlay.scrollStrategies.reposition(),
        hasBackdrop: true,
        backdropClass: 'popover-backdrop',
        panelClass: this.testId ? [`popover-panel-${this.testId}`] : [],
      };

      this.overlayRef = this.overlay.create(config);
      this.addTestIdAttribute();
      this.setupOverlayListeners();
      this.overlayRef.attach(this.portal);
    }
  }

  private unpin() {
    this.isPinned = false;
    if (this.overlayRef.hasAttached()) {
      // Detach and recreate overlay without backdrop
      const element = this.overlayRef.overlayElement;
      this.overlayRef.dispose();

      const config = {
        positionStrategy: this.overlay
          .position()
          .flexibleConnectedTo(this.triggerEl)
          .withPositions([{ ...this.getOverlayPosition() }]),
        scrollStrategy: this.overlay.scrollStrategies.reposition(),
        hasBackdrop: false,
        backdropClass: 'popover-backdrop',
        panelClass: this.testId ? [`popover-panel-${this.testId}`] : [],
      };

      this.overlayRef = this.overlay.create(config);
      this.addTestIdAttribute();
      this.setupOverlayListeners();
      this.overlayRef.attach(this.portal);
    }
  }

  hide() {
    if (this.overlayRef.hasAttached()) {
      this.unpin();
      this.overlayRef.detach();
    }
  }

  private createOverlay() {
    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.triggerEl)
      .withPositions([{ ...this.getOverlayPosition() }]);

    const scrollStrategy = this.overlay.scrollStrategies.reposition();

    const config = {
      positionStrategy,
      scrollStrategy,
      hasBackdrop: false,
      backdropClass: 'popover-backdrop',
      panelClass: this.testId ? [`popover-panel-${this.testId}`] : [],
    };

    this.overlayRef = this.overlay.create(config);
    this.addTestIdAttribute();
    this.setupOverlayListeners();
  }

  private setupPopoverMouseEvents() {
    if (this.overlayRef && this.overlayRef.hasAttached()) {
      // When mouse enters popover
      const popoverMouseEnter = fromEvent(
        this.overlayRef.overlayElement,
        'mouseenter'
      ).subscribe(() => {
        if (!this.isPinned) {
          this.cancelHideTimer();
        }
      });
      this.subscriptions.push(popoverMouseEnter);

      // When mouse leaves popover
      const popoverMouseLeave = fromEvent(
        this.overlayRef.overlayElement,
        'mouseleave'
      ).subscribe(() => {
        if (!this.isPinned) {
          this.startHideTimer();
        }
      });
      this.subscriptions.push(popoverMouseLeave);
    }
  }

  private isMouseOverPopover(): boolean {
    if (!this.overlayRef?.hasAttached()) return false;
    return this.isElementHovered(this.overlayRef.overlayElement);
  }

  private isMouseOverTrigger(): boolean {
    return this.isElementHovered(this.getTriggerElement());
  }

  private isElementHovered(element: HTMLElement): boolean {
    const hoverElements = document.querySelectorAll(':hover');
    return Array.from(hoverElements).includes(element);
  }

  private setupTriggers() {
    if (this.triggerEvent === 'hover') {
      if (!this.autoShow) {
        // Handle click to pin/unpin
        const click = fromEvent(this.getTriggerElement(), 'click').subscribe(
          () => {
            if (this.overlayRef.hasAttached()) {
              if (this.isPinned) {
                this.hide();
              } else {
                this.pin();
              }
            } else {
              this.show(true);
            }
          }
        );
        this.subscriptions.push(click);

        // Handle hover
        const mouseEnter = fromEvent(
          this.getTriggerElement(),
          'mouseenter'
        ).subscribe(() => {
          if (!this.isPinned) {
            this.cancelHideTimer();
            this.show(false);
          }
        });
        this.subscriptions.push(mouseEnter);

        // Handle mouse leave from trigger element
        const mouseLeave = fromEvent(this.getTriggerElement(), 'mouseleave')
          .pipe(debounceTime(this.mouseLeaveDelay))
          .subscribe(() => {
            if (!this.isPinned) {
              this.startHideTimer();
            }
          });
        this.subscriptions.push(mouseLeave);
      }
    } else if (this.triggerEvent === 'click') {
      // Handle click trigger
      const click = fromEvent(this.getTriggerElement(), 'click').subscribe(
        () => {
          if (this.overlayRef.hasAttached()) {
            this.hide();
          } else {
            this.show(true); // Show and pin the popover
          }
        }
      );
      this.subscriptions.push(click);
    }
  }

  private startHideTimer() {
    this.cancelHideTimer();
    this.hideTimer = setTimeout(() => {
      if (
        !this.isPinned &&
        !this.isMouseOverPopover() &&
        !this.isMouseOverTrigger()
      ) {
        this.hide();
      }
    }, this.hideDelay);
  }

  private cancelHideTimer() {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  private getOverlayPosition(): ConnectedPosition {
    const [horizontalPosition, verticalPosition] = this.position;

    return {
      originX: horizontalPosition,
      originY:
        verticalPosition === 'bottom'
          ? 'bottom'
          : verticalPosition === 'top'
          ? 'top'
          : 'center',
      overlayX:
        horizontalPosition === 'start'
          ? 'end'
          : horizontalPosition === 'end'
          ? 'start'
          : 'center',
      overlayY:
        verticalPosition === 'bottom'
          ? 'top'
          : verticalPosition === 'top'
          ? 'bottom'
          : 'center',
      offsetY: 0,
      offsetX:
        horizontalPosition === 'start'
          ? this.triggerElWidth - 12
          : horizontalPosition === 'end'
          ? this.triggerElWidth - 12
          : 0,
    };
  }
}
