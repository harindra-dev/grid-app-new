import { CommonModule } from '@angular/common';
import { PortalModule } from '@angular/cdk/portal';
import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  Input,
} from '@angular/core';

import { Subject } from 'rxjs';

import {
  OvUiPortalService,
  PortalInfo,
} from '../../../../../ov-ui-portal.service';

@Component({
  selector: 'lib-ov-portal-ui',
  standalone: true,
  imports: [CommonModule, PortalModule],
  templateUrl: './ov-portal-ui.component.html',
  styleUrl: './ov-portal-ui.component.scss',
})
export class OvPortalUiComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() isChatFlagEnabled = false;
  portalInfo!: PortalInfo | null;
  portalInfo$: any;
  positionBoxStyles: {
    left?: string;
    top?: string;
    height: string;
    width: string;
    bottom?: string;
    display?: string;
    alignItems?: string;
    justifyContent?: string;
  } | null = {
    left: '0px',
    top: '0px',
    height: '100%',
    width: '100%',
    bottom: 'unset',
  };
  shouldInvertPosition = false;
  shouldInvertPosition$ = new Subject<typeof this.shouldInvertPosition>();

  positionBoxStyles$ = new Subject<typeof this.positionBoxStyles>();
  canShowScrollToTopButton = false;
  constructor(private _OvUiPortalService: OvUiPortalService) {}

  setPositionBoxStyles() {
    if (this.portalInfo?.targetElementRefId) {
      const targetElement = document.querySelector(
        this.portalInfo?.targetElementRefId
      );

      if (targetElement) {
        const targetElementBounds = targetElement?.getBoundingClientRect();
        this.positionBoxStyles = {
          left: `${targetElementBounds.left}px`,
          top: `${targetElementBounds.top + targetElementBounds.height}px`,
          width: `${document.body.clientWidth - targetElementBounds.left}px`,
          height: `${
            document.body.clientHeight -
            (targetElementBounds.top + targetElementBounds.height)
          }px`,
        };

        this.shouldInvertPosition =
          window.innerHeight -
            (targetElementBounds.top + targetElementBounds.height) <
          160;
        this.shouldInvertPosition$.next(this.shouldInvertPosition);
        if (this.shouldInvertPosition) {
          this.positionBoxStyles.height = `${targetElementBounds.top}px`;
          this.positionBoxStyles.top = `0px`;
          this.positionBoxStyles.display = 'flex';
          this.positionBoxStyles.alignItems = 'end';
        }
        this.positionBoxStyles$.next(this.positionBoxStyles);
      }
    }
  }

  handlePortal(): void {
    this.portalInfo$ = this._OvUiPortalService.portalInfo$.subscribe(
      (info: typeof this.portalInfo) => {
        this.portalInfo = info;
        this.setPositionBoxStyles();
      }
    );
  }

  scrollToTop() {
    this.canShowScrollToTopButton = false;
    document.getElementsByTagName('as-split-area')[0]?.scroll({
      top: 0,
      left: 0,
      behavior: 'smooth',
    });
  }

  ngOnInit(): void {
    this.handlePortal();
  }

  ngAfterViewInit(): void {
    document.addEventListener(
      'click',
      (event: MouseEvent) => {
        this._OvUiPortalService.setPortalEvents({ click: event });
      },
      true
    );

    document.addEventListener(
      'scroll',
      (event: Event) => {
        this._OvUiPortalService.setPortalEvents({ scroll: event });
        this.setPositionBoxStyles();
        if (
          document.getElementsByTagName('as-split-area')[0]?.scrollTop !== 0
        ) {
          this.canShowScrollToTopButton = true;
        } else {
          this.canShowScrollToTopButton = false;
        }
      },
      true
    );
  }

  ngOnDestroy(): void {
    this.portalInfo$?.unsubscribe();
    this.canShowScrollToTopButton = false;
  }
}
