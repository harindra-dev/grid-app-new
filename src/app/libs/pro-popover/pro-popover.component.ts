import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  ViewContainerRef,
  AfterViewInit,
  OnDestroy,
  OnInit,
  TemplateRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Overlay,
  OverlayRef,
  OverlayModule,
  OverlayConfig,
  ConnectedPosition,
  PositionStrategy,
} from '@angular/cdk/overlay';
import { TemplatePortal, PortalModule } from '@angular/cdk/portal';
import {
  fromEvent,
  merge,
  Subject,
  Subscription,
  timer,
  debounceTime,
} from 'rxjs';
import { filter, take, takeUntil } from 'rxjs/operators';

export type PopoverPosition =
  | 'top'
  | 'top-left'
  | 'top-right'
  | 'bottom'
  | 'bottom-left'
  | 'bottom-right'
  | 'left'
  | 'left-top'
  | 'left-bottom'
  | 'right'
  | 'right-top'
  | 'right-bottom';

/**
 * A professional popover component that provides a clean and consistent hover/click behavior.
 * When hovered, the popover is shown. When clicked, the popover is pinned until clicked outside.
 */
@Component({
  selector: 'app-pro-popover',
  standalone: true,
  imports: [CommonModule, OverlayModule, PortalModule],
  templateUrl: './pro-popover.component.html',
  styleUrls: ['./pro-popover.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProPopoverComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() triggerEl!: ElementRef | HTMLElement;
  @Input() position: PopoverPosition = 'bottom';
  @Input() offset = 8; // Space between trigger and popover
  @Input() hasBackdrop = true;
  @Input() backdropClass = 'popover-transparent-backdrop';
  @Input() panelClass = '';
  @Input() closeOnBackdropClick = true;
  @Input() closeOnEscape = true;
  @Input() showArrow = true;
  @Input() hasAnimation = true;
  @Input() preventOverflow = true;
  @Input() maxWidth = 'none';
  @Input() minWidth = 'none';
  @Input() contentMaxWidth = '300px';

  @ViewChild('popoverTemplate') popoverTemplate!: TemplateRef<any>;
  @ViewChild('arrowElement') arrowElement: ElementRef | undefined;

  private overlay = inject(Overlay);
  private viewContainerRef = inject(ViewContainerRef);
  private cdr = inject(ChangeDetectorRef);

  private overlayRef: OverlayRef | null = null;
  private portal: TemplatePortal | null = null;
  private positionStrategy!: PositionStrategy;
  private subscriptions: Subscription[] = [];
  private destroy$ = new Subject<void>();

  // Simple state management
  private isPinned = false;
  private isHovered = false;
  private hideTimer?: number;
  private readonly hideDelay = 200;
  private currentPosition: string = ''; // Track the current actual position
  private hasBackdropAttached = false;

  // Add a flag to track if we recently closed a pinned popover
  private recentlyUnpinned = false;
  private unpinCooldownTimer?: number;
  private readonly unpinCooldownDelay = 300; // ms

  ngOnInit() {
    if (!this.triggerEl) {
      console.error('ProPopover: triggerEl input is required');
      return;
    }
  }

  ngAfterViewInit() {
    this.createOverlay();
    this.setupTriggerEvents();
  }

  private createOverlay() {
    this.positionStrategy = this.createPositionStrategy();

    const overlayConfig: OverlayConfig = {
      positionStrategy: this.positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      minWidth: this.minWidth !== 'none' ? this.minWidth : undefined,
      maxWidth: this.maxWidth !== 'none' ? this.maxWidth : undefined,
      hasBackdrop: false, // We'll add backdrop only when pinned
      backdropClass: this.backdropClass,
      panelClass: this.getPopoverClasses(),
    };

    this.overlayRef = this.overlay.create(overlayConfig);

    // Listen to position changes for arrow positioning
    const flexPosStrategy = this.positionStrategy as any;
    if (
      flexPosStrategy &&
      typeof flexPosStrategy.positionChanges !== 'undefined'
    ) {
      const positionSub = flexPosStrategy.positionChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          // Update arrow position after position changes
          this.updateArrowPosition();
        });
      this.subscriptions.push(positionSub);
    }

    // Handle window resize/scroll to update arrow position
    const repositionEvents = merge(
      fromEvent(window, 'resize'),
      fromEvent(window, 'scroll', { capture: true })
    )
      .pipe(debounceTime(50), takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.overlayRef?.hasAttached()) {
          this.overlayRef.updatePosition();
          // Ensure arrow position is updated after overlay position
          setTimeout(() => this.updateArrowPosition(), 0);
        }
      });
    this.subscriptions.push(repositionEvents);
  }

  private getPopoverClasses(): string[] {
    const classes = ['pro-popover-panel'];

    if (this.hasAnimation) {
      classes.push('pro-popover-animated');
    }

    if (this.panelClass) {
      if (Array.isArray(this.panelClass)) {
        classes.push(...this.panelClass);
      } else {
        classes.push(this.panelClass);
      }
    }

    return classes;
  }

  private setupTriggerEvents() {
    const triggerElement = this.getTriggerElement();

    // Show popover on hover
    const mouseEnter = fromEvent(triggerElement, 'mouseenter')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.isHovered = true;
        this.cancelHideTimer();

        // Only show if not in cooldown period after unpinning
        if (!this.isPinned && !this.recentlyUnpinned) {
          this.show(false); // Explicitly set pin=false
        }
      });

    // Hide popover on mouse leave (if not pinned)
    const mouseLeave = fromEvent(triggerElement, 'mouseleave')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.isHovered = false;

        if (!this.isPinned) {
          this.startHideTimer();
        }
      });

    // Pin/unpin popover on click
    const click = fromEvent(triggerElement, 'click')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.isPinned) {
          this.unpin();
        } else {
          if (this.overlayRef?.hasAttached()) {
            // Already showing, just pin it
            this.pin();
          } else {
            // Not showing yet, show and pin
            this.show(true);
          }
        }
      });

    this.subscriptions.push(mouseEnter, mouseLeave, click);
  }

  private setupPopoverEvents() {
    if (!this.overlayRef?.hasAttached()) return;

    const popoverElement = this.overlayRef.overlayElement;

    // Cancel hide timer when mouse enters popover
    const popoverMouseEnter = fromEvent(popoverElement, 'mouseenter').subscribe(
      () => {
        this.cancelHideTimer();
      }
    );

    // Start hide timer when mouse leaves popover (if not pinned)
    const popoverMouseLeave = fromEvent(popoverElement, 'mouseleave').subscribe(
      () => {
        if (!this.isPinned && !this.isHovered) {
          this.startHideTimer();
        }
      }
    );

    // Close on escape key
    if (this.closeOnEscape) {
      const escapeEvent = this.overlayRef
        .keydownEvents()
        .pipe(
          filter((event) => event.key === 'Escape'),
          takeUntil(this.destroy$)
        )
        .subscribe(() => {
          this.hide();
        });
      this.subscriptions.push(escapeEvent);
    }

    this.subscriptions.push(popoverMouseEnter, popoverMouseLeave);
  }

  private setupBackdropEvents() {
    if (!this.overlayRef || !this.hasBackdrop || !this.closeOnBackdropClick)
      return;

    const backdropClick = this.overlayRef.backdropClick().subscribe(() => {
      this.hide();
    });

    this.subscriptions.push(backdropClick);
  }

  private startHideTimer() {
    this.cancelHideTimer();
    this.hideTimer = window.setTimeout(() => {
      if (!this.isPinned && !this.isHovered) {
        this.hide();
      }
    }, this.hideDelay);
  }

  private cancelHideTimer() {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = undefined;
    }
  }

  private cancelUnpinCooldownTimer() {
    if (this.unpinCooldownTimer) {
      clearTimeout(this.unpinCooldownTimer);
      this.unpinCooldownTimer = undefined;
    }
  }

  private getTriggerElement(): HTMLElement {
    return this.triggerEl instanceof ElementRef
      ? this.triggerEl.nativeElement
      : this.triggerEl;
  }

  /**
   * Update arrow position to always point to the center of the trigger element
   */
  private updateArrowPosition() {
    if (!this.overlayRef?.hasAttached() || !this.showArrow) return;

    const arrowElement = this.overlayRef.overlayElement.querySelector(
      '.arrow'
    ) as HTMLElement;
    if (!arrowElement) return;

    // Get the bounding rects
    const overlayRect = this.overlayRef.overlayElement.getBoundingClientRect();
    const triggerRect = this.getTriggerElement().getBoundingClientRect();

    // Calculate the center points
    const triggerCenter = {
      x: triggerRect.left + triggerRect.width / 2,
      y: triggerRect.top + triggerRect.height / 2,
    };

    // Determine where arrow should be positioned by finding the closest edge
    this.positionArrowDirectly(arrowElement, overlayRect, triggerCenter);

    // Debugging - make sure arrow is visible
    arrowElement.style.visibility = 'visible';
    arrowElement.style.display = 'block';
  }

  /**
   * Position the arrow directly using style properties
   */
  private positionArrowDirectly(
    arrow: HTMLElement,
    overlayRect: DOMRect,
    triggerCenter: { x: number; y: number }
  ) {
    // Reset all positioning
    arrow.style.top = '';
    arrow.style.bottom = '';
    arrow.style.left = '';
    arrow.style.right = '';

    // Clean any previously set border styles - will use CSS classes instead
    arrow.style.borderTop = '';
    arrow.style.borderBottom = '';
    arrow.style.borderLeft = '';
    arrow.style.borderRight = '';
    arrow.style.boxShadow = '';

    // Set base arrow styling
    arrow.style.width = '12px';
    arrow.style.height = '12px';
    arrow.style.position = 'absolute';
    arrow.style.backgroundColor = 'white';
    arrow.style.transform = 'rotate(45deg)';

    // Find closest edge to trigger center
    const distances = {
      top: Math.abs(overlayRect.top - triggerCenter.y),
      bottom: Math.abs(overlayRect.bottom - triggerCenter.y),
      left: Math.abs(overlayRect.left - triggerCenter.x),
      right: Math.abs(overlayRect.right - triggerCenter.x),
    };

    // Get the edge with minimum distance
    const closestEdge = Object.entries(distances).reduce((a, b) =>
      a[1] < b[1] ? a : b
    )[0] as 'top' | 'bottom' | 'left' | 'right';

    // Set arrow position and apply data-position attribute for CSS styling
    arrow.setAttribute('data-position', closestEdge);

    switch (closestEdge) {
      case 'top':
        // Arrow at top edge
        arrow.style.top = '-6px';

        // Horizontal positioning
        const leftPos = Math.max(
          10,
          Math.min(
            triggerCenter.x - overlayRect.left - 6,
            overlayRect.width - 22
          )
        );
        arrow.style.left = `${leftPos}px`;
        break;

      case 'bottom':
        // Arrow at bottom edge
        arrow.style.bottom = '-6px';

        // Horizontal positioning
        const leftPosBottom = Math.max(
          10,
          Math.min(
            triggerCenter.x - overlayRect.left - 6,
            overlayRect.width - 22
          )
        );
        arrow.style.left = `${leftPosBottom}px`;
        break;

      case 'left':
        // Arrow at left edge
        arrow.style.left = '-6px';

        // Vertical positioning
        const topPos = Math.max(
          10,
          Math.min(
            triggerCenter.y - overlayRect.top - 6,
            overlayRect.height - 22
          )
        );
        arrow.style.top = `${topPos}px`;
        break;

      case 'right':
        // Arrow at right edge
        arrow.style.right = '-6px';

        // Vertical positioning
        const topPosRight = Math.max(
          10,
          Math.min(
            triggerCenter.y - overlayRect.top - 6,
            overlayRect.height - 22
          )
        );
        arrow.style.top = `${topPosRight}px`;
        break;
    }
  }

  /**
   * Shows the popover.
   * @param pin If true, the popover will be pinned
   */
  public show(pin = false): void {
    // If recently unpinned, complete the cooldown first
    if (this.recentlyUnpinned) {
      return;
    }

    if (this.overlayRef?.hasAttached()) {
      if (pin && !this.isPinned) {
        this.pin();
      }
      return;
    }

    // Always create a new overlay for consistent behavior
    this.disposeOverlay();
    this.createOverlay();

    if (!this.portal && this.popoverTemplate) {
      this.portal = new TemplatePortal(
        this.popoverTemplate,
        this.viewContainerRef
      );
    }

    if (this.portal && this.overlayRef) {
      this.overlayRef.attach(this.portal);

      // Set up events
      this.setupPopoverEvents();

      // Update position and arrow
      timer(10).subscribe(() => {
        if (this.overlayRef) {
          this.overlayRef.updatePosition();
          this.updateArrowPosition();
        }

        // Pin if requested (after positioning is done)
        if (pin) {
          this.pin();
        }
      });
    }
  }

  /**
   * Disposes the current overlay and creates a new one
   */
  private disposeOverlay() {
    if (this.overlayRef) {
      if (this.overlayRef.hasAttached()) {
        this.overlayRef.detach();
      }
      this.overlayRef.dispose();
      this.overlayRef = null;
      this.hasBackdropAttached = false;
    }
  }

  /**
   * Hides the popover.
   */
  public hide(): void {
    this.cancelHideTimer();

    // Track if we're unpinning a pinned popover
    const wasPinned = this.isPinned;
    this.isPinned = false;

    if (this.overlayRef) {
      // Completely dispose the overlay to ensure clean state
      this.disposeOverlay();

      // If we were pinned, set a cooldown period before showing again
      if (wasPinned) {
        this.recentlyUnpinned = true;
        this.cancelUnpinCooldownTimer();
        this.unpinCooldownTimer = window.setTimeout(() => {
          this.recentlyUnpinned = false;
        }, this.unpinCooldownDelay);
      }

      // Recreate overlay for future use
      this.createOverlay();
    }
  }

  /**
   * Pins the popover with a backdrop.
   */
  private pin(): void {
    if (this.isPinned) return;

    this.isPinned = true;
    this.cancelHideTimer();

    if (this.overlayRef && this.hasBackdrop) {
      // Remember current arrow position and styling
      const arrowDataPosition = this.getArrowDataPosition();

      // Need to recreate overlay with backdrop
      const currentContent = this.overlayRef.hasAttached() ? this.portal : null;

      if (currentContent) {
        this.overlayRef.detach();
      }

      this.overlayRef.dispose();

      // Create new overlay with backdrop
      const config = {
        positionStrategy: this.createPositionStrategy(),
        scrollStrategy: this.overlay.scrollStrategies.reposition(),
        minWidth: this.minWidth !== 'none' ? this.minWidth : undefined,
        maxWidth: this.maxWidth !== 'none' ? this.maxWidth : undefined,
        hasBackdrop: true,
        backdropClass: this.backdropClass,
        panelClass: this.getPopoverClasses(),
      };

      this.overlayRef = this.overlay.create(config);
      this.hasBackdropAttached = true;

      // Re-attach content
      if (currentContent) {
        this.overlayRef.attach(currentContent);
      }

      // Setup backdrop events
      this.setupBackdropEvents();
      this.setupPopoverEvents();

      // Update arrow position after a brief delay
      setTimeout(() => {
        this.updateArrowPosition();

        // If we had the previous position, restore it
        if (arrowDataPosition && this.overlayRef?.hasAttached()) {
          const newArrowElement = this.overlayRef.overlayElement.querySelector(
            '.arrow'
          ) as HTMLElement;
          if (newArrowElement) {
            newArrowElement.setAttribute('data-position', arrowDataPosition);
          }
        }
      }, 10);
    }
  }

  /**
   * Get the current data-position value of arrow if any
   */
  private getArrowDataPosition(): string | null {
    if (!this.overlayRef?.hasAttached() || !this.showArrow) return null;

    const arrowElement = this.overlayRef.overlayElement.querySelector(
      '.arrow'
    ) as HTMLElement;
    return arrowElement ? arrowElement.getAttribute('data-position') : null;
  }

  /**
   * Unpins the popover (removes backdrop).
   */
  private unpin(): void {
    // Just hide it - we'll recreate a clean overlay
    this.hide();
  }

  private createPositionStrategy() {
    const positions: ConnectedPosition[] = this.getPositions();

    return this.overlay
      .position()
      .flexibleConnectedTo(this.getTriggerElement())
      .withPositions(positions)
      .withPush(this.preventOverflow)
      .withFlexibleDimensions(false)
      .withViewportMargin(8);
  }

  private getPositions(): ConnectedPosition[] {
    const primary = this.getConnectedPosition(this.position);

    let fallbacks: ConnectedPosition[] = [];

    switch (this.position) {
      case 'top':
        fallbacks = [
          this.getConnectedPosition('bottom'),
          this.getConnectedPosition('right'),
          this.getConnectedPosition('left'),
        ];
        break;
      case 'bottom':
        fallbacks = [
          this.getConnectedPosition('top'),
          this.getConnectedPosition('right'),
          this.getConnectedPosition('left'),
        ];
        break;
      case 'left':
        fallbacks = [
          this.getConnectedPosition('right'),
          this.getConnectedPosition('top'),
          this.getConnectedPosition('bottom'),
        ];
        break;
      case 'right':
        fallbacks = [
          this.getConnectedPosition('left'),
          this.getConnectedPosition('top'),
          this.getConnectedPosition('bottom'),
        ];
        break;
      default:
        if (this.position.includes('top')) {
          fallbacks.push(this.getConnectedPosition('bottom'));
        } else if (this.position.includes('bottom')) {
          fallbacks.push(this.getConnectedPosition('top'));
        }

        if (this.position.includes('left')) {
          fallbacks.push(this.getConnectedPosition('right'));
        } else if (this.position.includes('right')) {
          fallbacks.push(this.getConnectedPosition('left'));
        }

        fallbacks.push(this.getConnectedPosition('bottom'));
        fallbacks.push(this.getConnectedPosition('top'));
    }

    return [primary, ...fallbacks];
  }

  private getConnectedPosition(pos: PopoverPosition): ConnectedPosition {
    switch (pos) {
      case 'top':
        return {
          originX: 'center',
          originY: 'top',
          overlayX: 'center',
          overlayY: 'bottom',
          offsetY: -this.offset,
        };
      case 'top-left':
        return {
          originX: 'start',
          originY: 'top',
          overlayX: 'start',
          overlayY: 'bottom',
          offsetY: -this.offset,
        };
      case 'top-right':
        return {
          originX: 'end',
          originY: 'top',
          overlayX: 'end',
          overlayY: 'bottom',
          offsetY: -this.offset,
        };
      case 'bottom':
        return {
          originX: 'center',
          originY: 'bottom',
          overlayX: 'center',
          overlayY: 'top',
          offsetY: this.offset,
        };
      case 'bottom-left':
        return {
          originX: 'start',
          originY: 'bottom',
          overlayX: 'start',
          overlayY: 'top',
          offsetY: this.offset,
        };
      case 'bottom-right':
        return {
          originX: 'end',
          originY: 'bottom',
          overlayX: 'end',
          overlayY: 'top',
          offsetY: this.offset,
        };
      case 'left':
        return {
          originX: 'start',
          originY: 'center',
          overlayX: 'end',
          overlayY: 'center',
          offsetX: -this.offset,
        };
      case 'left-top':
        return {
          originX: 'start',
          originY: 'top',
          overlayX: 'end',
          overlayY: 'top',
          offsetX: -this.offset,
        };
      case 'left-bottom':
        return {
          originX: 'start',
          originY: 'bottom',
          overlayX: 'end',
          overlayY: 'bottom',
          offsetX: -this.offset,
        };
      case 'right':
        return {
          originX: 'end',
          originY: 'center',
          overlayX: 'start',
          overlayY: 'center',
          offsetX: this.offset,
        };
      case 'right-top':
        return {
          originX: 'end',
          originY: 'top',
          overlayX: 'start',
          overlayY: 'top',
          offsetX: this.offset,
        };
      case 'right-bottom':
        return {
          originX: 'end',
          originY: 'bottom',
          overlayX: 'start',
          overlayY: 'bottom',
          offsetX: this.offset,
        };
      default:
        return {
          originX: 'center',
          originY: 'bottom',
          overlayX: 'center',
          overlayY: 'top',
          offsetY: this.offset,
        };
    }
  }

  ngOnDestroy(): void {
    this.cancelHideTimer();
    this.cancelUnpinCooldownTimer();

    this.destroy$.next();
    this.destroy$.complete();

    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions = [];

    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }

    this.portal = null;
  }
}
